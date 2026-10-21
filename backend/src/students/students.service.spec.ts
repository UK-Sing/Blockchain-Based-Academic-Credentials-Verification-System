import { Test } from "@nestjs/testing";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { StudentsService } from "./students.service";
import { PrismaService } from "../prisma/prisma.service";

describe("StudentsService", () => {
  let service: StudentsService;
  let prisma: any;
  let jwt: { signAsync: jest.Mock };

  const dto = {
    studentId: "stu2026010",
    name: "Test Student",
    email: "Test.Student@Demo.edu",
    department: "Computer Science",
    batchYear: 2026,
    password: "Student@123",
  };

  beforeEach(async () => {
    prisma = {
      student: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
      credential: { findMany: jest.fn() },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue("student.jwt") };

    const moduleRef = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = moduleRef.get(StudentsService);
  });

  it("normalises IDs/emails, hashes the password and never returns the hash", async () => {
    prisma.student.findFirst.mockResolvedValue(null);
    prisma.student.create.mockImplementation(({ data }: any) => Promise.resolve({ id: "s1", createdAt: new Date(), ...data }));

    const result = await service.register(dto, "inst-a");
    const saved = prisma.student.create.mock.calls[0][0].data;

    expect(saved.studentId).toBe("STU2026010");
    expect(saved.email).toBe("test.student@demo.edu");
    expect(await bcrypt.compare("Student@123", saved.passwordHash)).toBe(true);
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("rejects a duplicate student ID", async () => {
    prisma.student.findFirst.mockResolvedValue({ studentId: "STU2026010", email: "other@demo.edu" });
    await expect(service.register(dto, "inst-a")).rejects.toThrow(ConflictException);
  });

  it("rejects login for an unknown student or wrong password with the same error", async () => {
    prisma.student.findUnique.mockResolvedValueOnce(null);
    await expect(service.login({ studentId: "STU404", password: "x" })).rejects.toThrow(UnauthorizedException);

    prisma.student.findUnique.mockResolvedValueOnce({ passwordHash: await bcrypt.hash("right-pass", 10) });
    await expect(service.login({ studentId: "STU1", password: "wrong-pass" })).rejects.toThrow(UnauthorizedException);
  });

  it("issues a STUDENT-role token on valid login", async () => {
    prisma.student.findUnique.mockResolvedValue({
      id: "s1",
      studentId: "STU2026001",
      email: "s@demo.edu",
      passwordHash: await bcrypt.hash("Student@123", 10),
    });

    const result = await service.login({ studentId: "stu2026001", password: "Student@123" });

    expect(prisma.student.findUnique).toHaveBeenCalledWith({ where: { studentId: "STU2026001" } });
    expect(jwt.signAsync).toHaveBeenCalledWith(expect.objectContaining({ sub: "s1", role: "STUDENT" }));
    expect(result.accessToken).toBe("student.jwt");
    expect(result.student).not.toHaveProperty("passwordHash");
  });
});
