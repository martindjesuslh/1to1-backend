import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    return next.handle().pipe(
      map(data => {
        const statusCode = response.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 300;

        const baseResponse: ApiResponse<T> = {
          success: isSuccess,
          message: this.getMessageFromStatusCode(statusCode),
          timestamp: new Date(),
          path: request.url,
        };

        if (data !== undefined && data !== null) {
          baseResponse.data = data;
        }

        return baseResponse;
      }),
    );
  }

  private getMessageFromStatusCode(statusCode: number): string {
    const messages = {
      [HttpStatus.OK]: 'Operation successful',
      [HttpStatus.CREATED]: 'Resource created successfully',
      [HttpStatus.ACCEPTED]: 'Request accepted',
      [HttpStatus.NO_CONTENT]: 'No content',
      [HttpStatus.BAD_REQUEST]: 'Bad request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Resource not found',
      [HttpStatus.CONFLICT]: 'Resource conflict',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal server error',
    };

    return messages[statusCode] || 'Operation completed';
  }
}
