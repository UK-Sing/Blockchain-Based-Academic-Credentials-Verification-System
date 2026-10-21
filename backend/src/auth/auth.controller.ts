import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterInstitutionDto } from "./dto/register-institution.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { Roles } from "./guards/roles.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Shared sign-in for institutions and platform maintainers; the response says which role. */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("register-institution")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  registerInstitution(@Body() dto: RegisterInstitutionDto) {
    return this.authService.registerInstitution(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "INSTITUTION")
  @Get("me")
  me(@Req() req: any) {
    return this.authService.me(req.user.id, req.user.role);
  }
}
