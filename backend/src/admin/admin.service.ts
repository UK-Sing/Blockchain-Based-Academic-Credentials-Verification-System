import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Institution, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { BlockchainService } from "../blockchain/blockchain.service";
import { CredentialsService } from "../credentials/credentials.service";
import { ListInstitutionsQueryDto, UpdateInstitutionStatusDto, UpdateInstitutionTrustDto } from "./dto/update-institution.dto";

const STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"] as const;

function publicInstitution({ passwordHash: _omit, ...rest }: Institution) {
  return rest;
}

/**
 * Platform maintainer operations. Deliberately limited to observation and institution
 * moderation: nothing here can create, change, revoke or read individual credential records.
 */
@Injectable()
export class AdminService {
  private readonly startedAt = new Date();

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
    private readonly credentials: CredentialsService
  ) {}

  async overview() {
    const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [chain, database, institutionsByStatus, total, revoked, anchored, issuedLast30Days, students, recent] =
      await Promise.all([
        this.blockchain.getChainStatus(),
        this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
        this.prisma.institution.groupBy({ by: ["status"], _count: { _all: true } }),
        this.prisma.credential.count(),
        this.prisma.credential.count({ where: { status: "REVOKED" } }),
        this.prisma.credential.count({ where: { blockchainTxHash: { not: null } } }),
        this.prisma.credential.count({ where: { createdAt: { gte: last30 } } }),
        this.prisma.student.count(),
        // Activity feed for maintainers: which institution anchored what, without student details.
        this.prisma.credential.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            credentialId: true,
            status: true,
            blockchainTxHash: true,
            createdAt: true,
            institution: { select: { name: true } },
          },
        }),
      ]);

    const institutions = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<(typeof STATUSES)[number], number>;
    for (const row of institutionsByStatus) institutions[row.status] = row._count._all;

    const memory = process.memoryUsage();
    return {
      health: {
        status: database && chain.reachable ? "ok" : "degraded",
        database,
        blockchain: chain.reachable,
        uptimeSeconds: Math.round((Date.now() - this.startedAt.getTime()) / 1000),
        startedAt: this.startedAt,
        nodeVersion: process.version,
        memoryMb: Math.round(memory.rss / 1024 / 1024),
      },
      chain,
      stats: {
        institutions: { total: Object.values(institutions).reduce((a, b) => a + b, 0), ...institutions },
        credentials: {
          total,
          valid: total - revoked,
          revoked,
          anchored,
          pendingAnchor: total - anchored,
          issuedLast30Days,
        },
        students,
      },
      recentActivity: recent.map((c) => ({
        credentialId: c.credentialId,
        institution: c.institution?.name ?? null,
        status: c.status,
        anchored: !!c.blockchainTxHash,
        blockchainTxHash: c.blockchainTxHash,
        createdAt: c.createdAt,
      })),
    };
  }

  analytics() {
    return this.credentials.getAnalytics();
  }

  async listInstitutions(query: ListInstitutionsQueryDto) {
    const where: Prisma.InstitutionWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { registrationNumber: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const institutions = await this.prisma.institution.findMany({
      where,
      // Pending applications first so they get reviewed, then newest.
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    const ids = institutions.map((i) => i.id);

    const [byStatus, unanchored, students, lastIssued] = await Promise.all([
      this.prisma.credential.groupBy({ by: ["institutionId", "status"], where: { institutionId: { in: ids } }, _count: { _all: true } }),
      this.prisma.credential.groupBy({ by: ["institutionId"], where: { institutionId: { in: ids }, blockchainTxHash: null }, _count: { _all: true } }),
      this.prisma.student.groupBy({ by: ["institutionId"], where: { institutionId: { in: ids } }, _count: { _all: true } }),
      this.prisma.credential.groupBy({ by: ["institutionId"], where: { institutionId: { in: ids } }, _max: { createdAt: true } }),
    ]);

    return institutions.map((i) => {
      const valid = byStatus.find((r) => r.institutionId === i.id && r.status === "VALID")?._count._all ?? 0;
      const revoked = byStatus.find((r) => r.institutionId === i.id && r.status === "REVOKED")?._count._all ?? 0;
      return {
        ...publicInstitution(i),
        activity: {
          credentials: valid + revoked,
          revoked,
          pendingAnchor: unanchored.find((r) => r.institutionId === i.id)?._count._all ?? 0,
          students: students.find((r) => r.institutionId === i.id)?._count._all ?? 0,
          lastIssuedAt: lastIssued.find((r) => r.institutionId === i.id)?._max.createdAt ?? null,
        },
      };
    });
  }

  async updateStatus(id: string, dto: UpdateInstitutionStatusDto) {
    await this.findOrThrow(id);
    const reason = dto.reason?.trim() || null;
    if (dto.status !== "ACTIVE" && !reason) {
      throw new BadRequestException("A reason is required when suspending or rejecting an institution.");
    }
    const updated = await this.prisma.institution.update({
      where: { id },
      data: { status: dto.status, statusReason: reason, reviewedAt: new Date() },
    });
    return publicInstitution(updated);
  }

  async updateTrust(id: string, dto: UpdateInstitutionTrustDto) {
    await this.findOrThrow(id);
    const updated = await this.prisma.institution.update({ where: { id }, data: { trustLevel: dto.trustLevel } });
    return publicInstitution(updated);
  }

  private async findOrThrow(id: string) {
    const institution = await this.prisma.institution.findUnique({ where: { id } });
    if (!institution) throw new NotFoundException("Institution not found.");
    return institution;
  }
}
