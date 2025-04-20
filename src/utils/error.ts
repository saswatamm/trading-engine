export class ApplicationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class OrderProcessingError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "ORDER_PROCESSING_ERROR", 500, details);
  }
}

export class MatchingEngineError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "MATCHING_ENGINE_ERROR", 500, details);
  }
}

export class FileIOError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "FILE_IO_ERROR", 500, details);
  }
}

export function asyncErrorHandler<T>(
  fn: (...args: any[]) => Promise<T>
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(
        error instanceof Error ? error.message : "Unknown error occurred",
        "INTERNAL_ERROR",
        500,
        { originalError: error }
      );
    }
  };
}
