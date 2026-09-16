import { network } from "hardhat";

const connection = await network.create();
const { ethers } = connection;
const networkInfo = await ethers.provider.getNetwork();
const signers = await ethers.getSigners();

if (signers.length < 2) {
  throw new Error("Two configured accounts are required: NGO first, reviewer second");
}

const [ngo, reviewer] = signers;
if (ngo.address.toLowerCase() === reviewer.address.toLowerCase()) {
  throw new Error("NGO and reviewer accounts must be different");
}

const ngoBalance = await ethers.provider.getBalance(ngo.address);
const reviewerBalance = await ethers.provider.getBalance(reviewer.address);

console.log(`Network: ${connection.networkName} (${networkInfo.chainId})`);
console.log(`NGO: ${ngo.address} · ${ethers.formatEther(ngoBalance)} ETH`);
console.log(
  `Reviewer: ${reviewer.address} · ${ethers.formatEther(reviewerBalance)} ETH`,
);

if (ngoBalance === 0n || reviewerBalance === 0n) {
  throw new Error("Both accounts need testnet ETH before deployment and review writes");
}
