import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class RevokeCredentialDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: "Please provide a meaningful revocation reason." })
  reason!: string;
}
