import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import hre, { network } from "hardhat";

const conn = await network.create();
const { ethers } = conn;

const [deployer] = await ethers.getSigners();

const registry = await ethers.deployContract("CredentialRegistry", [deployer.address]);
await registry.waitForDeployment();
const address = await registry.getAddress();

const { chainId } = await ethers.provider.getNetwork();
const artifact = await hre.artifacts.readArtifact("CredentialRegistry");

const networkLabel =
  conn.networkName === "amoy"
    ? "Polygon Amoy Testnet"
    : conn.networkName === "localhost" || conn.networkName === "default"
      ? "Hardhat Local"
      : conn.networkName;

const output = {
  contractName: "CredentialRegistry",
  address,
  abi: artifact.abi,
  network: networkLabel,
  chainId: Number(chainId),
  deployer: deployer.address,
  deployedAt: new Date().toISOString(),
};

const repoRoot = path.resolve(import.meta.dirname, "..");
const targets = [
  "backend/src/blockchain/generated/CredentialRegistry.json",
  "frontend/src/contracts/CredentialRegistry.json",
];

for (const target of targets) {
  const filePath = path.join(repoRoot, target);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(output, null, 2) + "\n");
  console.log(`Wrote ${target}`);
}

console.log("CredentialRegistry deployed to:", address);
console.log("Deployer:", deployer.address);
console.log("Network:", networkLabel, `(chainId ${chainId})`);
if (conn.networkName === "amoy") {
  console.log(`Explorer: https://amoy.polygonscan.com/address/${address}`);
}
