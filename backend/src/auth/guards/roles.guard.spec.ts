import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

function contextFor(role: string | undefined, required: string[] | undefined) {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
  const ctx = {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { id: "u1", role } : undefined }) }),
  } as unknown as ExecutionContext;
  return { guard: new RolesGuard(reflector), ctx };
}

describe("RolesGuard", () => {
  it("lets an ADMIN through an ADMIN-only route", () => {
    const { guard, ctx } = contextFor("ADMIN", ["ADMIN"]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("blocks a STUDENT token from an ADMIN-only route", () => {
    const { guard, ctx } = contextFor("STUDENT", ["ADMIN"]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("blocks an ADMIN token from a STUDENT-only route", () => {
    const { guard, ctx } = contextFor("ADMIN", ["STUDENT"]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
