import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const BLOCKED_MESSAGES: Record<string, string> = {
  PENDING: "Your institution is awaiting approval by the platform maintainers. You can issue credentials once it is approved.",
  SUSPENDED: "Your institution has been suspended by the platform maintainers and cannot issue, revoke or register students.",
  REJECTED: "Your institution's registration was rejected by the platform maintainers.",
};

/**
 * Write actions (issue, revoke, register students) require an INSTITUTION token whose
 * institution is currently ACTIVE. Status is read from the database on every request,
 * so a suspension takes effect immediately rather than when the JWT expires.
 * Must run after JwtAuthGuard.
 */
@Injectable()
export class ActiveInstitutionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();
    if (user?.role !== "INSTITUTION") {
      throw new ForbiddenException("Only issuing institutions can perform this action.");
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id: user.id },
      select: { status: true },
    });
    if (!institution) throw new ForbiddenException("Institution account not found.");
    if (institution.status !== "ACTIVE") {
      throw new ForbiddenException(BLOCKED_MESSAGES[institution.status]);
    }
    return true;
  }
}
