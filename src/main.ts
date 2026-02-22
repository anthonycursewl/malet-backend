import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, 
      forbidNonWhitelisted: true, 
      transform: true, 
      transformOptions: {
        enableImplicitConversion: true, 
      },
    }),
  );

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  app.set('trust proxy', 1);
  await app.listen(process.env.PORT || 4100);
  console.log(`🚀 Server running on port ${process.env.PORT || 4100}`);
}
bootstrap();
