import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { queryInBlockChunks } from "../scripts/lib/events.js";

describe("queryInBlockChunks", function () {
  it("queries inclusive non-overlapping chunks and preserves result order", async function () {
    const ranges: Array<[number, number]> = [];
    const results = await queryInBlockChunks(
      11,
      35,
      async (fromBlock, toBlock) => {
        ranges.push([fromBlock, toBlock]);
        return [`${fromBlock}-${toBlock}`];
      },
      10,
    );

    assert.deepEqual(ranges, [
      [11, 20],
      [21, 30],
      [31, 35],
    ]);
    assert.deepEqual(results, ["11-20", "21-30", "31-35"]);
  });

  it("returns no results when the requested range is empty", async function () {
    let called = false;
    const results = await queryInBlockChunks(20, 19, async () => {
      called = true;
      return ["unexpected"];
    });

    assert.deepEqual(results, []);
    assert.equal(called, false);
  });

  it("rejects invalid block bounds and chunk sizes", async function () {
    await assert.rejects(
      queryInBlockChunks(0.5, 1, async () => []),
      /safe integers/,
    );
    await assert.rejects(
      queryInBlockChunks(0, 1, async () => [], 0),
      /positive safe integer/,
    );
  });
});
