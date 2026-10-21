import { Module } from "@nestjs/common";
import { CredentialsService } from "./credentials.service";
import { CredentialsController } from "./credentials.controller";
import { BlockchainModule } from "../blockchain/blockchain.module";

@Module({
  imports: [BlockchainModule],
  providers: [CredentialsService],
  controllers: [CredentialsController],
  exports: [CredentialsService],
})
export class CredentialsModule {}
