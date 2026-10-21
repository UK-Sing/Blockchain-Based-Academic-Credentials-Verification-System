import { Module } from "@nestjs/common";
import { BlockchainModule } from "../blockchain/blockchain.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [BlockchainModule],
  controllers: [HealthController],
})
export class HealthModule {}
