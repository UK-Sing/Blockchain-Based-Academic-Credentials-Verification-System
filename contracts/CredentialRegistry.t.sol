// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CredentialRegistry} from "./CredentialRegistry.sol";

contract CredentialRegistryTest is Test {
  CredentialRegistry registry;

  event CredentialIssued(string credentialId, bytes32 indexed credentialHash, address indexed issuer, uint256 timestamp);
  event CredentialRevoked(string credentialId, string reason, uint256 timestamp);

  bytes32 constant HASH = keccak256("alice-bsc-2026");

  function setUp() public {
    registry = new CredentialRegistry(address(this));
  }

  function test_OwnerIsInitialOwner() public view {
    require(registry.owner() == address(this), "owner should be the initial owner");
  }

  function test_IssueStoresAndEmits() public {
    vm.warp(1_700_000_000);
    vm.expectEmit(true, true, false, true);
    emit CredentialIssued("CRED-1", HASH, address(this), 1_700_000_000);
    registry.issueCredential("CRED-1", HASH);

    (bool exists, bytes32 h, address iss, uint256 ts, bool revoked, uint256 revTs, string memory reason) =
      registry.verifyCredential("CRED-1");
    require(exists && h == HASH && iss == address(this) && ts == 1_700_000_000, "stored fields wrong");
    require(!revoked && revTs == 0 && bytes(reason).length == 0, "should not be revoked");
  }

  function test_RevokeStoresAndEmits() public {
    registry.issueCredential("CRED-1", HASH);
    vm.warp(block.timestamp + 3600);
    uint256 revTime = block.timestamp;
    vm.expectEmit(false, false, false, true);
    emit CredentialRevoked("CRED-1", "Fraud", revTime);
    registry.revokeCredential("CRED-1", "Fraud");

    (bool exists,,,, bool revoked, uint256 revTs, string memory reason) = registry.verifyCredential("CRED-1");
    require(exists && revoked && revTs == revTime, "revocation fields wrong");
    require(keccak256(bytes(reason)) == keccak256("Fraud"), "reason wrong");
  }

  function test_VerifyUnknownReturnsExistsFalse() public view {
    (bool exists, bytes32 h, address iss, uint256 ts, bool revoked, uint256 revTs, string memory reason) =
      registry.verifyCredential("NOPE");
    require(!exists && h == bytes32(0) && iss == address(0) && ts == 0, "expected empty record");
    require(!revoked && revTs == 0 && bytes(reason).length == 0, "expected empty revocation");
  }

  function test_RevertWhen_IssueByNonOwner() public {
    vm.prank(address(0xBAD));
    vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(0xBAD)));
    registry.issueCredential("CRED-1", HASH);
  }

  function test_RevertWhen_RevokeByNonOwner() public {
    registry.issueCredential("CRED-1", HASH);
    vm.prank(address(0xBAD));
    vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(0xBAD)));
    registry.revokeCredential("CRED-1", "Fraud");
  }

  function test_RevertWhen_EmptyId() public {
    vm.expectRevert(CredentialRegistry.EmptyCredentialId.selector);
    registry.issueCredential("", HASH);
  }

  function test_RevertWhen_ZeroHash() public {
    vm.expectRevert(CredentialRegistry.EmptyCredentialHash.selector);
    registry.issueCredential("CRED-1", bytes32(0));
  }

  function test_RevertWhen_DuplicateIssue() public {
    registry.issueCredential("CRED-1", HASH);
    vm.expectRevert(abi.encodeWithSelector(CredentialRegistry.AlreadyIssued.selector, "CRED-1"));
    registry.issueCredential("CRED-1", keccak256("other"));
  }

  function test_RevertWhen_RevokeUnknown() public {
    vm.expectRevert(abi.encodeWithSelector(CredentialRegistry.CredentialNotFound.selector, "NOPE"));
    registry.revokeCredential("NOPE", "Fraud");
  }

  function test_RevertWhen_DoubleRevoke() public {
    registry.issueCredential("CRED-1", HASH);
    registry.revokeCredential("CRED-1", "Fraud");
    vm.expectRevert(abi.encodeWithSelector(CredentialRegistry.AlreadyRevoked.selector, "CRED-1"));
    registry.revokeCredential("CRED-1", "Again");
  }

  function testFuzz_IssueRoundTrip(bytes32 hash) public {
    vm.assume(hash != bytes32(0));
    registry.issueCredential("CRED-FUZZ", hash);
    (bool exists, bytes32 stored,,,,,) = registry.verifyCredential("CRED-FUZZ");
    require(exists && stored == hash, "round trip failed");
  }
}
