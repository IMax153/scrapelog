import type * as AST from "@effect/schema/AST"
import * as Schema from "@effect/schema/Schema"
import type { Patch } from "../src/diff.js"
import { AndThen, ArrayUpdate, Empty, Replace, StructUpdate } from "../src/diff.js"

type TODO = any

type Diff<TVal> = (oldVal: TVal, newVal: TVal) => TODO

// const makePatcher = <TVal>(ast: AST.AST): Patcher<TVal> => {
const makeDiff = <TSchema extends Schema.Schema<any, any>>(schema: TSchema): Diff<Schema.From<TSchema>> => {
  const ast = schema.ast

  const go = (ast: AST.AST, oldVal: any, newVal: any): Patch => {
    // const patch = Empty

    switch (ast._tag) {
      case "TypeLiteral": {
        return ast.propertySignatures
          // .filter((propertySignature) => {
          //   // TODO do proper equality check (e.g. for non-scalars)
          //   if (oldVal[propertySignature.name] === newVal[propertySignature.name]) {
          //     return false
          //   }

          //   return true
          // })
          .reduce((patchAcc, propertySignature) => {
            if (propertySignature.isOptional && oldVal?.[propertySignature.name] === undefined) {
              return patchAcc
            }

            return AndThen({
              first: patchAcc,
              second: StructUpdate({
                // TODO handle recursive paths
                path: [propertySignature.name],
                patch: go(
                  propertySignature.type,
                  oldVal[propertySignature.name],
                  newVal[propertySignature.name]
                )
              })
            })
          }, Empty)
      }
      case "NumberKeyword":
      case "BooleanKeyword":
      case "BigIntKeyword":
      case "Literal":
      case "StringKeyword": {
        if (oldVal === newVal) {
          return Empty
        }

        return Replace({ value: newVal })
      }
      case "Refinement":
        return go(ast.from, oldVal, newVal)
      case "Transform":
        return go(ast.from, oldVal, newVal)
      case "Tuple":
        if (ast.rest._tag === "Some" && ast.rest.value.length === 1) {
          const elementAst = ast.rest.value[0]
          const maxLength = Math.max(oldVal.length, newVal.length)
          return Array.from({ length: maxLength }).reduce((patchAcc: Patch, _, index) => {
            const oldElement = oldVal[index]
            const newElement = newVal[index]
            if (oldElement === newElement) {
              return patchAcc
            }

            return AndThen({
              first: patchAcc,
              second: ArrayUpdate({
                index,
                patch: go(elementAst, oldElement, newElement)
              })
            })
          }, Empty)
        } else {
          console.dir(ast, { depth: null, colors: true })
          throw new Error(`This tuple case is not handled yet`)
        }
      case "Lazy": {
        return go(ast.f(), oldVal, newVal)
      }
      case "Declaration":
      case "UniqueSymbol":
      case "UndefinedKeyword":
      case "VoidKeyword":
      case "NeverKeyword":
      case "UnknownKeyword":
      case "AnyKeyword":
      case "SymbolKeyword":
      case "ObjectKeyword":
      case "Enums":
      case "TemplateLiteral":
      case "Union":
        console.dir(ast, { depth: null, colors: true })
        throw new Error("Not yet implemented")
      default: {
        throw new Error("Should never happen")
      }
    }

    // return patch
  }

  /** NOTE `diff` assumes the values have already been validated according to the `schema` */
  const diff: Diff<Schema.From<TSchema>> = (oldVal, newVal) => go(ast, oldVal, newVal)

  return diff
}

const User_ = Schema.struct({
  // age: Schema.number,
  age: Schema.int()(Schema.number),
  dateOfBirth: Schema.optional(Schema.DateFromString),
  name: Schema.string,
  aliases: Schema.array(Schema.string)
  // subUser: Schema.optional(Schema.lazy(() => User))
})

type UserFrom = Schema.From<typeof User_> & { subUser?: UserFrom }
type UserTo = Schema.To<typeof User_> & { subUser?: UserTo }
const User: Schema.Schema<UserFrom, UserTo> = Schema.extend(User_)(Schema.struct({
  subUser: Schema.optional(Schema.lazy(() => User))
}))

const diff = makeDiff(User)

test("test", () => {
  const patch = diff({ age: 0, name: "foo", aliases: ["foo"] }, { age: 1, name: "bar", aliases: ["bar1", "bar2"] })

  console.dir(patch, { depth: null, colors: true })
})

test("test 2", () => {
  const patch = diff({
    age: 0,
    name: "foo",
    aliases: [],
    subUser: {
      age: 20,
      name: "sub",
      aliases: []
    }
  }, {
    age: 0,
    name: "bar",
    aliases: [],
    subUser: {
      age: 10,
      name: "sub",
      aliases: []
    }
  })

  console.dir(patch, { depth: null, colors: true })
})

// interface FractionalIndex<Output> extends ReadonlyArray<readonly [number, Output]> {}

// Schema.data

// const FractionalIndexedArray = <Input, Output>(
//   elementSchema: Schema.Schema<Input, Output>
// ): Schema.Schema<ReadonlyArray<Input>, FractionalIndex<Output>> =>
//   Schema.transform(
//     Schema.array(elementSchema),
//     Schema.to(Schema.array(Schema.tuple(Schema.number, elementSchema))),
//     // TODO calc fractional index
//     (_) => _.map((v, i) => [i / i, v] as const),
//     (_) => _.map(([, v]) => v)
//   )

// const { ast } = Schema.struct({
//   uri: TrackURI,
//   name: Schema.string,
//   album: SimplifiedAlbum,
//   artists: Schema.array(ArtistURI)
// })

/*
- optimize step
  - remove unnecessary steps
    - remove empty patches
  - flatten steps
  - optimize for sql...

- custom schema for fractional indexed arrays (as list of tuple: [f-index, value])

- goals: patches should be JSON serializable and as compact as possible

- JSON patch
- talk to Tim re DB write batching

- schema todo: support ordered arrays (for fractional indexing)
*/
