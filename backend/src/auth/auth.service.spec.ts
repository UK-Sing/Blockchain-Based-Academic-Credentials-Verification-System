import { Test } from "@nestjs/testing";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: any;
  let jwt: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      admin: { findUnique: jest.fn().mockResolvedValue(null) },
      institution: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue("signed.jwt.token") };

    const moduleRef = await Test.createTestingModule({
      providers: [AuthService, { provide: PrismaService, useValue: prisma }, { provide: JwtService, useValue: jwt }],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it("rejects login for an unknown email", async () => {
    await expect(service.login({ email: "nobody@demo.edu", password: "whatever1" })).rejects.toThrow(UnauthorizedException);
  });

  it("rejects login with a wrong password", async () => {
    prisma.admin.findUnique.mockResolvedValue({ id: "1", email: "admin@demo.edu", passwordHash: await bcrypt.hash("correct-password", 10) });
    await expect(service.login({ email: "admin@demo.edu", password: "wrong-password" })).rejects.toThrow(UnauthorizedException);
  });

  it("signs in a maintainer with the ADMIN role", async () => {
    prisma.admin.findUnique.mockResolvedValue({
      id: "a1",
      name: "Maintainer",
      email: "admin@demo.edu",
      passwordHash: await bcrypt.hash("correct-password", 10),
    });

    const result = await service.login({ email: "Admin@Demo.edu", password: "correct-password" });

    expect(prisma.admin.findUnique).toHaveBeenCalledWith({ where: { email: "admin@demo.edu" } });
    expect(result.user).toMatchObject({ id: "a1", role: "ADMIN" });
    expect(jwt.signAsync).toHaveBeenCalledWith(expect.objectContaining({ sub: "a1", role: "ADMIN" }));
  });

  it("signs in an institution from the same endpoint with the INSTITUTION role and its status", async () => {
    prisma.institution.findUnique.mockResolvedValue({
      id: "i1",
      name: "Demo University",
      email: "registrar@demo.edu",
      passwordHash: await bcrypt.hash("correct-password", 10),
      status: "PENDING",
      statusReason: null,
      trustLevel: "UNVERIFIED",
    });

    const result = await service.login({ email: "registrar@demo.edu", password: "correct-password" });

    expect(result.user).toMatchObject({ id: "i1", role: "INSTITUTION", status: "PENDING", trustLevel: "UNVERIFIED" });
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("registers new institutions as PENDING (no status accepted from the client)", async () => {
    prisma.institution.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: "i2", status: "PENDING", trustLevel: "UNVERIFIED", statusReason: null, ...data })
    );

    const result = await service.registerInstitution({
      name: "  New College ",
      email: "Office@NewCollege.edu",
      password: "Institution@123",
      contactName: "Registrar",
    });

    const data = prisma.institution.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("status");
    expect(data.email).toBe("office@newcollege.edu");
    expect(data.name).toBe("New College");
    expect(result.user).toMatchObject({ role: "INSTITUTION", status: "PENDING" });
  });

  it("rejects registering an institution name that already exists", async () => {
    prisma.institution.findFirst.mockResolvedValue({ id: "i1", name: "Demo University" });
    await expect(
      service.registerInstitution({ name: "demo university", email: "x@y.edu", password: "Institution@123", contactName: "R" })
    ).rejects.toThrow(ConflictException);
  });
});
