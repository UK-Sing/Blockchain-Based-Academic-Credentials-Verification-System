import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Admin, Institution } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterInstitutionDto } from "./dto/register-institution.dto";

export type StaffRole = "ADMIN" | "INSTITUTION";

export interface StaffProfile {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status?: Institution["status"];
  statusReason?: string | null;
  trustLevel?: Institution["trustLevel"];
}

function adminProfile(a: Admin): StaffProfile {
  return { id: a.id, name: a.name, email: a.email, role: "ADMIN" };
}

function institutionProfile(i: Institution): StaffProfile {
  return {
    id: i.id,
    name: i.name,
    email: i.email,
    role: "INSTITUTION",
    status: i.status,
    statusReason: i.statusReason,
    trustLevel: i.trustLevel,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  /**
   * Single sign-in for platform maintainers (ADMIN) and issuing institutions.
   * The role is decided by which account the email belongs to, not by the page used.
   */
  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const [admin, institution] = await Promise.all([
      this.prisma.admin.findUnique({ where: { email } }),
      this.prisma.institution.findUnique({ where: { email } }),
    ]);

    const account = admin ?? institution;
    // Constant-shape error to avoid leaking whether the email exists.
    if (!account || !(await bcrypt.compare(dto.password, account.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const user = admin ? adminProfile(admin) : institutionProfile(institution as Institution);
    return this.issueToken(user);
  }

  /** Public self-registration. New institutions start PENDING until a maintainer approves them. */
  async registerInstitution(dto: RegisterInstitutionDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    const [emailTaken, nameTaken] = await Promise.all([
      Promise.all([
        this.prisma.institution.findUnique({ where: { email } }),
        this.prisma.admin.findUnique({ where: { email } }),
      ]).then(([i, a]) => !!(i || a)),
      this.prisma.institution.findFirst({ where: { name: { equals: name, mode: "insensitive" } } }),
    ]);
    if (emailTaken) throw new ConflictException("An account with this email already exists.");
    if (nameTaken) throw new ConflictException("An institution with this name is already registered.");

    const institution = await this.prisma.institution.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        contactName: dto.contactName.trim(),
        phone: dto.phone?.trim() || null,
        website: dto.website?.trim() || null,
        registrationNumber: dto.registrationNumber?.trim() || null,
        address: dto.address?.trim() || null,
      },
    });
    return this.issueToken(institutionProfile(institution));
  }

  async me(userId: string, role: string): Promise<StaffProfile> {
    if (role === "ADMIN") {
      const admin = await this.prisma.admin.findUnique({ where: { id: userId } });
      if (admin) return adminProfile(admin);
    } else if (role === "INSTITUTION") {
      const institution = await this.prisma.institution.findUnique({ where: { id: userId } });
      if (institution) return institutionProfile(institution);
    }
    throw new UnauthorizedException();
  }

  private async issueToken(user: StaffProfile) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    return { accessToken, user };
  }
}
