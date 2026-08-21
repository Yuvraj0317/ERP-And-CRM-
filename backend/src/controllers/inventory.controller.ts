import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service';

const inventoryService = new InventoryService();

export class InventoryController {
  async getInventoryList(req: Request, res: Response, next: NextFunction) {
    try {
      const { locationId, itemId, batchId, categoryId } = req.query;
      const data = await inventoryService.getInventoryList({
        locationId: locationId as string,
        itemId: itemId as string,
        batchId: batchId as string,
        categoryId: categoryId as string,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getInventoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inventoryService.getInventoryById(req.params.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.adjustPhysicalStock(req.body, req.user?.id);
      res.status(200).json({
        success: true,
        data: result.inventory,
        transaction: result.transaction,
      });
    } catch (error) {
      next(error);
    }
  }
}
