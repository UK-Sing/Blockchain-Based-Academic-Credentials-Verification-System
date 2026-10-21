# Academic Credential Verification System

A working blockchain-based academic credential verification platform: universities issue
credentials, employers verify them, and the verification hash is anchored on a smart contract
so it can't be silently altered.

Built for a BCA final-year project demonstration — everything below runs locally with
**Hardhat + PostgreSQL**, no paid services or public testnet required (though Polygon Amoy
is supported if you want to use it).

---

## Table of contents

1. [Project overview](#project-overview)
2. [Features](#features)
3. [Technology stack](#technology-stack)
4. [Architecture](#architecture)
5. [Requirements](#requirements)
6. [Installation](#installation)
7. [Environment variables](#environment-variables)
8. [Database setup](#database-setup)
9. [Smart contract deployment](#smart-contract-deployment)
10. [Backend setup](#backend-setup)
11. [Frontend setup](#frontend-setup)
12. [Running the project (full local demo)](#running-the-project-full-local-demo)
13. [Test accounts / demo data](#test-accounts--demo-data)
14. [Testing](#testing)
15. [Viva demonstration script (all 6 scenarios)](#viva-demonstration-script-all-6-scenarios)
16. [Troubleshooting](#troubleshooting)

---

## Project overview

Universities issue academic certificates, but employers often have no reliable way to check
whether a certificate is genuine or has since been revoked. This system solves that by:

- Storing the **full credential record** in PostgreSQL (off-chain).
- Storing only a **cryptographic hash + status** on a smart contract (on-chain).
- Letting anyone verify a credential by ID or QR code and see **VALID / REVOKED / NOT FOUND**.

## Features

- Admin authentication (bcrypt + JWT)
- Credential issuance with real SHA/keccak256 hashing
- Real smart-contract transactions for issuance and revocation
- QR code generation pointing at a public verification URL
- Public verifier: credential ID or QR → VALID / REVOKED / NOT FOUND
- Admin dashboard with live database statistics
- Credential management: search, filter, view, revoke
- Local Hardhat blockchain mode (default) or Polygon Amoy testnet mode
- Seed script with 2 valid + 1 revoked demo credential

## Technology stack

**Frontend:** React, Vite, TypeScript, Tailwind CSS, React Router, Axios, qrcode.react, Ethers.js, Lucide icons

**Backend:** Node.js, NestJS, TypeScript, Prisma ORM, PostgreSQL, Ethers.js, JWT, bcrypt

**Blockchain:** Solidity, Hardhat, OpenZeppelin, Ethers.js, Polygon Amoy testnet (optional) / Hardhat local network (default)

## Architecture

```
credential-chain/
├── blockchain/     Solidity contract + Hardhat config, deploy script, tests
├── backend/        NestJS API: auth, credentials, blockchain service, Prisma schema
├── frontend/       React + Vite admin console and public verifier
└── docker-compose.yml   PostgreSQL (+ optional pgAdmin)
```

**Data split**

| Off-chain (PostgreSQL)                         | On-chain (smart contract)                   |
|--------------------------------------------------|----------------------------------------------|
| Student name, student ID, university, degree, course, department, graduation year, issue date, grade | Credential ID, credential hash, issuer address, issue timestamp, revoked flag, revocation reason/timestamp |

No private student information is ever written to the blockchain.

**Main flow**

```
Admin login → Issue credential → Generate ID → Generate hash → Save to PostgreSQL
→ Send hash to smart contract → Blockchain transaction confirmed → Generate QR code
→ Student receives QR → Employer scans/opens it → Verify → VALID / REVOKED / NOT FOUND
```

## Requirements

- Node.js 20+
- npm 10+
- Docker + Docker Compose (for PostgreSQL) — or a local PostgreSQL 14+ instance
- Git

## Installation

```bash
git clone <your-repo-url> credential-chain
cd credential-chain

# Install each workspace's dependencies
cd blockchain && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

## Environment variables

Copy the example files and adjust if needed (the defaults work out of the box for local demo mode):

```bash
cp blockchain/.env.example blockchain/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env` key variables:

```
DATABASE_URL=postgresql://credential_user:credential_pass@localhost:5432/credential_chain?schema=public
JWT_SECRET=replace-with-a-long-random-string
RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONTRACT_ADDRESS=
CHAIN_ID=31337
NETWORK_LABEL=Hardhat Local
```

> The default `BLOCKCHAIN_PRIVATE_KEY` above is Hardhat's well-known, publicly documented
> local test account #0 key. It is safe **only** for the local Hardhat network — it has no
> real funds and is not a secret. Never reuse it on a real network.

Never commit real private keys, JWT secrets, or database passwords. `.env` files are
git-ignored; only the `.env.example` files are tracked.

## Database setup

```bash
docker compose up -d postgres
```

This starts PostgreSQL on `localhost:5432` with the credentials already baked into
`backend/.env.example`. (Optionally add `--profile tools` to also start pgAdmin on
`localhost:5050`.)

Then, from `backend/`:

```bash
npm run prisma:generate
npm run prisma:migrate     # creates the tables
```

## Smart contract deployment

In one terminal, start the local blockchain node:

```bash
cd blockchain
npm run node
```

Leave this running — it's your local "testnet". In a second terminal, deploy the contract:

```bash
cd blockchain
npm run deploy:local
```

This prints the deployed contract address and automatically writes the ABI + address into:

- `backend/src/blockchain/generated/CredentialRegistry.json`
- `frontend/src/contracts/CredentialRegistry.json`

so the backend can start signing transactions immediately — no manual copy-pasting of ABIs.

To deploy to **Polygon Amoy** instead, set `RPC_URL` and `BLOCKCHAIN_PRIVATE_KEY` (a funded
Amoy testnet wallet) in `blockchain/.env`, then run `npm run deploy:amoy`, and set
`NETWORK_LABEL=Polygon Amoy Testnet` and `CHAIN_ID=80002` in `backend/.env`.

## Backend setup

```bash
cd backend
npm run prisma:seed     # loads demo admin + 2 valid + 1 revoked demo credential
npm run start:dev       # http://localhost:4000/api
```

If the Hardhat node was already running and the contract already deployed when you seed,
the demo credentials are also anchored on-chain automatically. If not, seed still works
(DB-only) — just re-run `npm run prisma:seed` after the node/contract are up to anchor them.

## Frontend setup

```bash
cd frontend
npm run dev              # http://localhost:5173
```

## Running the project (full local demo)

Four terminals, in order:

```bash
# 1. Database
docker compose up -d postgres

# 2. Blockchain node (keep running)
cd blockchain && npm run node

# 3. Deploy contract, then run backend
cd blockchain && npm run deploy:local
cd backend && npm run prisma:migrate && npm run prisma:seed && npm run start:dev

# 4. Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173**.

## Test accounts / demo data

All demo data is fictional, clearly for local development/viva use only.

- **Admin login:** `admin@demo-university.edu` / `Admin@123`
- **Valid credential IDs:** `CRED-2026-000001`, `CRED-2026-000002`
- **Revoked credential ID:** `CRED-2026-000003`

## Testing

**Smart contract tests** (issue, verify, revoke, access control, duplicate rejection):

```bash
cd blockchain
npm test
```

**Backend unit tests** (login success/failure, canonical hashing determinism,
VALID/REVOKED/NOT_FOUND verification branches):

```bash
cd backend
npm test
```

## Viva demonstration script (all 6 scenarios)

With all four services running (see above):

1. **Issue** — Log in at `/login`, go to *Issue credential*, fill the form, submit. You'll
   see the generated credential ID, the real transaction hash, and a QR code.
2. **Verify** — Open `/verify` in a new tab (or incognito, to show it needs no login), enter
   the credential ID from step 1. Result: **VALID**, with student details and the blockchain
   transaction.
3. **QR** — Scan the QR (or just open its link) from a phone on the same network, or click it
   directly — it opens `/verify/<id>` and shows the same VALID result.
4. **Revoke** — Back in the admin console, open that credential's detail page, click
   *Revoke this credential*, enter a reason, confirm. This sends a real `revokeCredential`
   transaction and updates the database.
5. **Verify revoked** — Re-run verification on the same ID. Result: **REVOKED**, with the
   reason and revocation date shown.
6. **Invalid ID** — Enter a made-up ID like `CRED-2026-999999` in the verifier. Result:
   **NOT FOUND**.

## Troubleshooting

- **"Blockchain network is not reachable"** — make sure `npm run node` (Hardhat) is still
  running in its terminal, and that you ran `npm run deploy:local` afterward.
- **Backend can't connect to the database** — confirm `docker compose ps` shows `postgres`
  as healthy, and that `DATABASE_URL` in `backend/.env` matches the compose credentials.
- **CORS errors in the browser console** — check `CORS_ORIGIN` in `backend/.env` matches the
  frontend's actual URL (`http://localhost:5173` by default).
- **Contract address mismatch after redeploying** — redeploying with `npm run deploy:local`
  regenerates a new address and rewrites the generated ABI/address files automatically;
  restart the backend so it picks up the new file.
- **Seeded demo credentials show as "pending" on-chain** — this happens if you ran
  `npm run prisma:seed` before the Hardhat node/contract were up. Just start them and
  re-run `npm run prisma:seed`; it's idempotent and will anchor them on-chain then.
