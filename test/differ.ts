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
          .reduce((patchAcc, propertySignature) =>
            AndThen({
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
            }), Empty)
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
      case "Lazy":
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

test("test", () => {
  const schema = Schema.struct({
    // age: Schema.number,
    age: Schema.int()(Schema.number),
    name: Schema.string,
    aliases: Schema.array(Schema.string)
  })

  const diff = makeDiff(schema)

  const patch = diff({ age: 0, name: "foo", aliases: ["foo"] }, { age: 1, name: "bar", aliases: ["bar1", "bar2"] })

  console.dir(patch, { depth: null, colors: true })
})

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


  schema todo: support ordered arrays (for fractional indexing)
*/
