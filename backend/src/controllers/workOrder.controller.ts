import { Request, Response, NextFunction } from 'express';
import { WorkOrderService } from '../services/workOrder.service';

const workOrderService = new WorkOrderService();

export class WorkOrderController {
  async getWorkOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await workOrderService.getWorkOrders();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getWorkOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await workOrderService.getWorkOrderById(req.params.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async createWorkOrder(req: Request, res: Response, next: NextFunction) {
    try {
      // createdById is extracted exclusively from req.user!.id (authenticated JWT token)
      const data = await workOrderService.createWorkOrder(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateWorkOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const data = await workOrderService.updateWorkOrderStatus(req.params.id, status, req.user!.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
