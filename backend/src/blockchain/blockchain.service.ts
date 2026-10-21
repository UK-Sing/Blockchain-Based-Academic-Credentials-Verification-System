import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

export interface OnChainCredential {
  exists: boolean;
  credentialHash: string;
  issuer: string;
  issueTimestamp: number;
  isRevoked: boolean;
  revocationTimestamp: number;
  revocationReason: string;
}

export interface ChainTxResult {
  txHash: string;
  blockNumber: number;
  contractAddress: string;
  network: string;
}

/**
 * Wraps all on-chain interaction behind a single service so the rest of the
 * backend never touches ethers.js or private keys directly.
 *
 * The contract ABI + address are loaded from
 * src/blockchain/generated/CredentialRegistry.json, which is written
 * automatically by `scripts/deploy.ts` at the repo root (`pnpm run deploy:local`). If CONTRACT_ADDRESS is
 * set in .env it overrides the generated address (useful when pointing at
 * Polygon Amoy).
 */
@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider!: ethers.JsonRpcProvider;
  private wallet!: ethers.NonceManager;
  private contract!: ethers.Contract;
  private networkLabel = "Unknown";
  private contractAddress = "";
  private ready = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    try {
      const rpcUrl = this.config.get<string>("RPC_URL") || "http://127.0.0.1:8545";
      const privateKey = this.config.get<string>("BLOCKCHAIN_PRIVATE_KEY");
      const envAddress = this.config.get<string>("CONTRACT_ADDRESS");
      this.networkLabel = this.config.get<string>("NETWORK_LABEL") || "Hardhat Local";

      if (!privateKey) {
        this.logger.warn("BLOCKCHAIN_PRIVATE_KEY not set - blockchain features disabled.");
        return;
      }

      const generatedPath = path.join(__dirname, "generated/CredentialRegistry.json");
      let abi: any;
      let deployedAddress = envAddress;

      if (fs.existsSync(generatedPath)) {
        const deployment = JSON.parse(fs.readFileSync(generatedPath, "utf-8"));
        abi = deployment.abi;
        if (!deployedAddress) deployedAddress = deployment.address;
      } else {
        this.logger.warn(
          "No generated contract artifact found. Run `pnpm run deploy:local` from the repo root first."
        );
        return;
      }

      if (!deployedAddress) {
        this.logger.warn("No CONTRACT_ADDRESS configured and no deployment artifact address found.");
        return;
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.NonceManager(new ethers.Wallet(privateKey, this.provider));
      this.contract = new ethers.Contract(deployedAddress, abi, this.wallet);
      this.contractAddress = deployedAddress;

      // Verify connectivity without throwing if the node isn't up yet.
      await this.provider.getBlockNumber();
      this.ready = true;
      this.logger.log(`Connected to blockchain (${this.networkLabel}) at ${rpcUrl}, contract ${deployedAddress}`);
    } catch (err: any) {
      this.ready = false;
      this.logger.warn(
        `Blockchain connection not available yet (${err.message}). The app will still run, but issue/revoke/verify chain calls will fail until a node is reachable.`
      );
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  getNetworkLabel(): string {
    return this.networkLabel;
  }

  getContractAddress(): string {
    return this.contractAddress;
  }

  private assertReady() {
    if (!this.ready) {
      throw new InternalServerErrorException(
        "Blockchain network is not reachable. Start the local Hardhat node and deploy the contract, then retry."
      );
    }
  }

  async issueCredential(credentialId: string, credentialHash: string): Promise<ChainTxResult> {
    this.assertReady();
    try {
      const tx = await this.contract.issueCredential(credentialId, credentialHash);
      const receipt = await tx.wait();
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        contractAddress: this.contractAddress,
        network: this.networkLabel,
      };
    } catch (err: any) {
      this.logger.error(`On-chain issueCredential failed: ${err.message}`);
      throw new InternalServerErrorException(
        err.reason || "Blockchain transaction failed while issuing the credential."
      );
    }
  }

  async revokeCredential(credentialId: string, reason: string): Promise<ChainTxResult> {
    this.assertReady();
    try {
      const tx = await this.contract.revokeCredential(credentialId, reason);
      const receipt = await tx.wait();
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        contractAddress: this.contractAddress,
        network: this.networkLabel,
      };
    } catch (err: any) {
      this.logger.error(`On-chain revokeCredential failed: ${err.message}`);
      throw new InternalServerErrorException(
        err.reason || "Blockchain transaction failed while revoking the credential."
      );
    }
  }

  async verifyCredential(credentialId: string): Promise<OnChainCredential> {
    this.assertReady();
    const result = await this.contract.verifyCredential(credentialId);
    return {
      exists: result[0],
      credentialHash: result[1],
      issuer: result[2],
      issueTimestamp: Number(result[3]),
      isRevoked: result[4],
      revocationTimestamp: Number(result[5]),
      revocationReason: result[6],
    };
  }

  /**
   * Read-only snapshot of the chain connection for the maintainer console. Every probe is
   * independent so one failing RPC call doesn't hide the rest. Never exposes the RPC URL
   * (it can embed an API key) or anything about the private key beyond its public address.
   */
  async getChainStatus() {
    const status = {
      configured: !!this.contract,
      reachable: false,
      network: this.networkLabel,
      chainId: null as number | null,
      latestBlock: null as number | null,
      contractAddress: this.contractAddress || null,
      contractDeployed: null as boolean | null,
      contractOwner: null as string | null,
      walletAddress: null as string | null,
      walletBalance: null as string | null,
      walletIsOwner: null as boolean | null,
      explorerUrl: null as string | null,
      error: null as string | null,
    };
    if (!this.contract) {
      status.error = "Blockchain is not configured (missing key, contract address or ABI).";
      return status;
    }

    const attempt = async <T>(fn: () => Promise<T>): Promise<T | null> => {
      try {
        return await fn();
      } catch (err: any) {
        status.error ??= err.shortMessage || err.message;
        return null;
      }
    };

    const [network, block, walletAddress, code] = await Promise.all([
      attempt(() => this.provider.getNetwork()),
      attempt(() => this.provider.getBlockNumber()),
      attempt(() => this.wallet.getAddress()),
      attempt(() => this.provider.getCode(this.contractAddress)),
    ]);
    status.reachable = block !== null;
    status.chainId = network ? Number(network.chainId) : null;
    status.latestBlock = block;
    status.walletAddress = walletAddress;
    status.contractDeployed = code === null ? null : code !== "0x";

    if (status.reachable) {
      const [balance, owner] = await Promise.all([
        walletAddress ? attempt(() => this.provider.getBalance(walletAddress)) : Promise.resolve(null),
        status.contractDeployed ? attempt(() => this.contract.owner() as Promise<string>) : Promise.resolve(null),
      ]);
      status.walletBalance = balance === null ? null : ethers.formatEther(balance);
      status.contractOwner = owner;
      status.walletIsOwner = owner && walletAddress ? owner.toLowerCase() === walletAddress.toLowerCase() : null;
    }
    if (status.chainId === 80002) status.explorerUrl = "https://amoy.polygonscan.com";
    else if (status.chainId === 137) status.explorerUrl = "https://polygonscan.com";

    return status;
  }

  computeHash(canonicalString: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(canonicalString));
  }
}
