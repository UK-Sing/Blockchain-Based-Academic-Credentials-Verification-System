import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class RegisterInstitutionDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  name!: string;

  @IsEmail({}, { message: "Please provide a valid email address." })
  email!: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters." })
  password!: string;

  @IsString() @IsNotEmpty()
  contactName!: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: "Website must be a full URL, e.g. https://example.edu" })
  website?: string;

  @IsOptional() @IsString()
  registrationNumber?: string;

  @IsOptional() @IsString()
  address?: string;
}
