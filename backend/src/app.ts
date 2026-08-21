import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import inventoryRoutes from './routes/inventory.routes';
import workOrderRoutes from './routes/workOrder.routes';
import transferRoutes from './routes/transfer.routes';
import customerOrderRoutes from './routes/customerOrder.routes';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/customer-orders', customerOrderRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use(errorHandler);
