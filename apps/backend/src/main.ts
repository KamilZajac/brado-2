import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:8100'], // Angular dev serwer
    methods: ['GET', 'POST'],
    credentials: true,
  });

  await app.listen(3000);

}
bootstrap();
