import { access } from "node:fs/promises";
import { network } from "hardhat";
import { loadCanonicalDemo } from "./lib/demo.js";
import {
  deploymentFile,
  explorerBaseUrl,
  explorerUrl,
  saveDeployment,
  type DeploymentRecord,
} from "./lib/deployment.js";

const connection = await network.create();
const { ethers } = connection;
const networkInfo = await ethers.provider.getNetwork();
const [ngo, reviewer] = await ethers.getSigners();

if (ngo === undefined || reviewer === undefined) {
  throw new Error("Two configured accounts are required: NGO first, reviewer second");
}
if (ngo.address.toLowerCase() === reviewer.address.toLowerCase()) {
  throw new Error("NGO and reviewer accounts must be different");
}

const outputPath = deploymentFile(connection.networkName);
try {
  await access(outputPath);
  throw new Error(
    `Deployment metadata already exists at ${outputPath}; refusing an accidental redeploy`,
  );
} catch (error) {
  if (error instanceof Error && !error.message.includes("ENOENT")) {
    throw error;
  }
}

const ngoBalance = await ethers.provider.getBalance(ngo.address);
const reviewerBalance = await ethers.provider.getBalance(reviewer.address);
if (ngoBalance === 0n || reviewerBalance === 0n) {
  throw new Error("Both configured accounts must have a nonzero balance");
}

const demo = await loadCanonicalDemo();
const registry = await ethers.deployContract(
  "ProofRegistry",
  [demo.campaignId, ngo.address, reviewer.address],
  ngo,
);
const deploymentTransaction = registry.deploymentTransaction();
if (deploymentTransaction === null) {
  throw new Error("Deployment transaction was not created");
}

console.log(`Deployment pending: ${deploymentTransaction.hash}`);
const receipt = await deploymentTransaction.wait();
if (receipt === null || receipt.status !== 1) {
  throw new Error("ProofRegistry deployment was not confirmed successfully");
}

const contractAddress = await registry.getAddress();
const block = await ethers.provider.getBlock(receipt.blockNumber);
const explorer = explorerBaseUrl(networkInfo.chainId);
const record: DeploymentRecord = {
  schemaVersion: 1,
  network: connection.networkName,
  chainId: Number(networkInfo.chainId),
  contractAddress,
  deploymentBlock: receipt.blockNumber,
  deploymentTransactionHash: receipt.hash,
  campaignId: demo.campaignId,
  ngoAddress: ngo.address,
  reviewerAddress: reviewer.address,
  explorerBaseUrl: explorer,
  deployedAt: new Date(Number(block?.timestamp ?? 0) * 1000).toISOString(),
  seeded: false,
  transactions: [],
};

await saveDeployment(connection.networkName, record);
console.log(`ProofRegistry: ${contractAddress}`);
console.log(`Deployment metadata: ${outputPath}`);
console.log(explorerUrl(explorer, "address", contractAddress) ?? "Local network");
