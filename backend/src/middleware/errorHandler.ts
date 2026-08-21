import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Do not expose stack traces or internal SQL errors to API clients
  res.status(statusCode).json({
    success: false,
    error: message,
  });
};
