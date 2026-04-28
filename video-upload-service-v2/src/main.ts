import { ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Validation pipe with transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors
          .map((err) => {
            const constraints = err.constraints || {};
            return Object.values(constraints).join(', ');
          })
          .join('; ');
        return new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            error: 'Validation Failed',
            message: messages || 'Validation failed',
          },
          HttpStatus.BAD_REQUEST,
        );
      },
    }),
  );

  // Request ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id']
      ? (req.headers['x-request-id'] as string)
      : crypto.randomUUID();
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  // CORS
  const corsOrigins = process.env.CORS_ALLOWED_ORIGINS || '*';
  app.enableCors({
    origin: corsOrigins === '*' ? '*' : corsOrigins.split(','),
    methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Request-Id',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Video Upload Service')
    .setDescription('Video upload service API documentation')
    .setVersion('2.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Logging
  app.enableShutdownHooks();

  const port = process.env.APP_PORT || 8080;
  await app.listen(port);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    await app.close();
    console.log('Server stopped.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
