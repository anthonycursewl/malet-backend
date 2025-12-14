import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar validación global de DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // Elimina propiedades no definidas en el DTO
    forbidNonWhitelisted: true, // Lanza error si hay propiedades extra
    transform: true,           // Transforma los datos al tipo del DTO
    transformOptions: {
      enableImplicitConversion: true, // Convierte tipos automáticamente
    },
  }));

  await app.listen(process.env.PORT || 4100);
}
bootstrap();

