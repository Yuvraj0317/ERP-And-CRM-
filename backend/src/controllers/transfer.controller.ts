import { Request, Response, NextFunction } from 'express';
import { StockTransferService } from '../services/transfer.service';

const transferService = new StockTransferService();

export class TransferController {
  async getTransfers(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await transferService.getTransfers();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransferById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await transferService.getTransferById(req.params.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async createTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      // requestedById comes strictly from authenticated user JWT context
      const data = await transferService.createTransferRequest(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async dispatchTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await transferService.dispatchTransfer(req.params.id, req.user!.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async receiveTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await transferService.receiveTransfer(req.params.id, req.user!.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
