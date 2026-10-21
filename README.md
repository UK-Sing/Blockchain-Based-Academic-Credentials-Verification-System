# CredentialChain — Blockchain-Based Academic Credentials Verification System

A full-stack platform where universities issue tamper-evident academic credentials,
students access them through a portal, and anyone (employers, the public) can verify
a credential by ID or QR code — instantly, without an account.

The **full credential data lives off-chain** in PostgreSQL; only a keccak256
**fingerprint + status** is anchored to a smart contract, so a certificate can be
proven genuine or revoked without putting private student data on a public chain.

Built as a BCA final-year project. Live on **Polygon Amoy testnet**; also runs
fully locally on a Hardhat node.

---

## Roles

| Role | What they can do |
| --- | --- |
| **Public** | Verify any credential by ID or QR upload on the home page — no login |
| **Institution** (issuer) | Self-register, issue/revoke credentials, register students, view scoped analytics. Must be **ACTIVE** (approved by the maintainer) before writes are allowed |
| **Platform maintainer** | Observe system health, blockchain status, wallet balance and platform stats; approve/reject/suspend institutions; set trust levels. **Cannot** issue or revoke credentials |
| **Student** | Log in with a student ID, view/download their credentials and verification QR/PDF |

## Features

- Public verification: credential ID, deep link (`/verify/<id>`), or **upload a photo of the QR**
- Certificate preview + **PDF download** with embedded verify QR and transaction hash
- Printable "REVOKED" stamp on revoked certificates
- Institution scoping: each institution only sees its own credentials and students
- Trust levels (Unverified / Verified / Accredited) and issuer-status warnings shown to verifiers
- Analytics dashboards (institution-scoped and platform-wide)
- Idempotent seed that anchors demo credentials on-chain when the node is reachable
- Solid-color UI with branding, footer, responsive console navigation

## Tech stack

| Layer | Tech |
| --- | --- |
| Contract | Solidity 0.8.28, OpenZeppelin `Ownable`, Hardhat 3 |
| Backend | NestJS 10, Prisma 5, PostgreSQL 16, JWT + bcrypt, ethers.js 6 |
| Frontend | React 18, Vite, TypeScript, Tailwind, React Router, Axios, qrcode.react, html5-qrcode, html2canvas + jsPDF |
| Chain | Polygon Amoy (chain id 80002) or local Hardhat (31337) |

## Repository layout

```
├── contracts/          CredentialRegistry.sol + Solidity unit tests
├── test/               TypeScript (mocha/ethers) contract tests
├── ignition/           Hardhat Ignition deployment module
├── scripts/deploy.ts   Deploys contract, writes ABI+address to backend & frontend
├── backend/            NestJS API (auth, credentials, students, admin, blockchain svc)
├── frontend/           React/Vite app
├── docs/               SYNOPSIS.md/pptx, AWS_DEPLOYMENT.md, README-app.md
└── docker-compose.yml  PostgreSQL 16 (+ optional pgAdmin)
```

**Only the backend touches the blockchain** — private keys never reach the browser.

## Quick start (local, no real network needed)

Prerequisites: Node.js 20+, pnpm (root) / npm, Docker.

```bash
# 1. Postgres
docker compose up -d

# 2. Local blockchain (terminal A — keep running)
pnpm install
pnpm run node

# 3. Deploy the contract locally (terminal B)
pnpm run deploy:local      # writes ABI+address into backend/ and frontend/

# 4. Backend
cd backend
npm install
cp .env.example .env       # defaults already point at local Hardhat
npx prisma migrate deploy
npm run prisma:seed        # demo accounts + credentials (anchored if node is up)
npm run start:dev          # http://localhost:4000/api

# 5. Frontend (terminal C)
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Open **http://localhost:5173** and verify `CRED-2026-000001` — no login needed.

## Demo accounts

| Account | Login | Password |
| --- | --- | --- |
| Platform maintainer | `admin@credential-chain.dev` | `Admin@123` |
| Demo University (ACTIVE) | `registrar@demo-university.edu` | `Institution@123` |
| Northbridge Institute (PENDING) | `admissions@northbridge-tech.edu` | `Institution@123` |
| Students | `STU2026001` – `STU2026003` | `Student@123` |

Demo credentials: `CRED-2026-000001` and `-000002` (valid), `CRED-2026-000003` (revoked).

## Polygon Amoy mode

The contract is already deployed at
[`0xC394C6AfB94B081AAd9f3272Abd29500d8007F85`](https://amoy.polygonscan.com/address/0xC394C6AfB94B081AAd9f3272Abd29500d8007F85).

Secrets for Hardhat live in the encrypted keystore (not `.env`):

```bash
pnpm hardhat keystore set AMOY_RPC_URL       # e.g. Alchemy Amoy endpoint
pnpm hardhat keystore set AMOY_PRIVATE_KEY   # funded deployer/owner wallet
pnpm run deploy:amoy                        # only needed for a new contract
```

Then point the backend at it in `backend/.env`:

```ini
RPC_URL=https://polygon-amoy.g.alchemy.com/v2/<your-key>
BLOCKCHAIN_PRIVATE_KEY=0x<contract-owner wallet key>
CONTRACT_ADDRESS=0xC394C6AfB94B081AAd9f3272Abd29500d8007F85
CHAIN_ID=80002
NETWORK_LABEL=Polygon Amoy Testnet
```

`BLOCKCHAIN_PRIVATE_KEY` must be the contract **owner** or issue/revoke calls revert.

## Testing

```bash
# Smart contract (Solidity + mocha/ethers suites)
pnpm test

# Backend unit tests (auth, guards, hashing, scoping)
cd backend && npm test

# Production builds
cd backend && npm run build
cd frontend && npm run build
```

## Docs

- [docs/AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md) — granular AWS Learner Lab hosting guide
- [docs/SYNOPSIS.md](docs/SYNOPSIS.md) — project synopsis
- [docs/README-app.md](docs/README-app.md) — original runbook (older; this README is current)

## Notes

- `.env` files and the Hardhat keystore hold secrets — they're git-ignored; only `.env.example` files are tracked.
- The local `BLOCKCHAIN_PRIVATE_KEY` default is Hardhat's well-known account #0 — fine for localhost, useless (and unsafe) anywhere else.
- Passwords are bcrypt-hashed in Postgres; nothing personal goes on-chain — only `keccak256` fingerprints.
