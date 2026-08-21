import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      res.status(200).json({
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user!.id);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Test-only endpoints for verifying the Role Permission Matrix
  async testAdminOnly(req: Request, res: Response) {
    res.status(200).json({ success: true, message: 'Admin access granted', role: req.user!.role });
  }

  async testOpsOnly(req: Request, res: Response) {
    res.status(200).json({ success: true, message: 'Operations access granted', role: req.user!.role });
  }

  async testSalesOnly(req: Request, res: Response) {
    res.status(200).json({ success: true, message: 'Sales access granted', role: req.user!.role });
  }
}
