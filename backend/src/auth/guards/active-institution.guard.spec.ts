import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { ActiveInstitutionGuard } from "./active-institution.guard";

function run(user: { id: string; role: string } | undefined, status?: string) {
  const prisma: any = { institution: { findUnique: jest.fn().mockResolvedValue(status ? { status } : null) } };
  const ctx = { switchToHttp: () => ({ getRequest: () => ({ user }) }) } as unknown as ExecutionContext;
  return new ActiveInstitutionGuard(prisma).canActivate(ctx);
}

describe("ActiveInstitutionGuard", () => {
  it("allows an ACTIVE institution", async () => {
    await expect(run({ id: "i1", role: "INSTITUTION" }, "ACTIVE")).resolves.toBe(true);
  });

  it.each(["PENDING", "SUSPENDED", "REJECTED"])("blocks a %s institution", async (status) => {
    await expect(run({ id: "i1", role: "INSTITUTION" }, status)).rejects.toThrow(ForbiddenException);
  });

  it("blocks platform maintainers from issuing or revoking", async () => {
    await expect(run({ id: "a1", role: "ADMIN" }, "ACTIVE")).rejects.toThrow("Only issuing institutions");
  });

  it("blocks students", async () => {
    await expect(run({ id: "s1", role: "STUDENT" })).rejects.toThrow(ForbiddenException);
  });
});
