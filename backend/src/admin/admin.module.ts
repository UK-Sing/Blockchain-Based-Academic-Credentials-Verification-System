import { Module } from "@nestjs/common";
import { BlockchainModule } from "../blockchain/blockchain.module";
import { CredentialsModule } from "../credentials/credentials.module";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";

@Module({
  imports: [BlockchainModule, CredentialsModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
