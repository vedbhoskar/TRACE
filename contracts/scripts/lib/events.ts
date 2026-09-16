const DEFAULT_BLOCK_CHUNK_SIZE = 10;

export async function queryInBlockChunks<T>(
  fromBlock: number,
  toBlock: number,
  query: (chunkFromBlock: number, chunkToBlock: number) => Promise<T[]>,
  chunkSize = DEFAULT_BLOCK_CHUNK_SIZE,
): Promise<T[]> {
  if (!Number.isSafeInteger(fromBlock) || !Number.isSafeInteger(toBlock)) {
    throw new Error("Event query block bounds must be safe integers");
  }
  if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new Error("Event query chunk size must be a positive safe integer");
  }
  if (toBlock < fromBlock) {
    return [];
  }

  const results: T[] = [];
  for (
    let chunkFromBlock = fromBlock;
    chunkFromBlock <= toBlock;
    chunkFromBlock += chunkSize
  ) {
    const chunkToBlock = Math.min(
      chunkFromBlock + chunkSize - 1,
      toBlock,
    );
    results.push(...(await query(chunkFromBlock, chunkToBlock)));
  }
  return results;
}
