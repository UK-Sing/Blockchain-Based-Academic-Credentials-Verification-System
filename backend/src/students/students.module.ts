import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StudentsService } from "./students.service";
import { StudentsController } from "./students.controller";

@Module({
  imports: [AuthModule],
  providers: [StudentsService],
  controllers: [StudentsController],
})
export class StudentsModule {}
