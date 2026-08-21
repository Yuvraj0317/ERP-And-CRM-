import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Mini Operations ERP API',
    version: '1.0.0',
    description: 'Production-ready REST API for Inventory, Work Orders, Stock Transfers, and Customer Stock Reservation',
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Log in user and obtain JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'admin@erp.com' },
                  password: { type: 'string', example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Successful login returning JWT token and user info' },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/inventory': {
      get: {
        tags: ['Inventory'],
        summary: 'List inventory with physical, reserved, and calculated available quantities',
        responses: { 200: { description: 'Inventory list retrieved successfully' } },
      },
    },
    '/inventory/adjust': {
      post: {
        tags: ['Inventory'],
        summary: 'Adjust physical stock level with audit trail logging',
        responses: { 200: { description: 'Stock level updated' } },
      },
    },
    '/work-orders': {
      get: {
        tags: ['Work Orders'],
        summary: 'List work orders with dynamic shortage calculation',
        responses: { 200: { description: 'Work orders list' } },
      },
      post: {
        tags: ['Work Orders'],
        summary: 'Create new Work Order (Admin Only)',
        responses: { 201: { description: 'Work order created' } },
      },
    },
    '/transfers': {
      get: {
        tags: ['Internal Transfers'],
        summary: 'List internal stock transfers',
        responses: { 200: { description: 'Stock transfers list' } },
      },
      post: {
        tags: ['Internal Transfers'],
        summary: 'Request internal stock transfer',
        responses: { 201: { description: 'Stock transfer requested' } },
      },
    },
    '/transfers/{id}/dispatch': {
      post: {
        tags: ['Internal Transfers'],
        summary: 'Dispatch transfer (Reduces source physical inventory)',
        responses: { 200: { description: 'Transfer dispatched' } },
      },
    },
    '/transfers/{id}/receive': {
      post: {
        tags: ['Internal Transfers'],
        summary: 'Receive transfer (Increases destination inventory, prevents duplicate receipt)',
        responses: { 200: { description: 'Transfer received' } },
      },
    },
    '/customer-orders': {
      get: {
        tags: ['Customer Orders'],
        summary: 'List customer orders and stock reservations',
        responses: { 200: { description: 'Customer orders list' } },
      },
      post: {
        tags: ['Customer Orders'],
        summary: 'Create order and reserve stock atomically',
        responses: { 201: { description: 'Order created and stock reserved' } },
      },
    },
  },
};

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
