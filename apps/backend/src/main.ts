import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/user.service';

// 🔐 Global crash safety handlers
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost',
      'https://brado-2.harea.digital'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const usersService = app.get(UsersService);

  const username = 'admin';
  const password = 'admin123';

  const existing = await usersService.findByUsername(username);
  if (existing) {
    console.log(`User "${username}" already exists.`);
  } else {
    const user = await usersService.createUser(
      username,
      password,
      'super_admin' as any,
    );
    console.log(`Admin user created: ${user.username}`);
  }

  await app.listen(3000, '0.0.0.0');
}

bootstrap();
