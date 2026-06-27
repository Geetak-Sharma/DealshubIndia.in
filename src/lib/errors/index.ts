
export enum ErrorType {
  PLATFORM_FAILURE = 'PLATFORM_FAILURE',
  NETWORK_FAILURE = 'NETWORK_FAILURE',
  TIMEOUT = 'TIMEOUT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN = 'UNKNOWN'
}

export class AppError extends Error {
  public type: ErrorType;
  public metadata?: Record<string, any>;

  constructor(type: ErrorType, message: string, metadata?: Record<string, any>) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.metadata = metadata;
  }
}
