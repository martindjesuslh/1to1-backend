import { ApiResponse } from '@interfaces/api-response.interface';

export class ResponseHelper {
  static success<T>(data?: T, message: string = 'Operation successful'): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date(),
    };
  }

  static created<T>(data: T, message: string = 'Resource created successfully'): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date(),
    };
  }

  static noContent(message: string = 'No content'): ApiResponse {
    return {
      success: true,
      message,
      timestamp: new Date(),
    };
  }
}
