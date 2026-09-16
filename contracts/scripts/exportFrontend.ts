import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadDeployment } from "./lib/deployment.js";

const sourceNetwork = process.env.TRACE_EXPORT_NETWORK ?? "sepolia";
const deployment = await loadDeployment(sourceNetwork);
if (sourceNetwork === "sepolia" && deployment.chainId !== 11_155_111) {
  throw new Error("Refusing to export non-Sepolia metadata as the live deployment");
}

const artifactPath = resolve(
  "artifacts/contracts/ProofRegistry.sol/ProofRegistry.json",
);
const artifact = JSON.parse(await readFile(artifactPath, "utf8")) as {
  abi: unknown[];
};
const outputDirectory = resolve(
  process.env.TRACE_FRONTEND_GENERATED_DIR ?? "../frontend/src/generated",
);
await mkdir(outputDirectory, { recursive: true });

const abiPath = resolve(outputDirectory, "ProofRegistry.abi.json");
const deploymentPath = resolve(outputDirectory, "deployment.json");
await writeFile(abiPath, `${JSON.stringify(artifact.abi, null, 2)}\n`, "utf8");
await writeFile(
  deploymentPath,
  `${JSON.stringify(
    {
      ...deployment,
      source: sourceNetwork === "sepolia" ? "live-chain" : "development-network",
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Exported ABI: ${abiPath}`);
console.log(`Exported deployment: ${deploymentPath}`);
