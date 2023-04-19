import type * as Brand from "@effect/data/Brand"
import * as Chunk from "@effect/data/Chunk"
import * as Differ from "@effect/data/Differ"
import * as Equal from "@effect/data/Equal"
import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as Schema from "@effect/schema/Schema"
import * as ChunkPatch from "@effect/scrapelog/ChunkPatch"
// import SchemaBuilder from "@pothos/core"
import { describe, it } from "vitest"

export interface Resource<
  Name extends string,
  Fields extends Record<string, Schema.Schema<any, any>> & { id: Schema.Schema<any, any> }
> extends Schema.Schema<Schema.To<Fields["id"]>, ByRefFromFields<Fields>> {
  readonly name: Name
  readonly fields: Record<string, Schema.Schema<any, any>>
  readonly fetchById: (id: Schema.To<Fields["id"]>) => Effect.Effect<never, never, ByRefFromFields<Fields>>
}

type ByRefFromFields<Fields extends Record<string, Schema.Schema<any, any>>> = {
  [K in keyof Fields]: Schema.From<Fields[K]>
}

const UserId = pipe(Schema.number, Schema.brand("UserId"))
type UserId = Schema.To<typeof UserId>

const TodoId = pipe(Schema.number, Schema.brand("TodoId"))
type TodoId = Schema.To<typeof TodoId>

const makeResource = <
  Name extends string,
  Fields extends Record<string, Schema.Schema<any, any>> & { id: Schema.Schema<any, any> }
>(
  name: Name,
  fields: Fields,
  fetchById: (id: Schema.To<Fields["id"]>) => Effect.Effect<never, never, ByRefFromFields<Fields>>
): Resource<Name, Fields> => {
  const schema = Schema.transformResult(
    Schema.to(fields["id"]),
    Schema.struct(fields),
    // @ts-expect-error
    (id) => fetchResourceById(id),
    // @ts-expect-error
    (byRef) => byRef["id"]
  )
  // @ts-expect-error
  return Object.assign(schema, {
    name,
    fields,
    fetchById
  })
}

type TypeOf<A> = A

const TodoResource_ = makeResource(
  "Todo",
  {
    id: TodoId
  },
  (todoId) => Effect.succeed({ id: todoId })
)

interface TodoResource extends TypeOf<typeof TodoResource_> {}
const TodoResource: TodoResource = TodoResource_

const UserResource_ = makeResource(
  "User",
  {
    id: UserId,
    todos: Schema.array(TodoResource),
    whatIsOn: Schema.option(Schema.string)
  },
  (userId) => Effect.succeed({ id: userId, todos: [TodoId(1)], whatIsOn: Option.some("WHAT IS ON") })
)

interface UserResource extends TypeOf<typeof UserResource_> {}
const UserResource: UserResource = UserResource_

export declare namespace Resolved {
  export type ArtistURI = `spotify:artist:${string}` & Brand.Brand<"ArtistId">

  export interface Artist {
    readonly uri: ArtistURI
    readonly name: string
  }

  export type TrackURI = `spotify:track:${string}` & Brand.Brand<"TrackId">

  export interface Track {
    readonly uri: TrackURI
    readonly name: string
    readonly album: Album
    readonly artists: ReadonlyArray<Artist>
  }

  export type AlbumURI = `spotify:album:${string}` & Brand.Brand<"AlbumId">

  export interface Album {
    readonly name: string
    readonly uri: AlbumURI
    readonly tracks: ReadonlyArray<Track>
    readonly trackCount: number
  }
}

export declare namespace Unresolved {
  export type ArtistURI = `spotify:artist:${string}` & Brand.Brand<"ArtistId">

  export interface Artist {
    readonly uri: ArtistURI
    readonly name: string
  }

  export type TrackURI = `spotify:track:${string}` & Brand.Brand<"TrackId">

  export interface Track {
    readonly name: string
    readonly uri: TrackURI
    readonly album: SimplifiedAlbum
    readonly artists: ReadonlyArray<ArtistURI>
  }

  export interface SimplifiedAlbum {
    readonly name: string
    readonly uri: AlbumURI
    readonly total_tracks: number
  }

  export type AlbumURI = `spotify:album:${string}` & Brand.Brand<"AlbumId">

  export interface Album {
    readonly name: string
    readonly uri: AlbumURI
    readonly tracks: ReadonlyArray<TrackURI>
    readonly total_tracks: number
  }
}

export interface Entity<A extends { Unresolved: any; ExtraFields: any }> {
  readonly _A: (_: A) => A
  as<Unresolved>(): Entity<{
    Unresolved: Unresolved
    ExtraFields: A["ExtraFields"]
  }>
}

type GetUnresolved<A extends Entity<any>> = ReturnType<A["_A"]>["Unresolved"]

export declare const makeEntity: <
  UnresolvedRaw,
  Unresolved,
  Dependencies extends ReadonlyArray<Entity<any>>,
  ExtraFields extends {
    readonly [K: string]: (_: Unresolved) => Effect.Effect<any, any, any>
  }
>(params: {
  schema: Schema.Schema<UnresolvedRaw, Unresolved>
  dependencies: Dependencies
  resolvers: ExtraFields
}) => Entity<{ Unresolved: Unresolved; ExtraFields: ExtraFields }>

export const ArtistURI = pipe(
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

export interface Artist extends GetUnresolved<typeof Artist_> {}
export const Artist = Artist_.as<Artist>()

export const AlbumURI = pipe(
  Schema.string,
  Schema.filter((s) => s.startsWith("spotify:album:")),
  Schema.brand("AlbumURI")
)

export const SimplifiedAlbum = Schema.struct({
  uri: AlbumURI,
  name: Schema.string,
  total_tracks: Schema.number
})

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
    artists: (_) => Effect.succeed<ReadonlyArray<Resolved.Artist>>([])
  }
})

export interface Track extends GetUnresolved<typeof Track_> {}
export const Track = Track_.as<Track>()

// const builder = new SchemaBuilder<{
//   Objects: {
//     Track: Unresolved.Track
//   }
// }>({})

// builder.objectType("Track", {
//   fields: (t) => ({
//     uri: t.string({ resolve: (arg) => arg.uri }),
//     whatIsOn: t.int({ resolve: () => Math.random() })
//   })
// })

// builder.queryType({
//   fields: (t) => ({
//     trackById: t.field({
//       type: "Track",
//       args: { trackUri: t.arg.string({ required: true }) },
//       resolve: () => ({ })
//     })
//   })
// })

// const TodoId = pipe(Schema.number, Schema.brand("TodoId"))
// type TodoId = Schema.To<typeof TodoId>

// User Requirements:
//   1. Embedded DSL
//      - Define a strict schema for our resource types
//      - Derive a Show instance (or whatever it's called now)
//      - Derive a Differ instance

// Let's assume a changelog is just a simple chunk of entries, in this case
// a chunk of strings

const changelog1 = Chunk.make({ foo: "foo1", bar: 0 }, { foo: "foo2", bar: 1 })
const changelog2 = Chunk.make({ foo: "foo0", bar: 0 }, { foo: "foo2", bar: 2 })

export const renderPatch = <Value, Patch>(
  oldValue: Chunk.Chunk<Value>,
  newValue: Chunk.Chunk<Value>,
  differ: Differ.Differ<Value, Patch>
): string => {
  let i = 0
  let patch = ChunkPatch.empty<Value, Patch>()
  let rendering = `Empty - newValue: ${JSON.stringify(Array.from(Differ.patch(Differ.chunk(differ), patch, oldValue)))}`
  while (i < oldValue.length && i < newValue.length) {
    const oldElement = Chunk.unsafeGet(i)(oldValue)
    const newElement = Chunk.unsafeGet(i)(newValue)
    const valuePatch = Differ.diff(differ, oldElement, newElement)
    if (!Equal.equals(valuePatch, Differ.empty(differ))) {
      patch = ChunkPatch.combine(patch, new ChunkPatch.Update(i, valuePatch))
      const result = Differ.patch(Differ.chunk(differ), patch, oldValue)
      rendering = rendering +
        `\nUpdate(index: ${i}, from: ${JSON.stringify(oldElement)}, to: ${JSON.stringify(newElement)}) - newValue: ${
          JSON.stringify(Array.from(result))
        }`
    }
    i = i + 1
  }
  if (i < oldValue.length) {
    patch = ChunkPatch.combine(patch, new ChunkPatch.Slice(0, i))
    const result = Differ.patch(Differ.chunk(differ), patch, oldValue)
    rendering = rendering + `\nSlice(from: 0, until: ${i}) - newValue: ${JSON.stringify(Array.from(result))}`
  }
  if (i < newValue.length) {
    patch = ChunkPatch.combine(patch, new ChunkPatch.Append(Chunk.drop(newValue, i)))
    const result = Differ.patch(Differ.chunk(differ), patch, oldValue)
    rendering = rendering + `\nAppend(${Chunk.drop(newValue, i)}) - newValue: ${JSON.stringify(Array.from(result))}`
  }
  return rendering
}

interface FooBar {
  readonly foo: string
  readonly bar: number
}

describe("render", () => {
  it("rendering", () => {
    console.log(
      renderPatch(changelog1, changelog2, Differ.updateWith<FooBar>((x, y) => ({ ...x, ...y })))
    )
  })

  // it("test", () => {
  //   const differ = Differ.updateWith<FooBar>((x, y) => ({ ...x, ...y }))
  //   const fooBar0: FooBar = { foo: "foo0", bar: 0 }
  //   const fooBar1: FooBar = { foo: "foo1", bar: 0 }
  //   const patch = Differ.diff(differ, fooBar0, fooBar1)
  //   const result = Differ.patch(differ, patch, fooBar0)
  //   console.dir(result, { depth: null, colors: true })
  // })
})

// const FooBar = Schema.struct({
//   foo: Schema.string,
//   bar: Schema.number
// }).ast
