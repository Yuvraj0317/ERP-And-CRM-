import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRepository } from '../repositories/user.repository';
import { signToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { AuthUserContext } from '../middleware/auth';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export interface LoginResult {
  user: AuthUserContext;
  token: string;
}

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const parseResult = LoginSchema.safeParse(input);
    if (!parseResult.success) {
      throw new AppError('Validation Error: Invalid email or password payload', 400);
    }

    const { email, password } = parseResult.data;

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Generic error message to prevent user enumeration
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signToken({
      sub: user.id,
      role: user.role,
    });

    const safeUser: AuthUserContext = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      user: safeUser,
      token,
    };
  }

  async getMe(userId: string): Promise<AuthUserContext> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
