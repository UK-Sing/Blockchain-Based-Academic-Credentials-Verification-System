import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min, MinLength } from "class-validator";

export class RegisterStudentDto {
  @IsString() @IsNotEmpty()
  @Matches(/^[A-Za-z0-9-]+$/, { message: "Student ID may only contain letters, numbers and hyphens." })
  studentId!: string;

  @IsString() @IsNotEmpty()
  name!: string;

  @IsEmail({}, { message: "Please provide a valid email address." })
  email!: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsString() @IsNotEmpty()
  department!: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  batchYear!: number;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters." })
  password!: string;
}
