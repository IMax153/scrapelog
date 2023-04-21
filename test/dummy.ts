import type { Branded } from "@effect/data/Brand"
import { Tag } from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Schema from "@effect/schema/Schema"

export interface Scrapelog {
  readonly currentState: <A extends AnyEntity>(entity: A) => Array<GetUnresolved<A>>
}
export const Scrapelog = Tag<Scrapelog>()
export const currentState = Effect.serviceFunction(Scrapelog, (_) => _.currentState)

export type AnyEntity = Entity<any, any>

export interface Extra {
  readonly [K: string]: Effect.Effect<any, any, any>
}

export interface Entity<
  Unresolved,
  ExtraFields extends Extra
> {
  readonly _Unresolved: (_: Unresolved) => Unresolved
  readonly _ExtraFields: (_: ExtraFields) => ExtraFields
}

export type GetUnresolved<A extends Entity<any, any>> = ReturnType<A["_Unresolved"]>
export type Opaque<A extends Entity<any, any>> = A
export type GetExtraFields<A extends Entity<any, any>> = ReturnType<A["_ExtraFields"]>

export type GetResolved<A extends Entity<any, any>> =
  & GetUnresolved<A>
  & { [k in keyof GetExtraFields<A>]: Effect.Effect.Success<ReturnType<GetExtraFields<A>[k]>> }

export declare const makeEntity: <
  UnresolvedRaw,
  Unresolved,
  Dependencies extends ReadonlyArray<Entity<any, any>>,
  ExtraFields extends {
    readonly [K: string]: (_: Unresolved) => Effect.Effect<any, any, any>
  }
>(params: {
  schema: Schema.Schema<UnresolvedRaw, Unresolved>
  dependencies: Dependencies
  resolvers: ExtraFields
}) => Entity<
  Unresolved,
  {
    [k in keyof ExtraFields]: ReturnType<ExtraFields[k]>
  }
>

export type ArtistURI = Branded<string, "ArtistURI">
export const ArtistURI: Schema.BrandSchema<string, ArtistURI> = pipe(
  Schema.string,
  Schema.filter((s) => s.startsWith("spotify:artist:")),
  Schema.brand("ArtistURI")
)

const Artist_ = makeEntity({
  schema: Schema.struct({
    uri: ArtistURI,
    name: Schema.string
  }),
  dependencies: [],
  resolvers: {}
})

export interface Artist extends Opaque<typeof Artist_> {}
export const Artist: Artist = Artist_

export const AlbumURI = pipe(
  Schema.string,
  Schema.filter((s) => s.startsWith("spotify:album:")),
  Schema.brand("AlbumURI")
)

const SimplifiedAlbum_ = Schema.struct({
  uri: AlbumURI,
  name: Schema.string,
  total_tracks: Schema.number
})
export interface SimplifiedAlbumRaw extends Schema.From<typeof SimplifiedAlbum_> {}
export interface SimplifiedAlbum extends Schema.To<typeof SimplifiedAlbum_> {}
export const SimplifiedAlbum: Schema.Schema<SimplifiedAlbumRaw, SimplifiedAlbum> = SimplifiedAlbum_

export const TrackURI = pipe(
  Schema.string,
  Schema.filter((s) => s.startsWith("spotify:track:")),
  Schema.brand("TrackURI")
)

const Track_ = makeEntity({
  schema: Schema.struct({
    uri: TrackURI,
    name: Schema.string,
    album: SimplifiedAlbum,
    artists: Schema.array(ArtistURI)
  }),
  dependencies: [Artist],
  resolvers: {
    artists: (_) =>
      Effect.map(
        currentState(Artist),
        (artists) => _.artists.flatMap((uri) => artists.filter((artist) => artist.uri === uri))
      )
  }
})

export interface Track extends Opaque<typeof Track_> {}
export const Track: Track = Track_

const LikedTrack_ = makeEntity({
  schema: Schema.struct({
    uri: TrackURI,
    name: Schema.string,
    album: SimplifiedAlbum,
    artists: Schema.array(ArtistURI)
  }),
  dependencies: [Artist],
  resolvers: {
    artists: (_) =>
      Effect.map(
        currentState(Artist),
        (artists) => _.artists.flatMap((uri) => artists.filter((artist) => artist.uri === uri))
      )
  }
})

export interface LikedTrack extends Opaque<typeof LikedTrack_> {}
export const LikedTrack: LikedTrack = LikedTrack_

// add lookup by id of current state and make a variant to have an array body
// implementation of the scrapelog should be empty at the start and be dynamically filled when
// queries are invoked according to the specific ttl
