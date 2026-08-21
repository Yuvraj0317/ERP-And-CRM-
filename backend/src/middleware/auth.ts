import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from './errorHandler';
import { Role } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';

const userRepository = new UserRepository();

export interface AuthUserContext {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserContext;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required: Missing or invalid token format', 401));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError('Authentication required: Missing token', 401));
  }

  try {
    const decoded = verifyToken(token);
    const user = await userRepository.findById(decoded.sub);

    if (!user) {
      return next(new AppError('Authentication failed: User no longer exists', 401));
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Authentication failed: Token has expired', 401));
    }
    return next(new AppError('Authentication failed: Invalid or malformed token', 401));
  }
};

export const authorize = (...roles: (Role | Role[])[]) => {
  const allowedRoles = roles.flat();
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const userRole = req.user.role;
    const isAllowed = userRole === Role.ADMIN || allowedRoles.includes(userRole);

    if (!isAllowed) {
      return next(
        new AppError(
          `Forbidden: Role '${userRole}' is not authorized to access this resource`,
          403
        )
      );
    }

    next();
  };
};
