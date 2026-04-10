import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MulterError } from 'multer';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: unknown =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            message: exception instanceof Error ? exception.message : 'Internal server error'
          };

    if (exception instanceof MulterError) {
      if (exception.code === 'LIMIT_FILE_SIZE') {
        status = HttpStatus.BAD_REQUEST;
        payload = { message: 'Image file exceeds the maximum size of 5MB' };
      } else {
        status = HttpStatus.BAD_REQUEST;
        payload = { message: 'Invalid multipart upload request' };
      }
    }

    if (!(exception instanceof HttpException)) {
      // Keep runtime debugging practical for local MVP development.
      console.error('[UnhandledException]', exception);
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      error: payload
    });
  }
}
