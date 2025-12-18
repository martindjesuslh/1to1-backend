import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);

  console.log(`Application is running on: http:localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
