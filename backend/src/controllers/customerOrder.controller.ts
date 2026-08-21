import { Request, Response, NextFunction } from 'express';
import { CustomerOrderService } from '../services/customerOrder.service';

const customerOrderService = new CustomerOrderService();

export class CustomerOrderController {
  async getCustomerOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await customerOrderService.getCustomerOrders();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCustomerOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await customerOrderService.getCustomerOrderById(req.params.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async createCustomerOrder(req: Request, res: Response, next: NextFunction) {
    try {
      // salesUserId is extracted strictly from authenticated user JWT context
      const headerIdempotencyKey = req.headers['idempotency-key'] as string;
      const data = await customerOrderService.createCustomerOrder(req.body, req.user!.id, headerIdempotencyKey);
      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelCustomerOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await customerOrderService.cancelCustomerOrder(req.params.id, req.user!.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
