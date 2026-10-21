import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { ListInstitutionsQueryDto, UpdateInstitutionStatusDto, UpdateInstitutionTrustDto } from "./dto/update-institution.dto";

/** Platform maintainer console. Observation + institution moderation only. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("overview")
  overview() {
    return this.adminService.overview();
  }

  @Get("analytics")
  analytics() {
    return this.adminService.analytics();
  }

  @Get("institutions")
  listInstitutions(@Query() query: ListInstitutionsQueryDto) {
    return this.adminService.listInstitutions(query);
  }

  @Patch("institutions/:id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateInstitutionStatusDto) {
    return this.adminService.updateStatus(id, dto);
  }

  @Patch("institutions/:id/trust")
  updateTrust(@Param("id") id: string, @Body() dto: UpdateInstitutionTrustDto) {
    return this.adminService.updateTrust(id, dto);
  }
}
