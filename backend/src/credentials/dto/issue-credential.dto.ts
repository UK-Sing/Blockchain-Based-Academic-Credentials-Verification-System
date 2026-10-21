import { IsInt, IsNotEmpty, IsString, Max, Min } from "class-validator";

export class IssueCredentialDto {
  @IsString() @IsNotEmpty()
  studentName!: string;

  @IsString() @IsNotEmpty()
  studentId!: string;

  @IsString() @IsNotEmpty()
  degree!: string;

  @IsString() @IsNotEmpty()
  course!: string;

  @IsString() @IsNotEmpty()
  department!: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  graduationYear!: number;

  @IsString() @IsNotEmpty()
  issueDate!: string; // ISO date string from the form

  @IsString() @IsNotEmpty()
  grade!: string;
}
