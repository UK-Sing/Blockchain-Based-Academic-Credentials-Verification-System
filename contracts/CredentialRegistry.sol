// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Academic credential registry
/// @notice Stores only a keccak256 hash + status per credential ID. No personal data on-chain.
contract CredentialRegistry is Ownable {
  struct Credential {
    bytes32 credentialHash;
    address issuer;
    uint256 issueTimestamp;
    bool isRevoked;
    uint256 revocationTimestamp;
    string revocationReason;
  }

  mapping(string => Credential) private _credentials;

  event CredentialIssued(string credentialId, bytes32 indexed credentialHash, address indexed issuer, uint256 timestamp);
  event CredentialRevoked(string credentialId, string reason, uint256 timestamp);

  error EmptyCredentialId();
  error EmptyCredentialHash();
  error AlreadyIssued(string credentialId);
  error CredentialNotFound(string credentialId);
  error AlreadyRevoked(string credentialId);

  constructor(address initialOwner) Ownable(initialOwner) {}

  function issueCredential(string calldata credentialId, bytes32 credentialHash) external onlyOwner {
    if (bytes(credentialId).length == 0) revert EmptyCredentialId();
    if (credentialHash == bytes32(0)) revert EmptyCredentialHash();
    Credential storage c = _credentials[credentialId];
    if (c.issueTimestamp != 0) revert AlreadyIssued(credentialId);

    c.credentialHash = credentialHash;
    c.issuer = msg.sender;
    c.issueTimestamp = block.timestamp;

    emit CredentialIssued(credentialId, credentialHash, msg.sender, block.timestamp);
  }

  function revokeCredential(string calldata credentialId, string calldata reason) external onlyOwner {
    Credential storage c = _credentials[credentialId];
    if (c.issueTimestamp == 0) revert CredentialNotFound(credentialId);
    if (c.isRevoked) revert AlreadyRevoked(credentialId);

    c.isRevoked = true;
    c.revocationTimestamp = block.timestamp;
    c.revocationReason = reason;

    emit CredentialRevoked(credentialId, reason, block.timestamp);
  }

  /// @dev Never reverts for unknown IDs; the backend relies on `exists == false`.
  function verifyCredential(string calldata credentialId)
    external
    view
    returns (
      bool exists,
      bytes32 credentialHash,
      address issuer,
      uint256 issueTimestamp,
      bool isRevoked,
      uint256 revocationTimestamp,
      string memory revocationReason
    )
  {
    Credential storage c = _credentials[credentialId];
    exists = c.issueTimestamp != 0;
    return (exists, c.credentialHash, c.issuer, c.issueTimestamp, c.isRevoked, c.revocationTimestamp, c.revocationReason);
  }
}
