import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "An unexpected error occurred. Please try again.";
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === "string" ? res : (res as any).message || message;
      details = typeof res === "object" ? (res as any).error : undefined;
    } else {
      // Never leak raw internal/db/blockchain error text to the client.
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        (exception as Error)?.stack
      );
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
