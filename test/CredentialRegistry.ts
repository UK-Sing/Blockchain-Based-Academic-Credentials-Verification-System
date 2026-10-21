import { expect } from "chai";
import { network } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";

const { ethers, networkHelpers } = await network.create();

async function deployRegistryFixture() {
  const [owner, stranger] = await ethers.getSigners();
  const registry = await ethers.deployContract("CredentialRegistry", [owner.address]);
  return { registry, owner, stranger };
}

describe("CredentialRegistry", function () {
  const id = "CRED-2026-000001";
  const hash = ethers.keccak256(ethers.toUtf8Bytes("alice-bsc-2026"));

  it("sets the deployer as owner", async function () {
    const { registry, owner } = await networkHelpers.loadFixture(deployRegistryFixture);
    expect(await registry.owner()).to.equal(owner.address);
  });

  it("issues a credential, emits CredentialIssued, and verifies it", async function () {
    const { registry, owner } = await networkHelpers.loadFixture(deployRegistryFixture);

    await expect(registry.issueCredential(id, hash))
      .to.emit(registry, "CredentialIssued")
      .withArgs(id, hash, owner.address, anyValue);

    const result = await registry.verifyCredential(id);
    expect(result.exists).to.equal(true);
    expect(result.credentialHash).to.equal(hash);
    expect(result.isRevoked).to.equal(false);
  });

  it("returns exists=false for an unknown credential id", async function () {
    const { registry } = await networkHelpers.loadFixture(deployRegistryFixture);
    const result = await registry.verifyCredential("UNKNOWN");
    expect(result.exists).to.equal(false);
    expect(result.credentialHash).to.equal(ethers.ZeroHash);
  });

  it("revokes a credential and emits CredentialRevoked", async function () {
    const { registry } = await networkHelpers.loadFixture(deployRegistryFixture);

    await registry.issueCredential(id, hash);

    await expect(registry.revokeCredential(id, "Fraud"))
      .to.emit(registry, "CredentialRevoked")
      .withArgs(id, "Fraud", anyValue);

    const result = await registry.verifyCredential(id);
    expect(result.isRevoked).to.equal(true);
    expect(result.revocationReason).to.equal("Fraud");
  });

  it("reverts when a non-owner tries to issue", async function () {
    const { registry, stranger } = await networkHelpers.loadFixture(deployRegistryFixture);

    await expect(registry.connect(stranger).issueCredential(id, hash))
      .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount")
      .withArgs(stranger.address);
  });

  it("reverts on duplicate issue", async function () {
    const { registry } = await networkHelpers.loadFixture(deployRegistryFixture);

    await registry.issueCredential(id, hash);

    await expect(registry.issueCredential(id, hash))
      .to.be.revertedWithCustomError(registry, "AlreadyIssued")
      .withArgs(id);
  });

  it("reverts when revoking an unknown credential", async function () {
    const { registry } = await networkHelpers.loadFixture(deployRegistryFixture);

    await expect(registry.revokeCredential("UNKNOWN", "Fraud"))
      .to.be.revertedWithCustomError(registry, "CredentialNotFound")
      .withArgs("UNKNOWN");
  });

  it("reverts on double revoke", async function () {
    const { registry } = await networkHelpers.loadFixture(deployRegistryFixture);

    await registry.issueCredential(id, hash);
    await registry.revokeCredential(id, "Fraud");

    await expect(registry.revokeCredential(id, "Again"))
      .to.be.revertedWithCustomError(registry, "AlreadyRevoked")
      .withArgs(id);
  });

  it("issues and revokes a credential hashed exactly like the backend", async function () {
    const { registry } = await networkHelpers.loadFixture(deployRegistryFixture);

    const record = {
      course: "Blockchain Technology",
      credentialId: "CRED-2026-000042",
      degree: "BSc Computer Science",
      department: "Computer Science",
      graduationYear: 2026,
      grade: "A",
      issueDate: "2026-05-15",
      studentId: "STU-0042",
      studentName: "Alice Example",
      universityName: "Demo University",
    };
    const canonical = Object.keys(record)
      .sort()
      .map((k) => `${k}:${record[k as keyof typeof record]}`)
      .join("|");
    const recordHash = ethers.keccak256(ethers.toUtf8Bytes(canonical));

    await registry.issueCredential(record.credentialId, recordHash);
    let result = await registry.verifyCredential(record.credentialId);
    expect(result.exists).to.equal(true);
    expect(result.credentialHash).to.equal(recordHash);
    expect(result.isRevoked).to.equal(false);

    await registry.revokeCredential(record.credentialId, "Degree withdrawn");
    result = await registry.verifyCredential(record.credentialId);
    expect(result.exists).to.equal(true);
    expect(result.isRevoked).to.equal(true);
    expect(result.revocationReason).to.equal("Degree withdrawn");
  });
});
