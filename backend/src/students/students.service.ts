import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Student } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterStudentDto } from "./dto/register-student.dto";
import { StudentLoginDto } from "./dto/student-login.dto";
import { ListStudentsQueryDto } from "./dto/list-students-query.dto";

export type PublicStudent = Omit<Student, "passwordHash">;

function toPublic({ passwordHash: _omit, ...student }: Student): PublicStudent {
  return student;
}

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async register(dto: RegisterStudentDto, institutionId: string): Promise<PublicStudent> {
    const studentId = dto.studentId.trim().toUpperCase();
    const email = dto.email.trim().toLowerCase();

    const clash = await this.prisma.student.findFirst({
      where: { OR: [{ studentId }, { email }] },
    });
    if (clash) {
      throw new ConflictException(
        clash.studentId === studentId
          ? `A student with ID ${studentId} is already registered.`
          : `A student with email ${email} is already registered.`
      );
    }

    const student = await this.prisma.student.create({
      data: {
        studentId,
        name: dto.name.trim(),
        email,
        phone: dto.phone?.trim() || null,
        department: dto.department.trim(),
        batchYear: dto.batchYear,
        passwordHash: await bcrypt.hash(dto.password, 10),
        institutionId,
      },
    });
    return toPublic(student);
  }

  /** Students registered by this institution only. */
  async list(query: ListStudentsQueryDto, institutionId: string) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      institutionId,
      ...(query.search && {
        OR: [
          { studentId: { contains: query.search, mode: "insensitive" as const } },
          { name: { contains: query.search, mode: "insensitive" as const } },
          { email: { contains: query.search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.student.count({ where }),
    ]);

    const counts = await this.prisma.credential.groupBy({
      by: ["studentId"],
      where: { institutionId, studentId: { in: students.map((s) => s.studentId) } },
      _count: { _all: true },
    });
    const countByStudent = new Map(counts.map((c) => [c.studentId, c._count._all]));

    return {
      items: students.map((s) => ({ ...toPublic(s), credentialCount: countByStudent.get(s.studentId) ?? 0 })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByStudentId(studentId: string, institutionId: string): Promise<PublicStudent> {
    const student = await this.prisma.student.findFirst({
      where: { studentId: studentId.trim().toUpperCase(), institutionId },
    });
    if (!student) throw new NotFoundException("Student not found.");
    return toPublic(student);
  }

  async login(dto: StudentLoginDto) {
    const student = await this.prisma.student.findUnique({
      where: { studentId: dto.studentId.trim().toUpperCase() },
    });

    // Same message for unknown ID and wrong password, so IDs can't be enumerated.
    if (!student || !(await bcrypt.compare(dto.password, student.passwordHash))) {
      throw new UnauthorizedException("Invalid student ID or password.");
    }

    const accessToken = await this.jwt.signAsync({ sub: student.id, email: student.email, role: "STUDENT" });
    return { accessToken, student: toPublic(student) };
  }

  async me(id: string): Promise<PublicStudent> {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new UnauthorizedException();
    return toPublic(student);
  }

  async myCredentials(id: string) {
    const student = await this.me(id);
    return this.prisma.credential.findMany({
      where: { studentId: { equals: student.studentId, mode: "insensitive" } },
      orderBy: { issueDate: "desc" },
      include: { revocation: true, institution: { select: { name: true, status: true, trustLevel: true } } },
    });
  }
}
