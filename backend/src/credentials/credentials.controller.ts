import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { CredentialsService } from "./credentials.service";
import { IssueCredentialDto } from "./dto/issue-credential.dto";
import { RevokeCredentialDto } from "./dto/revoke-credential.dto";
import { ListCredentialsQueryDto } from "./dto/list-credentials-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { ActiveInstitutionGuard } from "../auth/guards/active-institution.guard";

/**
 * Credential management belongs to issuing institutions only. Platform maintainers (ADMIN)
 * have no access here: they get aggregates via /admin and never issue, revoke or read records.
 * Every institution route is scoped to the caller's own institution.
 */
@Controller("credentials")
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  // ---- Institution: writes (require ACTIVE status) ----

  @UseGuards(JwtAuthGuard, ActiveInstitutionGuard)
  @Post()
  issue(@Body() dto: IssueCredentialDto, @Req() req: any) {
    return this.credentialsService.issue(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, ActiveInstitutionGuard)
  @Post(":credentialId/revoke")
  revoke(@Param("credentialId") credentialId: string, @Body() dto: RevokeCredentialDto, @Req() req: any) {
    return this.credentialsService.revoke(credentialId, dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, ActiveInstitutionGuard)
  @Post(":credentialId/retry-anchor")
  retryAnchor(@Param("credentialId") credentialId: string, @Req() req: any) {
    return this.credentialsService.retryAnchor(credentialId, req.user.id);
  }

  // ---- Institution: reads (any status, so pending/suspended institutions still see their records) ----

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("INSTITUTION")
  @Get()
  list(@Query() query: ListCredentialsQueryDto, @Req() req: any) {
    return this.credentialsService.list(query, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("INSTITUTION")
  @Get("stats")
  stats(@Req() req: any) {
    return this.credentialsService.getStats(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("INSTITUTION")
  @Get("analytics")
  analytics(@Req() req: any) {
    return this.credentialsService.getAnalytics(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("INSTITUTION")
  @Get(":credentialId")
  getOne(@Param("credentialId") credentialId: string, @Req() req: any) {
    return this.credentialsService.findOwned(credentialId, req.user.id);
  }

  // ---- Public ----

  @Get(":credentialId/verify")
  verify(@Param("credentialId") credentialId: string) {
    return this.credentialsService.verify(credentialId);
  }

  /** Public, non-sensitive credential view for the student's shareable page. */
  @Get(":credentialId/public")
  getPublic(@Param("credentialId") credentialId: string) {
    return this.credentialsService.findPublic(credentialId);
  }
}
