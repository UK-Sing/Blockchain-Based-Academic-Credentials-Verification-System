import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: config.get<string>("CORS_ORIGIN") || "http://localhost:5173",
    credentials: true,
  });

  app.setGlobalPrefix("api");

  const port = config.get<number>("PORT") || 4000;
  await app.listen(port);
  console.log(`Backend API listening on http://localhost:${port}/api`);
}
bootstrap();
