# Project Synopsis

## Blockchain-Based Academic Credentials Verification System

| | |
| --- | --- |
| **Programme** | Bachelor of Computer Applications (BCA), Final Year |
| **Project type** | Full-stack web application with smart-contract integration |
| **Domain** | Blockchain, Web Development, Information Security |
| **Blockchain network** | Polygon Amoy testnet (Hardhat local network for development) |
| **Deployment target** | Amazon Web Services (AWS) |

---

## 1. Introduction

Academic certificates are among the most frequently forged documents in the world. Employers, universities and government bodies routinely receive degree certificates, mark sheets and diplomas whose authenticity they cannot check quickly or cheaply. Traditional verification means writing to the issuing institution and waiting days or weeks for a reply; many organisations simply skip the step.

This project builds a web platform where a university issues digital academic credentials, and anyone — an employer, another university, or the student — can verify a credential in seconds. The system anchors a cryptographic fingerprint (hash) of every credential on a public blockchain, so the record cannot be silently altered or back-dated, while the actual student data stays in a conventional database under the institution's control.

## 2. Problem Statement

- Paper and PDF certificates are easy to forge and hard to verify.
- Manual verification is slow, expensive and depends on the issuing institution being reachable.
- Existing digital registries are centralised: whoever controls the database can alter or delete records without leaving evidence.
- Revocation (for example, after an academic-integrity finding) is rarely communicated to parties who already hold a copy of the certificate.

## 3. Objectives

1. Allow authorised university staff to issue academic credentials through a secure web interface.
2. Anchor a tamper-evident hash of each credential on a public blockchain smart contract.
3. Provide a public verification portal that returns **VALID**, **REVOKED** or **NOT FOUND** for any credential ID or QR code, without requiring a login or a crypto wallet.
4. Support on-chain revocation with a recorded reason and transaction hash.
5. Detect tampering by recomputing the credential hash from the database record and comparing it with the value stored on-chain.
6. Keep personal student data off the blockchain to respect privacy, storing only hashes on-chain.
7. Deploy the complete system on AWS with the smart contract on the Polygon Amoy testnet.

## 4. Existing System vs Proposed System

| Aspect | Existing (manual / centralised) | Proposed (this project) |
| --- | --- | --- |
| Verification time | Days to weeks | Seconds |
| Tamper evidence | None — database owner can edit records | Hash anchored on public blockchain; any change breaks the hash |
| Revocation visibility | Not propagated | Recorded on-chain with reason and timestamp |
| Verifier requirements | Contact the university | Web browser only; no account or wallet |
| Cost per verification | Staff time, postage | Negligible (read-only blockchain call) |
| Privacy | Full records shared for verification | Only a hash is public; details served by the institution's API |

## 5. Proposed System Overview

The system follows a **hybrid on-chain / off-chain architecture**:

- **Off-chain (PostgreSQL):** the complete credential record — student name, ID, degree, course, department, grade, dates — plus the issuing administrator and any revocation details.
- **On-chain (smart contract):** for each credential ID, only the `keccak256` hash of the canonical credential data, the issuer address, issue timestamp, revocation flag, revocation timestamp and reason.

The hash is computed deterministically from the credential fields (sorted alphabetically, joined as `key:value|key:value|…`). At verification time the backend recomputes the hash from the database record and compares it with the on-chain value. A match proves the record has not been altered since issuance; a mismatch flags tampering.

```text
+------------------+      HTTPS/JSON      +---------------------+     ethers.js     +------------------------+
|  React frontend  | <------------------> |   NestJS backend    | <---------------> |  CredentialRegistry    |
|  (Vite, TS)      |                      |   + Prisma ORM      |   JSON-RPC        |  (Solidity, Ownable)   |
+------------------+                      +----------+----------+                   |  Polygon Amoy testnet  |
                                                     |                              +------------------------+
                                                     v
                                            +------------------+
                                            |   PostgreSQL     |
                                            +------------------+
```

The browser never touches the blockchain directly. All contract transactions are signed by the backend using the institution's wallet, which is the `owner` of the contract. This means verifiers and students need no wallet, no test tokens and no blockchain knowledge.

## 6. System Modules

### 6.1 Smart contract — `CredentialRegistry`

- Written in Solidity 0.8.28 using **OpenZeppelin `Ownable`** for access control.
- `issueCredential(credentialId, hash)` — owner-only; stores hash, issuer, timestamp; emits `CredentialIssued`.
- `revokeCredential(credentialId, reason)` — owner-only; marks revoked with reason and timestamp; emits `CredentialRevoked`.
- `verifyCredential(credentialId)` — public read; returns the full on-chain record, or `exists = false` for unknown IDs.
- Custom errors: `EmptyCredentialId`, `EmptyCredentialHash`, `AlreadyIssued`, `CredentialNotFound`, `AlreadyRevoked`; unauthorised callers revert with OpenZeppelin's `OwnableUnauthorizedAccount`.

### 6.2 Backend API — NestJS

- **Auth module:** administrator login with bcrypt password hashing and JWT-protected routes.
- **Credentials module:** issue, list/search/filter, view, revoke, retry-anchor and public verify endpoints; sequential IDs of the form `CRED-YYYY-NNNNNN`.
- **Blockchain module:** wraps ethers.js; loads the deployed contract ABI/address; signs and submits transactions; reads on-chain state.
- **Health module:** `/api/health` reporting database and blockchain connectivity for load-balancer checks.
- Rate limiting, global validation and a uniform error filter.

### 6.3 Frontend — React

- **Public:** Home, Verify (enter ID or scan QR), Student credential view with QR code and transaction links to Polygonscan.
- **Admin (login required):** Dashboard with live statistics, Issue Credential form, Credentials list with search/filter, Credential detail with revoke action.

### 6.4 Database — PostgreSQL via Prisma

- `Admin` — staff accounts and roles.
- `Credential` — full record, hash, status and blockchain anchoring metadata (tx hash, block number, contract address, network).
- `Revocation` — reason, revoking admin, on-chain tx hash, timestamp.

### 6.5 Deployment tooling

- Hardhat 3 with Solidity (forge-std) and TypeScript (Mocha/Chai) test suites — 26 automated tests including fuzz tests.
- Deployment script that publishes the contract to the local Hardhat node or Polygon Amoy and writes the ABI and address for the backend.
- Docker Compose for local PostgreSQL; Prisma migrations and an idempotent seed script for demo data.

## 7. Technology Stack

| Layer | Technology |
| --- | --- |
| Smart contract | Solidity 0.8.28, OpenZeppelin Contracts 5, Hardhat 3, Hardhat Ignition, forge-std |
| Blockchain network | Polygon Amoy testnet (chain ID 80002); Hardhat local network for development |
| Backend | Node.js, NestJS 10, TypeScript, Prisma 5, ethers.js 6, Passport-JWT, bcrypt |
| Database | PostgreSQL 16 |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, React Router, Axios, qrcode.react |
| Testing | Solidity unit/fuzz tests, Mocha + Chai, Jest |
| Infrastructure | Docker Compose (local), AWS (production), Alchemy RPC, Polygonscan |

## 8. Methodology

1. **Requirement analysis** — study of forgery cases and existing verification workflows; definition of issue/verify/revoke use-cases.
2. **Design** — hybrid architecture, canonical hashing scheme, database schema, contract interface, REST API contract.
3. **Smart-contract development** — implement `CredentialRegistry`, write Solidity and TypeScript tests, deploy locally.
4. **Backend development** — API, database, blockchain integration, health checks; end-to-end tests against the local chain.
5. **Frontend development** — admin and public interfaces consuming the API.
6. **Integration testing** — full issue → verify → revoke → verify cycle on a local node, then on Polygon Amoy.
7. **Deployment** — contract to Polygon Amoy (verified on Polygonscan); backend, frontend and database on AWS with secrets held in AWS Secrets Manager.
8. **Documentation and demonstration** — setup guide, viva demonstration script covering valid, revoked, not-found and tampered scenarios.

## 9. Hardware and Software Requirements

**Development machine:** any modern PC with 8 GB RAM, Node.js 20+, pnpm/npm, Docker, Git.

**Production (AWS):** a compute service for the backend (for example ECS Fargate or EC2), S3 + CloudFront for the static frontend, Amazon RDS for PostgreSQL, Secrets Manager for the RPC URL, wallet key and JWT secret.

**External services:** Polygon Amoy RPC endpoint (Alchemy or public), Amoy test POL from the Polygon faucet, Polygonscan API key for contract verification.

## 10. Security Considerations

- Only the contract owner (institution wallet) can issue or revoke; enforced on-chain by OpenZeppelin `Ownable`.
- Private keys never appear in source control; Hardhat's encrypted keystore is used for deployment and AWS Secrets Manager at runtime.
- Passwords stored as bcrypt hashes; admin routes protected by JWT; API rate-limited.
- No personal data on-chain — only hashes — so the public ledger reveals nothing about students.
- Tamper detection is two-sided: the backend checks the database record against its stored hash and against the on-chain hash.

## 11. Expected Outcomes

- A working web platform where credentials can be issued, verified and revoked end-to-end.
- Every issued credential backed by a Polygon Amoy transaction viewable on Polygonscan.
- Verification of any credential within seconds by anyone with the ID or QR code.
- Demonstrable tamper detection: editing a database record causes verification to flag a hash mismatch.
- Automated test coverage of the smart contract and backend.

## 12. Future Scope

- Multi-institution support with per-university issuer roles (OpenZeppelin `AccessControl`).
- Student-owned credentials as soul-bound tokens or W3C Verifiable Credentials.
- Batch issuance via Merkle roots to cut gas costs for large graduating classes.
- Mainnet deployment (Polygon PoS) once the model is validated.
- Integration with national academic repositories and employer HR systems through APIs.

## 13. References

1. Nakamoto, S. — *Bitcoin: A Peer-to-Peer Electronic Cash System*, 2008.
2. Buterin, V. — *Ethereum Whitepaper*, 2014.
3. OpenZeppelin Contracts documentation — <https://docs.openzeppelin.com/contracts>
4. Hardhat documentation — <https://hardhat.org/docs>
5. Polygon Amoy testnet documentation — <https://docs.polygon.technology>
6. ethers.js v6 documentation — <https://docs.ethers.org/v6>
7. NestJS documentation — <https://docs.nestjs.com>
8. Prisma documentation — <https://www.prisma.io/docs>
9. MIT Media Lab — *Blockcerts: An Open Standard for Blockchain Credentials*.
