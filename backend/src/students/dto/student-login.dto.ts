import { IsNotEmpty, IsString } from "class-validator";

export class StudentLoginDto {
  @IsString() @IsNotEmpty()
  studentId!: string;

  @IsString() @IsNotEmpty()
  password!: string;
}
