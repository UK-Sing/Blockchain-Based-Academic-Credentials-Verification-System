import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateInstitutionStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED", "REJECTED"], { message: "Status must be ACTIVE, SUSPENDED or REJECTED." })
  status!: "ACTIVE" | "SUSPENDED" | "REJECTED";

  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class UpdateInstitutionTrustDto {
  @IsIn(["UNVERIFIED", "VERIFIED", "ACCREDITED"], { message: "Trust level must be UNVERIFIED, VERIFIED or ACCREDITED." })
  trustLevel!: "UNVERIFIED" | "VERIFIED" | "ACCREDITED";
}

export class ListInstitutionsQueryDto {
  @IsOptional()
  @IsIn(["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"])
  status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";

  @IsOptional() @IsString()
  search?: string;
}
