import * as Data from "@effect/data/Data"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"

export type Patch =
  | Empty
  | AndThen
  | StructAdd
  | StructRemove
  | StructUpdate
  | ArrayAppend
  | ArraySlice
  | ArrayUpdate
  | Replace

export interface Empty extends Data.Case {
  readonly _tag: "Empty"
}

export const Empty = Data.tagged<Empty>("Empty")() as Patch

export interface AndThen extends Data.Case {
  readonly _tag: "AndThen"
  readonly first: Patch
  readonly second: Patch
}

export const AndThen = Data.tagged<AndThen>("AndThen")

export interface StructAdd extends Data.Case {
  readonly _tag: "StructAdd"
  readonly path: NonEmptyReadonlyArray<string>
  readonly patch: Patch
}

export const StructAdd = Data.tagged<StructAdd>("StructAdd")

export interface StructRemove extends Data.Case {
  readonly _tag: "StructRemove"
  readonly path: NonEmptyReadonlyArray<string>
}

export const StructRemove = Data.tagged<StructRemove>("StructRemove")

export interface StructUpdate extends Data.Case {
  readonly _tag: "StructUpdate"
  // TODO maybe this should be `key` instead
  // sequential vs recursive interpretation of the path
  readonly path: NonEmptyReadonlyArray<PropertyKey>
  readonly patch: Patch
}

export const StructUpdate = Data.tagged<StructUpdate>("StructUpdate")

export interface ArrayAppend extends Data.Case {
  readonly _tag: "ArrayAppend"
  readonly values: ReadonlyArray<unknown>
}

export const ArrayAppend = Data.tagged<ArrayAppend>("ArrayAppend")

export interface ArraySlice extends Data.Case {
  readonly _tag: "ArraySlice"
  readonly from: number
  readonly until: number
}

export const ArraySlice = Data.tagged<ArraySlice>("ArraySlice")

export interface ArrayUpdate extends Data.Case {
  readonly _tag: "ArrayUpdate"
  readonly index: number
  readonly patch: Patch
}

export const ArrayUpdate = Data.tagged<ArrayUpdate>("ArrayUpdate")

export interface Replace extends Data.Case {
  readonly _tag: "Replace"
  readonly value: string | number | boolean | null | undefined
}

export const Replace = Data.tagged<Replace>("Replace")
