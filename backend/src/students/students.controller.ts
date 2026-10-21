import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { StudentsService } from "./students.service";
import { RegisterStudentDto } from "./dto/register-student.dto";
import { StudentLoginDto } from "./dto/student-login.dto";
import { ListStudentsQueryDto } from "./dto/list-students-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { ActiveInstitutionGuard } from "../auth/guards/active-institution.guard";

@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // ---- Public ----

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: StudentLoginDto) {
    return this.studentsService.login(dto);
  }

  // ---- Student (own data only) ----

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("STUDENT")
  @Get("me")
  me(@Req() req: any) {
    return this.studentsService.me(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("STUDENT")
  @Get("me/credentials")
  myCredentials(@Req() req: any) {
    return this.studentsService.myCredentials(req.user.id);
  }

  // ---- Institution (own students only; maintainers have no access to student records) ----

  @UseGuards(JwtAuthGuard, ActiveInstitutionGuard)
  @Post()
  register(@Body() dto: RegisterStudentDto, @Req() req: any) {
    return this.studentsService.register(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("INSTITUTION")
  @Get()
  list(@Query() query: ListStudentsQueryDto, @Req() req: any) {
    return this.studentsService.list(query, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("INSTITUTION")
  @Get(":studentId")
  getOne(@Param("studentId") studentId: string, @Req() req: any) {
    return this.studentsService.findByStudentId(studentId, req.user.id);
  }
}
