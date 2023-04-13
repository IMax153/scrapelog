import * as Chunk from "@effect/data/Chunk"
import * as Differ from "@effect/data/Differ"
import * as Equal from "@effect/data/Equal"
import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as Schema from "@effect/schema/Schema"
import * as ChunkPatch from "@effect/scrapelog/ChunkPatch"
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
