import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { BlockchainService, OnChainCredential } from "../blockchain/blockchain.service";
import { IssueCredentialDto } from "./dto/issue-credential.dto";
import { RevokeCredentialDto } from "./dto/revoke-credential.dto";
import { ListCredentialsQueryDto } from "./dto/list-credentials-query.dto";
import { canonicalizeCredential } from "./credential-hash.util";

/** Public facts about the issuer shown to verifiers. Never includes credentials or contact secrets. */
const ISSUER_SELECT = { select: { id: true, name: true, status: true, trustLevel: true, website: true } } as const;

@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService
  ) {}

  /** Generates a unique sequential ID like CRED-2026-000001, retrying on rare races. */
  private async generateCredentialId(year: number): Promise<string> {
    const prefix = `CRED-${year}-`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const count = await this.prisma.credential.count({
        where: { credentialId: { startsWith: prefix } },
      });
      const candidate = `${prefix}${String(count + 1 + attempt).padStart(6, "0")}`;
      const clash = await this.prisma.credential.findUnique({ where: { credentialId: candidate } });
      if (!clash) return candidate;
    }
    throw new ConflictException("Could not generate a unique credential ID. Please retry.");
  }

  /** Loads a credential only if it belongs to the given institution (404 otherwise, so IDs don't leak). */
  private async findOwnedOrThrow(credentialId: string, institutionId: string) {
    const credential = await this.prisma.credential.findFirst({
      where: { credentialId, institutionId },
      include: { revocation: true },
    });
    if (!credential) throw new NotFoundException("Credential not found.");
    return credential;
  }

  async issue(dto: IssueCredentialDto, institutionId: string) {
    const issueDate = new Date(dto.issueDate);
    if (isNaN(issueDate.getTime())) {
      throw new BadRequestException("Invalid issue date.");
    }

    // The university name always comes from the institution's registered account, so an
    // institution can't issue credentials in another university's name.
    const institution = await this.prisma.institution.findUniqueOrThrow({ where: { id: institutionId } });
    const universityName = institution.name;

    const year = new Date().getFullYear();
    const credentialId = await this.generateCredentialId(year);

    const canonical = canonicalizeCredential({
      credentialId,
      studentName: dto.studentName,
      studentId: dto.studentId,
      universityName,
      degree: dto.degree,
      course: dto.course,
      department: dto.department,
      graduationYear: dto.graduationYear,
      issueDate: issueDate.toISOString(),
      grade: dto.grade,
    });

    const credentialHash = this.blockchain.computeHash(canonical);

    // 1. Save the full record off-chain first (source of truth for content).
    let credential;
    try {
      credential = await this.prisma.credential.create({
        data: {
          credentialId,
          studentName: dto.studentName,
          studentId: dto.studentId,
          universityName,
          degree: dto.degree,
          course: dto.course,
          department: dto.department,
          graduationYear: dto.graduationYear,
          issueDate,
          grade: dto.grade,
          credentialHash,
          status: "VALID",
          institutionId,
        },
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        throw new ConflictException("A credential with this ID already exists. Please retry.");
      }
      throw err;
    }

    // 2. Anchor the hash on-chain.
    try {
      const chainResult = await this.blockchain.issueCredential(credentialId, credentialHash);
      credential = await this.prisma.credential.update({
        where: { credentialId },
        data: {
          blockchainTxHash: chainResult.txHash,
          blockchainCredentialId: credentialId,
          blockNumber: chainResult.blockNumber,
          contractAddress: chainResult.contractAddress,
          network: chainResult.network,
        },
      });
    } catch (err: any) {
      this.logger.error(`Blockchain anchoring failed for ${credentialId}: ${err.message}`);
      // The DB record exists but isn't anchored yet - surface this clearly
      // rather than silently pretending it succeeded.
      throw new BadRequestException(
        `Credential ${credentialId} was saved to the database, but the blockchain transaction failed: ${err.message}. ` +
          `Once the blockchain connection is restored, open the credential and use "Retry blockchain anchor".`
      );
    }

    return credential;
  }

  async retryAnchor(credentialId: string, institutionId: string) {
    const credential = await this.findOwnedOrThrow(credentialId, institutionId);
    if (credential.blockchainTxHash) return credential; // already anchored

    const chainResult = await this.blockchain.issueCredential(credentialId, credential.credentialHash);
    return this.prisma.credential.update({
      where: { credentialId },
      data: {
        blockchainTxHash: chainResult.txHash,
        blockchainCredentialId: credentialId,
        blockNumber: chainResult.blockNumber,
        contractAddress: chainResult.contractAddress,
        network: chainResult.network,
      },
      include: { revocation: true },
    });
  }

  async list(query: ListCredentialsQueryDto, institutionId: string) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where: Prisma.CredentialWhereInput = { institutionId };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { credentialId: { contains: query.search, mode: "insensitive" } },
        { studentName: { contains: query.search, mode: "insensitive" } },
        { studentId: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.credential.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { revocation: true },
      }),
      this.prisma.credential.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getStats(institutionId: string) {
    const where = { institutionId };
    const [total, valid, revoked, recent] = await Promise.all([
      this.prisma.credential.count({ where }),
      this.prisma.credential.count({ where: { ...where, status: "VALID" } }),
      this.prisma.credential.count({ where: { ...where, status: "REVOKED" } }),
      this.prisma.credential.findMany({ where, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

    return {
      totalCredentials: total,
      validCredentials: valid,
      revokedCredentials: revoked,
      recentCredentials: recent,
      network: this.blockchain.getNetworkLabel(),
      blockchainConnected: this.blockchain.isReady(),
      contractAddress: this.blockchain.getContractAddress(),
    };
  }

  /**
   * Aggregates for the analytics dashboards. Scoped to one institution when an ID is given,
   * platform-wide (maintainer view) otherwise. Returns counts only, no student records.
   */
  async getAnalytics(institutionId?: string) {
    const where: Prisma.CredentialWhereInput = institutionId ? { institutionId } : {};
    const since = new Date();
    since.setUTCDate(1);
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCMonth(since.getUTCMonth() - 11);

    const [byStatus, byDegree, byDepartment, byYear, anchored, totalStudents, recent] = await Promise.all([
      this.prisma.credential.groupBy({ by: ["status"], where, _count: { _all: true } }),
      this.prisma.credential.groupBy({ by: ["degree"], where, _count: { _all: true } }),
      this.prisma.credential.groupBy({ by: ["department"], where, _count: { _all: true } }),
      this.prisma.credential.groupBy({ by: ["graduationYear"], where, _count: { _all: true }, orderBy: { graduationYear: "asc" } }),
      this.prisma.credential.count({ where: { ...where, blockchainTxHash: { not: null } } }),
      this.prisma.student.count({ where: institutionId ? { institutionId } : {} }),
      this.prisma.credential.findMany({ where: { ...where, createdAt: { gte: since } }, select: { createdAt: true } }),
    ]);

    const months: { month: string; count: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(since);
      d.setUTCMonth(since.getUTCMonth() + i);
      months.push({ month: d.toISOString().slice(0, 7), count: 0 });
    }
    const monthIndex = new Map(months.map((m, i) => [m.month, i]));
    for (const { createdAt } of recent) {
      const i = monthIndex.get(createdAt.toISOString().slice(0, 7));
      if (i !== undefined) months[i].count++;
    }

    const toBuckets = <K extends string>(rows: ({ _count: { _all: number } } & Record<K, unknown>)[], key: K) =>
      rows
        .map((r) => ({ label: String(r[key]), count: r._count._all }))
        .sort((a, b) => b.count - a.count);

    const total = byStatus.reduce((sum, r) => sum + r._count._all, 0);

    return {
      totalCredentials: total,
      totalStudents,
      anchoredCredentials: anchored,
      pendingAnchor: total - anchored,
      byStatus: toBuckets(byStatus, "status"),
      byDegree: toBuckets(byDegree, "degree"),
      byDepartment: toBuckets(byDepartment, "department"),
      byGraduationYear: byYear.map((r) => ({ label: String(r.graduationYear), count: r._count._all })),
      issuedPerMonth: months,
    };
  }

  /** Full record for the owning institution's console. */
  findOwned(credentialId: string, institutionId: string) {
    return this.findOwnedOrThrow(credentialId, institutionId);
  }

  /** Public, shareable view of a credential, with the issuer's public profile. */
  async findPublic(credentialId: string) {
    const credential = await this.prisma.credential.findUnique({
      where: { credentialId },
      include: { revocation: true, institution: ISSUER_SELECT },
    });
    if (!credential) throw new NotFoundException("Credential not found.");
    return credential;
  }

  /**
   * Core verification logic used by the public verifier.
   * Cross-checks the database record against the on-chain record:
   * - NOT_FOUND if the credential doesn't exist in the database at all.
   * - REVOKED if either the DB or the chain marks it revoked.
   * - VALID only if it exists, is not revoked, AND the recalculated hash
   *   matches what's stored on-chain (tamper detection).
   * The issuer's status and trust level are returned alongside so verifiers can judge the source.
   */
  async verify(credentialId: string) {
    const credential = await this.prisma.credential.findUnique({
      where: { credentialId },
      include: { revocation: true, institution: ISSUER_SELECT },
    });

    if (!credential) {
      return { status: "NOT_FOUND" as const };
    }

    const issuer = credential.institution
      ? {
          name: credential.institution.name,
          status: credential.institution.status,
          trustLevel: credential.institution.trustLevel,
          website: credential.institution.website,
        }
      : null;

    const recalculatedCanonical = canonicalizeCredential({
      credentialId: credential.credentialId,
      studentName: credential.studentName,
      studentId: credential.studentId,
      universityName: credential.universityName,
      degree: credential.degree,
      course: credential.course,
      department: credential.department,
      graduationYear: credential.graduationYear,
      issueDate: credential.issueDate.toISOString(),
      grade: credential.grade,
    });
    const recalculatedHash = this.blockchain.computeHash(recalculatedCanonical);
    const hashMatchesDb = recalculatedHash === credential.credentialHash;

    let onChain: OnChainCredential | null = null;
    let blockchainReachable = true;
    try {
      onChain = await this.blockchain.verifyCredential(credentialId);
    } catch (err) {
      blockchainReachable = false;
      this.logger.warn(`Blockchain unreachable during verification of ${credentialId}`);
    }

    const isRevoked = credential.status === "REVOKED" || !!onChain?.isRevoked;

    if (isRevoked) {
      return {
        status: "REVOKED" as const,
        credentialId: credential.credentialId,
        reason: credential.revocation?.reason ?? onChain?.revocationReason ?? "No reason on record.",
        revokedAt: credential.revocation?.revokedAt ?? null,
        blockchainTxHash: credential.revocation?.blockchainTxHash ?? null,
        issuer,
      };
    }

    const onChainHashMatches = onChain?.exists
      ? onChain.credentialHash.toLowerCase() === credential.credentialHash.toLowerCase()
      : null;

    return {
      status: "VALID" as const,
      credential: {
        credentialId: credential.credentialId,
        studentName: credential.studentName,
        degree: credential.degree,
        universityName: credential.universityName,
        course: credential.course,
        department: credential.department,
        issueDate: credential.issueDate,
        grade: credential.grade,
      },
      blockchainTxHash: credential.blockchainTxHash,
      network: credential.network,
      contractAddress: credential.contractAddress,
      issuer,
      integrity: {
        hashMatchesDatabase: hashMatchesDb,
        blockchainReachable,
        onChainRecordFound: !!onChain?.exists,
        onChainHashMatches,
      },
    };
  }

  async revoke(credentialId: string, dto: RevokeCredentialDto, institutionId: string) {
    const credential = await this.findOwnedOrThrow(credentialId, institutionId);
    if (credential.status === "REVOKED") {
      throw new ConflictException("This credential has already been revoked.");
    }

    const chainResult = await this.blockchain.revokeCredential(credentialId, dto.reason);

    await this.prisma.$transaction([
      this.prisma.credential.update({
        where: { credentialId },
        data: { status: "REVOKED" },
      }),
      this.prisma.revocation.create({
        data: {
          credentialId,
          reason: dto.reason,
          blockchainTxHash: chainResult.txHash,
          blockNumber: chainResult.blockNumber,
        },
      }),
    ]);

    return this.findOwnedOrThrow(credentialId, institutionId);
  }
}
