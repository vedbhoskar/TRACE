import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface RecordedTransaction {
  action: string;
  recordId: string;
  hash: string;
  blockNumber: number;
  explorerUrl: string | null;
}

export interface DeploymentRecord {
  schemaVersion: 1;
  network: string;
  chainId: number;
  contractAddress: string;
  deploymentBlock: number;
  deploymentTransactionHash: string;
  campaignId: string;
  ngoAddress: string;
  reviewerAddress: string;
  explorerBaseUrl: string | null;
  deployedAt: string;
  seeded: boolean;
  transactions: RecordedTransaction[];
}

export function deploymentFile(networkName: string): string {
  return process.env.TRACE_DEPLOYMENT_FILE
    ? resolve(process.env.TRACE_DEPLOYMENT_FILE)
    : resolve("deployments", `${networkName}.json`);
}

export function explorerBaseUrl(chainId: bigint): string | null {
  return chainId === 11_155_111n ? "https://sepolia.etherscan.io" : null;
}

export function explorerUrl(
  baseUrl: string | null,
  kind: "address" | "tx",
  value: string,
): string | null {
  return baseUrl === null ? null : `${baseUrl}/${kind}/${value}`;
}

export async function loadDeployment(
  networkName: string,
): Promise<DeploymentRecord> {
  const path = deploymentFile(networkName);
  return JSON.parse(await readFile(path, "utf8")) as DeploymentRecord;
}

export async function saveDeployment(
  networkName: string,
  deployment: DeploymentRecord,
): Promise<void> {
  const path = deploymentFile(networkName);
  const temporaryPath = `${path}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(deployment, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}

export function assertDeploymentNetwork(
  deployment: DeploymentRecord,
  networkName: string,
  chainId: bigint,
): void {
  if (deployment.network !== networkName) {
    throw new Error(
      `Deployment is for ${deployment.network}, but the active network is ${networkName}`,
    );
  }
  if (BigInt(deployment.chainId) !== chainId) {
    throw new Error(
      `Deployment chain ${deployment.chainId} does not match active chain ${chainId}`,
    );
  }
}
