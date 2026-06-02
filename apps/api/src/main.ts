import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { readApiEnv } from './config/env';

async function bootstrap() {
  const env = readApiEnv();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: env.webOrigin,
  });
  await app.listen(env.apiPort);
}
void bootstrap();
