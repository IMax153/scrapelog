import * as Data from "@effect/data/Data"
import * as Equal from "@effect/data/Equal"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import type * as AST from "@effect/schema/AST"
import * as Schema from "@effect/schema/Schema"

// const { ast } = Schema.struct({
//   uri: TrackURI,
//   name: Schema.string,
//   album: SimplifiedAlbum,
//   artists: Schema.array(ArtistURI)
// })

// AST -> ASTPatch

export type Patch = Empty | AndThen | StructAdd | StructRemove | StructUpdate | ArrayAppend | ArraySlice | ArrayUpdate

export interface Empty extends Data.Case {
  readonly _tag: "Empty"
}

export const Empty = Data.tagged<Empty>("Empty")()

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
  readonly path: NonEmptyReadonlyArray<string>
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

const diff = <A>(
  oldValue: A,
  newValue: A
): Patch => {
  if (typeof oldValue !== typeof newValue) {
    throw new Error("Not handled yet")
  }

  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    let i = 0
    let patch: Patch = Empty
    while (i < oldValue.length && i < newValue.length) {
      const oldElement = oldValue[i]
      const newElement = newValue[i]
      const valuePatch = diff(oldElement, newElement)
      if (!Equal.equals(valuePatch, Empty)) {
        patch = AndThen({
          first: patch,
          second: ArrayUpdate({ index: i, patch: valuePatch })
        })
      }
      i = i + 1
    }
    if (i < oldValue.length) {
      patch = AndThen({
        first: patch,
        second: ArraySlice({ from: 0, until: i })
      })
    }
    if (i < newValue.length) {
      patch = AndThen({
        first: patch,
        second: ArrayAppend({ values: newValue.slice(i) })
      })
    }
    return patch
  }

  if (typeof oldValue === "object" && oldValue != null && typeof newValue === "object" && newValue != null) {
  }

  throw new Error("Not implemented")
}

describe("Dummy", () => {
  it("test", () => {
    // Empty
    // AndThen
    // Add
    // Remove
    // Update

    const patchFor = <A>(schema: Schema.Schema<A>): ASTPatch => {
      const go = (ast: AST.AST): ASTPatch => {
        switch (ast._tag) {
          case "Declaration":
          case "Literal":
          case "UniqueSymbol":
          case "UndefinedKeyword":
          case "VoidKeyword":
          case "NeverKeyword":
          case "UnknownKeyword":
          case "AnyKeyword":
          case "StringKeyword":
          case "NumberKeyword":
          case "BooleanKeyword":
          case "BigIntKeyword":
          case "SymbolKeyword":
          case "ObjectKeyword":
          case "Enums":
          case "TemplateLiteral":
          case "Tuple":
          case "TypeLiteral":
          case "Union":
          case "Lazy":
          case "Refinement":
          case "Transform":
        }
      }
      return go(schema.ast)
    }

    // { foo: string, bar: number }
    // ----- Patch = Remove("bar")
    // { foo: string }

    const oldValue = { foo: "foo", bar: 0 }
    const newValue = { foo: "foo" }

    let output: ASTPatch = { _tag: "Empty" }
    for (const [key, value] of Object.entries(oldValue)) {
      if (Object.prototype.hasOwnProperty.call(newValue, key)) {
        output = {
          _tag: "AndThen",
          first: output,
          second: { _tag: "Add", key, value }
        }
      } else {
        output = {
          _tag: "AndThen",
          first: output,
          second: { _tag: "Remove", key }
        }
      }
    }

    console.dir(output, { depth: null, colors: true })
  })
})
