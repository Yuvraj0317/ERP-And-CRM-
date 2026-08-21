import express from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger } from './swagger';

import authRoutes from './routes/auth.routes';
import inventoryRoutes from './routes/inventory.routes';
import workOrderRoutes from './routes/workOrder.routes';
import transferRoutes from './routes/transfer.routes';
import customerOrderRoutes from './routes/customerOrder.routes';

export const app = express();

app.use(cors());
app.use(express.json());

// Setup Swagger API Documentation
setupSwagger(app);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/customer-orders', customerOrderRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(ENV.PORT, () => {
    console.log(`🚀 Mini ERP Backend Server running on http://localhost:${ENV.PORT}`);
    console.log(`📖 API Documentation available at http://localhost:${ENV.PORT}/api-docs`);
  });
}
