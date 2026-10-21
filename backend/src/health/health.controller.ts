import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "../prisma/prisma.service";
import { BlockchainService } from "../blockchain/blockchain.service";

@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService
  ) {}

  @Get()
  async check() {
    let database = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = true;
    } catch {
      database = false;
    }

    const blockchain = this.blockchain.isReady();

    return {
      status: database && blockchain ? "ok" : "degraded",
      database,
      blockchain,
      network: this.blockchain.getNetworkLabel(),
      contractAddress: this.blockchain.getContractAddress(),
      timestamp: new Date().toISOString(),
    };
  }
}
