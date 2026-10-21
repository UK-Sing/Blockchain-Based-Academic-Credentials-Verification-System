# Deploying CredentialChain on AWS Learner Lab

A step-by-step guide to hosting the full CredentialChain stack on an AWS Academy
**Learner Lab**. Written for someone comfortable with the AWS console who hasn't
deployed a multi-service app before.

By the end you will have:

- A public URL (`http://<PUBLIC_IP>`) serving the React frontend.
- The same URL serving the NestJS API at `/api` (same origin — **no CORS headaches**).
- Postgres running in Docker on the same instance.
- Credential hashes anchored to **Polygon Amoy** testnet (free test POL, no real money).

```
                        ┌─────────────────────────────────────────────┐
 Browser ──HTTP──►      │  EC2 t3.micro (Amazon Linux 2023)           │
                        │                                             │
                        │   Nginx :80                                 │
                        │    ├── /        → static frontend (dist/)   │
                        │    └── /api/*   → 127.0.0.1:4000            │
                        │                                             │
                        │   systemd → NestJS backend :4000            │
                        │   Docker  → Postgres :5432                  │
                        └───────────────┬─────────────────────────────┘
                                        │ ethers.js
                                        ▼
                              Polygon Amoy testnet
                        (CredentialRegistry contract)
```

---

## Learner Lab gotchas — read this first

1. **Sessions expire every ~4 hours.** When the lab session ends, your EC2 instance
   is *stopped*, not deleted. Your data, files and config all survive.
2. **The public IP changes when the instance restarts.** After each new lab session
   you must restart the instance, note the new IP, and update the frontend's
   `VITE_VERIFICATION_BASE_URL` + rebuild + re-upload. (Learner Labs usually don't
   allow Elastic IPs — if yours does, use one and skip that pain. See Phase 1.4.)
3. **Budget cap (~$50–100 depending on the lab).** Everything in this guide is
   free-tier sized. Stop the instance when you're not using it.
4. **Restricted services.** You can use EC2, S3, RDS, CloudFront, DynamoDB, etc.
   You **cannot** create IAM users/roles freely, register Route 53 domains, or
   attach an IAM role that isn't `LabRole`/`vocrole`. This guide avoids all of that.
5. **You get credentials from the Learner Lab dashboard** ("AWS Details" button →
   copy `aws_access_key_id`, `aws_secret_access_key`, `aws_session_token`). These
   rotate every session — that's why this guide uses the console + SSH instead of
   long-lived CLI keys.

---

## Phase 0 — Prep on your laptop (5 min)

### 0.1 Verify the project builds locally

```bash
cd /path/to/blockchain_spec_project

cd backend
pnpm install
pnpm run prisma:generate
pnpm run build

cd ../frontend
pnpm install
pnpm run build
```

If either fails, fix it now — the cloud will only repeat the same errors.

### 0.2 Fill in this worksheet

You'll paste these values in later. Keep them in a scratch file that is **not**
inside the git repo.

| Variable | Value | Where to get it |
| --- | --- | --- |
| `EC2_PUBLIC_IP` | | Assigned in Phase 1 |
| `DB_PASSWORD` | | You invent it in Phase 3 (any strong password) |
| `JWT_SECRET` | | Run `openssl rand -hex 32` on your laptop |
| `RPC_URL` | | Your Alchemy/Infura Polygon Amoy endpoint — the same URL stored in the Hardhat keystore (`pnpm hardhat keystore get AMOY_RPC_URL`) |
| `BLOCKCHAIN_PRIVATE_KEY` | | The 66-char `0x…` key of the wallet that deployed the contract (`pnpm hardhat keystore get AMOY_PRIVATE_KEY`) |
| `CONTRACT_ADDRESS` | `0xC394C6AfB94B081AAd9f3272Abd29500d8007F85` | Already deployed — reuse it |

### 0.3 Sanity-check the wallet

1. Open `https://amoy.polygonscan.com/address/0x970e73f8f6289a5c391CC86FCe33707F290484C4`
   (your deployer wallet).
2. Confirm it holds test POL (you need ~0.05 POL for a demo; get more from
   [faucet.polygon.technology](https://faucet.polygon.technology) if needed).
3. Confirm the private key you're about to use derives to this address and that
   this address deployed `CONTRACT_ADDRESS`. The backend can only issue/revoke if
   the key belongs to the contract's owner.

---

## Phase 1 — Launch the EC2 instance (10 min)

### 1.1 Start the lab session and open the console

1. Open your Learner Lab dashboard.
2. Click **Start Lab**. Wait until the dot goes green.
3. Click **AWS** to open the console (new tab).

### 1.2 Create a key pair (once per lab account)

1. In the console search bar type **EC2**, press Enter.
2. Left sidebar → **Network & Security → Key Pairs**.
3. **Create key pair**:
   - Name: `credential-chain-key`
   - Type: RSA, format: `.pem`
4. The `.pem` downloads automatically. Move it somewhere stable and lock it down:

```bash
mv ~/Downloads/credential-chain-key.pem ~/.ssh/
chmod 400 ~/.ssh/credential-chain-key.pem
```

### 1.3 Launch the instance

1. EC2 console → **Instances → Launch instances**.
2. Fill in:
   - **Name:** `credential-chain`
   - **AMI:** Amazon Linux 2023 (free tier eligible)
   - **Instance type:** `t3.micro` (or `t2.micro` — both are fine)
   - **Key pair:** `credential-chain-key`
   - **Network settings → Edit → Auto-assign public IP:** Enable
   - **Firewall (security group):** Create new, name it `credential-chain-sg`
   - Add rules:
     | Type | Port | Source |
     | --- | --- | --- |
     | SSH | 22 | My IP (change to `0.0.0.0/0` only if "My IP" fails from campus Wi-Fi) |
     | HTTP | 80 | Anywhere `0.0.0.0/0` |
     | HTTPS | 443 | Anywhere `0.0.0.0/0` |
   - **Storage:** 8 GiB gp3 (default) is enough.
3. **Launch instance.**

> **Do not** open port 4000 or 5432 publicly. Nginx is the only thing the
> internet talks to.

### 1.4 (Optional) Elastic IP

1. EC2 sidebar → **Elastic IPs → Allocate Elastic IP address → Allocate**.
2. Select it → **Actions → Associate Elastic IP** → pick your instance.
3. If the lab denies this action (common), skip it — you'll just re-check the IP
   each session.

### 1.5 SSH in

1. Instances list → click `credential-chain` → copy **Public IPv4 address**
   → write it in the worksheet as `EC2_PUBLIC_IP`.
2. From your laptop:

```bash
ssh -i ~/.ssh/credential-chain-key.pem ec2-user@<EC2_PUBLIC_IP>
```

Accept the fingerprint. You should land in `/home/ec2-user`.

**Checkpoint:** `whoami` prints `ec2-user`.

---

## Phase 2 — Set up the server (10 min)

Everything below runs *on the EC2 instance* unless stated otherwise.

### 2.1 Update and install packages

```bash
sudo dnf update -y
sudo dnf install -y git nginx docker
```

Node 20 isn't in the default repos; install via NodeSource:

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
sudo npm install -g pnpm
```

Verify:

```bash
node -v    # v20.x
pnpm -v    # 9.x or 10.x
docker -v  # Docker ...
```

### 2.2 Enable Docker

```bash
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
exit
```

SSH back in (the group membership only applies to a new session):

```bash
ssh -i ~/.ssh/credential-chain-key.pem ec2-user@<EC2_PUBLIC_IP>
docker ps   # should print an empty table, not a permission error
```

### 2.3 Get the code onto the server

Pick **one**:

**Option A — rsync from your laptop** (works even though the repo isn't on GitHub):

```bash
# run on YOUR LAPTOP, from the repo root
rsync -avz --progress \
  --exclude=node_modules --exclude=.git --exclude=dist \
  --exclude=.env --exclude=merge \
  -e "ssh -i ~/.ssh/credential-chain-key.pem" \
  ./ ec2-user@<EC2_PUBLIC_IP>:~/credential-chain/
```

**Option B — git clone** (only if the repo is on GitHub and public):

```bash
# on the EC2
git clone https://github.com/<you>/Blockchain-Based-Academic-Credentials-Verification-System.git credential-chain
```

**Checkpoint:** `ls ~/credential-chain` shows `backend`, `frontend`, `contracts`, etc.

---

## Phase 3 — Database in Docker (5 min)

We run Postgres in a container on the same box — free, simple, and nothing
outside the EC2 can reach it (it binds to `127.0.0.1` only).

### 3.1 Write the compose file

```bash
mkdir -p ~/credential-chain/prod
cd ~/credential-chain/prod
nano docker-compose.yml
```

Paste:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: credential-chain-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: credential_user
      POSTGRES_PASSWORD: <DB_PASSWORD>          # your invented password
      POSTGRES_DB: credential_chain
    ports:
      - "127.0.0.1:5432:5432"                   # localhost only — never public
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U credential_user -d credential_chain"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  pgdata:
```

### 3.2 Start it

```bash
docker compose up -d
docker compose ps
```

**Checkpoint:** status shows `Up X seconds (healthy)`.

### 3.3 Verify you can query it

```bash
docker exec -it credential-chain-postgres \
  psql -U credential_user -d credential_chain -c "\dt"
```

It prints "Did not find any relations" — fine, we migrate next.

Your `DATABASE_URL` for the backend is therefore:

```text
postgresql://credential_user:<DB_PASSWORD>@127.0.0.1:5432/credential_chain?schema=public
```

---

## Phase 4 — Backend (15 min)

### 4.1 Install and build

On the EC2:

```bash
cd ~/credential-chain/backend
pnpm install
pnpm run prisma:generate
pnpm run build
ls dist/main.js    # must exist
```

### 4.2 Create the production `.env`

```bash
nano ~/credential-chain/backend/.env
```

Paste, replacing the placeholders with your worksheet values:

```ini
# --- Database ---
DATABASE_URL=postgresql://credential_user:<DB_PASSWORD>@127.0.0.1:5432/credential_chain?schema=public

# --- Auth ---
JWT_SECRET=<JWT_SECRET>
JWT_EXPIRES_IN=8h

# --- Blockchain (Polygon Amoy) ---
RPC_URL=<RPC_URL>
BLOCKCHAIN_PRIVATE_KEY=<BLOCKCHAIN_PRIVATE_KEY>
CONTRACT_ADDRESS=0xC394C6AfB94B081AAd9f3272Abd29500d8007F85
CHAIN_ID=80002
NETWORK_LABEL=Polygon Amoy Testnet

# --- App ---
PORT=4000
# Same-origin: the frontend is served by Nginx on this box, so CORS_ORIGIN
# only needs to cover the public IP for direct API hits.
CORS_ORIGIN=http://<EC2_PUBLIC_IP>
```

### 4.3 Run migrations and seed

```bash
cd ~/credential-chain/backend
npx prisma migrate deploy
npx prisma db seed
```

**Checkpoint:** the seed logs `Connected to chain (Polygon Amoy Testnet)` and
`CRED-2026-000001 already anchored on-chain` (or `issued`, first run).

If instead you see `invalid private key` or `401 Unauthorized`, your
`BLOCKCHAIN_PRIVATE_KEY` or `RPC_URL` is wrong — fix `.env` and re-run the seed.

### 4.4 Test-run in the foreground first

```bash
node dist/main
```

You want:

```text
LOG [NestApplication] Nest application successfully started
Backend API listening on http://localhost:4000/api
```

…and critically, you do **not** want a `Blockchain connection not available yet`
warning. Ctrl+C when it looks good.

### 4.5 Make it a service that survives restarts

```bash
sudo tee /etc/systemd/system/credential-chain-api.service > /dev/null <<'EOF'
[Unit]
Description=CredentialChain NestJS API
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/credential-chain/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

Notes:
- No `EnvironmentFile` — Nest's `ConfigModule` already loads `.env` from the
  working directory. Keeping it out of the unit file means restarting the
  service picks up `.env` edits with nothing else to remember.
- `ExecStart` uses `node` directly (systemd doesn't inherit your shell's PATH
  quirks with global pnpm shims).

Start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now credential-chain-api
sleep 5
sudo systemctl status credential-chain-api --no-pager
```

**Checkpoint:** `active (running)`, and:

```bash
curl -s http://127.0.0.1:4000/api/health
```

returns `"status":"ok", "database":true, "blockchain":true`.

---

## Phase 5 — Frontend + Nginx (10 min)

### 5.1 Build the frontend *for this server*

Two env vars bake the server address into the build. Create this file **on your
laptop** (or the EC2, wherever you build):

```bash
# on the EC2, so everything stays in one place:
cat > ~/credential-chain/frontend/.env.production <<EOF
VITE_API_URL=/api
VITE_VERIFICATION_BASE_URL=http://<EC2_PUBLIC_IP>/verify
EOF
```

- `VITE_API_URL=/api` makes the browser call the same origin — Nginx forwards
  it to the backend. Zero CORS.
- `VITE_VERIFICATION_BASE_URL` becomes the URL inside generated QR codes, so it
  must be the public address a phone can open.

Build:

```bash
cd ~/credential-chain/frontend
pnpm install
pnpm run build
ls dist/index.html   # must exist
```

### 5.2 Publish the static files

```bash
sudo mkdir -p /var/www/credential-chain
sudo rsync -a --delete ~/credential-chain/frontend/dist/ /var/www/credential-chain/
sudo chown -R nginx:nginx /var/www/credential-chain
sudo chmod -R 755 /var/www/credential-chain
```

### 5.3 Configure Nginx

```bash
sudo tee /etc/nginx/conf.d/credential-chain.conf > /dev/null <<'EOF'
server {
    listen 80 default_server;
    server_name _;

    root /var/www/credential-chain;
    index index.html;

    client_max_body_size 10M;

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # React SPA: every unknown path serves index.html so client-side
    # routes (/verify/:id, /institution/..., /student) work on refresh.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
```

> Note `proxy_pass http://127.0.0.1:4000;` has **no trailing `/api`** — we want
> `/api/health` to reach Nest unchanged since the app already sets the `api`
> global prefix.

Enable and start:

```bash
sudo nginx -t                          # must say "syntax is ok"
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

### 5.4 SELinux gotcha (Amazon Linux has it enforcing)

If `curl http://<EC2_PUBLIC_IP>/api/health` returns **502** while
`curl http://127.0.0.1:4000/api/health` works, Nginx is being blocked from
proxying. Allow it:

```bash
sudo setsebool -P httpd_can_network_connect 1
sudo systemctl reload nginx
```

**Checkpoint:** from your laptop's browser:

- `http://<EC2_PUBLIC_IP>` → the CredentialChain home page loads.
- `http://<EC2_PUBLIC_IP>/api/health` → JSON with `"status":"ok"`.
- `http://<EC2_PUBLIC_IP>/verify` → loads the app (not a 404) — proves the SPA
  fallback works.

---

## Phase 6 — End-to-end verification (5 min)

1. On `http://<EC2_PUBLIC_IP>`, verify `CRED-2026-000001` — it should come back
   valid with a Polygon Amoy transaction link.
2. Institution login: `registrar@demo-university.edu` / `Institution@123`.
3. Issue a new credential → the detail page shows a fresh `txHash`.
4. Open `https://amoy.polygonscan.com/tx/<txHash>` — the transaction exists.
5. Maintainer login: `admin@credential-chain.dev` / `Admin@123` →
   Maintainer Console shows chain status, wallet balance, institutions.
6. Student login: `STU2026001` / `Student@123` → portal lists credentials.

If all six pass, the deployment is done.

---

## Phase 7 — Updating the app later

### Backend changes

```bash
# laptop: push updated files
rsync -avz --exclude=node_modules --exclude=.env \
  -e "ssh -i ~/.ssh/credential-chain-key.pem" \
  backend/ ec2-user@<EC2_PUBLIC_IP>:~/credential-chain/backend/

# EC2:
cd ~/credential-chain/backend
pnpm install && pnpm run build
sudo systemctl restart credential-chain-api
```

### Frontend changes

```bash
# EC2:
cd ~/credential-chain/frontend && pnpm run build
sudo rsync -a --delete dist/ /var/www/credential-chain/
# no reload needed — static files
```

### New Prisma migration

```bash
cd ~/credential-chain/backend
npx prisma migrate deploy
sudo systemctl restart credential-chain-api
```

---

## Phase 8 — Surviving Learner Lab restarts

When you come back tomorrow:

1. Start Lab → wait for green.
2. EC2 → Instances → select `credential-chain` → **Instance state → Start**.
3. Wait for "Status checks: passed", copy the **new public IP**.
4. Docker Postgres and the systemd services auto-start (`restart: unless-stopped`
   and `enabled` respectively).
5. If you have an Elastic IP: done. If not:
   - Rebuild the frontend with the new `VITE_VERIFICATION_BASE_URL` (Phase 5.1),
     re-rsync `dist/` to `/var/www/credential-chain/` (Phase 5.2).
   - Update `CORS_ORIGIN` in `backend/.env` to the new IP and
     `sudo systemctl restart credential-chain-api`.
6. Old QR codes printed/downloaded earlier point at the old IP — regenerate them
   after the IP change. (This is the main reason to prefer an Elastic IP or a
   free dynamic-DNS name like `credential-chain.duckdns.org` + a cron updater.)

---

## Optional upgrades

| Upgrade | Why | How |
| --- | --- | --- |
| HTTPS | Browsers flag `http://` creds; QR scanning on phones prefers HTTPS | Get a free DuckDNS hostname → `sudo dnf install certbot python3-certbot-nginx` → `sudo certbot --nginx -d yourname.duckdns.org` → change env URLs to `https://` |
| Custom domain | Nicer demo URL | DuckDNS/nip.io only — Route 53 registration isn't in Learner Labs |
| RDS instead of Docker Postgres | Managed backups, survives instance loss | Phase 3 alternative below |
| S3 + CloudFront frontend | CDN caching, HTTPS for free | Appendix A |
| Alarm on health endpoint | Know when it breaks | CloudWatch → "Status check failed" alarm on the instance |

### Phase 3 alternative — RDS Postgres

1. RDS console → **Create database** → PostgreSQL 16, template **Free tier** /
   **Dev/Test**, `db.t3.micro`, public access **Yes**, password auth.
2. Master user `credential_user`, password = your `DB_PASSWORD`.
3. Security group: inbound 5432 **from `credential-chain-sg`** (the EC2's group),
   not `0.0.0.0/0`.
4. When `Available`, copy the endpoint. Connect once to create the DB:

```bash
psql postgresql://credential_user:<DB_PASSWORD>@<RDS_ENDPOINT>:5432/postgres
CREATE DATABASE credential_chain;
```

5. In `backend/.env`, point `DATABASE_URL` at the endpoint. Skip the Docker
   Postgres entirely.

---

## Appendix A — S3 + CloudFront frontend (instead of Nginx static)

Only do this if you want the CDN for the presentation narrative — same-origin
Nginx is simpler.

1. Build with `VITE_API_URL=http://<EC2_PUBLIC_IP>/api` (cross-origin now!) and
   `VITE_VERIFICATION_BASE_URL=https://<CF_DOMAIN>/verify`.
2. S3 → create bucket `credential-chain-frontend-<id>` → **keep "Block all
   public access" ON**.
3. Upload: `aws s3 sync ./dist s3://<bucket> --delete` (need the lab's temporary
   credentials from AWS Details → `aws configure`, including session token).
4. CloudFront → **Create distribution** → origin = the bucket → **Origin access
   control (OAC)** → create control → AWS shows a bucket policy to paste into
   S3 permissions. Default root object: `index.html`. Viewer: redirect HTTP→HTTPS.
5. Custom error responses: map **403 → /index.html → 200** and
   **404 → /index.html → 200** (S3 returns 403 for missing keys; this makes
   client-side routes work).
6. Update backend `.env`: `CORS_ORIGIN=https://<CF_DOMAIN>` and restart.
7. Every frontend redeploy needs an invalidation: distribution →
   **Invalidations** → `/*`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `journalctl` shows `invalid private key` | `.env` key wrong format | Must be 66 chars starting `0x`; check with `grep -c .` or just re-paste |
| `health` says `blockchain:false` | Bad RPC URL or no connectivity | `curl -X POST $RPC_URL -d '{"jsonrpc":"2.0","method":"eth_chainId","id":1,"params":[]}'` from the EC2 |
| `health` says `database:false` | Postgres down or wrong `DATABASE_URL` | `docker compose ps` healthy? Password typo? `prisma migrate deploy` run? |
| Browser: API calls fail with CORS error | `VITE_API_URL` points at a different origin but `CORS_ORIGIN` wasn't updated | Either use same-origin `/api` (recommended) or set `CORS_ORIGIN` to the exact frontend URL incl. scheme |
| 502 via Nginx, backend fine directly | SELinux blocking proxy | `sudo setsebool -P httpd_can_network_connect 1` |
| `/institution/dashboard` gives Nginx 404 | SPA fallback missing | `try_files $uri $uri/ /index.html;` in the `location /` block |
| Issue/revoke fails with `Ownable` error | `BLOCKCHAIN_PRIVATE_KEY` isn't the contract owner | Use the deployer wallet's key |
| Verify works but QR opens localhost | Frontend built with dev env | Rebuild with `.env.production` present, re-sync `dist/` |
| Everything 403s after lab restart | Instance stopped / IP changed | Phase 8 |

---

## Security checklist

- [ ] `backend/.env` exists **only** on the server (never committed, never in rsync).
- [ ] Postgres bound to `127.0.0.1` — unreachable from the internet.
- [ ] Security group: 80/443 open, 22 open to your IP only, nothing else.
- [ ] `JWT_SECRET` is a random 64-char hex string.
- [ ] `BLOCKCHAIN_PRIVATE_KEY` file permissions: `chmod 600 ~/credential-chain/backend/.env`.
- [ ] Demo accounts (`Admin@123`, `Institution@123`, `Student@123`) — change or
      leave, but say so in the presentation; don't leave default creds on anything
      real.

## Rough cost

| Resource | Free tier | Else |
| --- | --- | --- |
| EC2 t3.micro | $0 for 12 mo | ~$7.50/mo |
| EBS 8 GiB gp3 | free-ish | ~$0.65/mo |
| Data transfer | ~free at demo volume | pennies |

Well inside the Learner Lab credit for a demo that runs a few days.

---

*Keep private keys and RPC credentials out of git. The only secret that can sign
transactions is `BLOCKCHAIN_PRIVATE_KEY` — treat it accordingly.*
