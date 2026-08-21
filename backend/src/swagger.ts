import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Mini Operations ERP API',
    version: '1.0.0',
    description:
      'Production-ready REST API for Multi-location Inventory, Dynamic Work Order Shortage Engine, Internal Stock Transfers, and Atomic Concurrency-Safe Customer Stock Reservation.',
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
        description: 'Provide signed JWT token issued by POST /api/auth/login',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', example: 'admin@erp.com' },
          name: { type: 'string', example: 'System Admin' },
          role: { type: 'string', enum: ['ADMIN', 'OPERATIONS', 'SALES'] },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'admin@erp.com' },
          password: { type: 'string', example: 'password123' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          user: { $ref: '#/components/schemas/User' },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },
      Inventory: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          itemId: { type: 'string', format: 'uuid' },
          locationId: { type: 'string', format: 'uuid' },
          batchId: { type: 'string', format: 'uuid' },
          physicalQuantity: { type: 'integer', example: 100 },
          reservedQuantity: { type: 'integer', example: 20 },
          availableQuantity: { type: 'integer', example: 80 },
        },
      },
      WorkOrder: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          workOrderNumber: { type: 'string', example: 'WO-2026-001' },
          locationId: { type: 'string', format: 'uuid' },
          itemId: { type: 'string', format: 'uuid' },
          requiredQuantity: { type: 'integer', example: 60 },
          assignedUserId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] },
          createdById: { type: 'string', format: 'uuid' },
          currentAvailableQuantity: { type: 'integer', example: 20 },
          shortage: { type: 'integer', example: 40 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      StockTransfer: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          transferNumber: { type: 'string', example: 'TR-2026-001' },
          sourceLocationId: { type: 'string', format: 'uuid' },
          destinationLocationId: { type: 'string', format: 'uuid' },
          itemId: { type: 'string', format: 'uuid' },
          batchId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', example: 40 },
          status: { type: 'string', enum: ['REQUESTED', 'DISPATCHED', 'RECEIVED'] },
          requestedById: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CustomerOrder: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          orderNumber: { type: 'string', example: 'CO-2026-001-A1B2' },
          customerName: { type: 'string', example: 'Acme Industries' },
          locationId: { type: 'string', format: 'uuid' },
          itemId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', example: 50 },
          status: { type: 'string', enum: ['PENDING', 'RESERVED', 'CANCELLED', 'COMPLETED'] },
          salesUserId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Forbidden: Insufficient role permissions' },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Log in user and obtain JWT token',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: { description: 'Successful login returning JWT token and user profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          400: { description: 'Missing required credentials' },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current authenticated user identity',
        responses: {
          200: { description: 'User profile retrieved successfully' },
          401: { description: 'Unauthorized: Missing or invalid JWT' },
        },
      },
    },
    '/inventory': {
      get: {
        tags: ['Inventory'],
        summary: 'List inventory across locations and batches (ADMIN, OPERATIONS, SALES)',
        parameters: [
          { name: 'locationId', in: 'query', schema: { type: 'string' }, description: 'Filter by Location ID' },
          { name: 'itemId', in: 'query', schema: { type: 'string' }, description: 'Filter by Item ID' },
          { name: 'categoryId', in: 'query', schema: { type: 'string' }, description: 'Filter by Category ID' },
        ],
        responses: {
          200: { description: 'Inventory list retrieved successfully' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/inventory/{id}': {
      get: {
        tags: ['Inventory'],
        summary: 'Get single inventory detail by ID (ADMIN, OPERATIONS, SALES)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Inventory detail' },
          404: { description: 'Inventory record not found' },
        },
      },
    },
    '/inventory/adjust': {
      post: {
        tags: ['Inventory'],
        summary: 'Adjust physical stock level with audit logging (ADMIN, OPERATIONS)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['inventoryId', 'quantity', 'reason', 'idempotencyKey'],
                properties: {
                  inventoryId: { type: 'string', format: 'uuid' },
                  quantity: { type: 'integer', example: 50 },
                  reason: { type: 'string', example: 'Stock count correction' },
                  idempotencyKey: { type: 'string', example: 'ADJ-1001-XYZ' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Stock adjusted successfully' },
          400: { description: 'Validation error or negative stock attempt' },
          403: { description: 'Forbidden: SALES role forbidden' },
          409: { description: 'Duplicate idempotency key conflict' },
        },
      },
    },
    '/work-orders': {
      get: {
        tags: ['Work Orders'],
        summary: 'List work orders with live dynamic shortage calculation (ADMIN, OPERATIONS, SALES)',
        responses: { 200: { description: 'Work orders list' } },
      },
      post: {
        tags: ['Work Orders'],
        summary: 'Create new Work Order (ADMIN Only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['locationId', 'itemId', 'requiredQuantity', 'assignedUserId'],
                properties: {
                  locationId: { type: 'string', format: 'uuid' },
                  itemId: { type: 'string', format: 'uuid' },
                  requiredQuantity: { type: 'integer', example: 60 },
                  assignedUserId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Work Order created in ASSIGNED status' },
          403: { description: 'Forbidden: OPERATIONS and SALES roles forbidden from creation' },
        },
      },
    },
    '/work-orders/{id}': {
      get: {
        tags: ['Work Orders'],
        summary: 'Get single Work Order details (ADMIN, OPERATIONS, SALES)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Work order details' }, 404: { description: 'Not found' } },
      },
    },
    '/work-orders/{id}/status': {
      patch: {
        tags: ['Work Orders'],
        summary: 'Update Work Order status lifecycle (ADMIN, OPERATIONS)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] } } } } },
        },
        responses: {
          200: { description: 'Status updated' },
          400: { description: 'Invalid backwards status transition' },
          403: { description: 'Forbidden for SALES role' },
        },
      },
    },
    '/transfers': {
      get: {
        tags: ['Internal Transfers'],
        summary: 'List internal stock transfers (ADMIN, OPERATIONS, SALES)',
        responses: { 200: { description: 'Transfers list' } },
      },
      post: {
        tags: ['Internal Transfers'],
        summary: 'Request internal stock transfer (ADMIN, OPERATIONS)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sourceLocationId', 'destinationLocationId', 'itemId', 'batchId', 'quantity'],
                properties: {
                  sourceLocationId: { type: 'string', format: 'uuid' },
                  destinationLocationId: { type: 'string', format: 'uuid' },
                  itemId: { type: 'string', format: 'uuid' },
                  batchId: { type: 'string', format: 'uuid' },
                  quantity: { type: 'integer', example: 40 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Stock Transfer created in REQUESTED status' },
          403: { description: 'Forbidden for SALES role' },
        },
      },
    },
    '/transfers/{id}': {
      get: {
        tags: ['Internal Transfers'],
        summary: 'Get single transfer details (ADMIN, OPERATIONS, SALES)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Transfer details' } },
      },
    },
    '/transfers/{id}/dispatch': {
      post: {
        tags: ['Internal Transfers'],
        summary: 'Dispatch transfer: reduces source physical & available stock (ADMIN, OPERATIONS)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Transfer dispatched' },
          400: { description: 'Insufficient available source stock or invalid status' },
          403: { description: 'Forbidden for SALES role' },
        },
      },
    },
    '/transfers/{id}/receive': {
      post: {
        tags: ['Internal Transfers'],
        summary: 'Receive transfer: increases destination stock with double-receipt protection (ADMIN, OPERATIONS)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Transfer received' },
          400: { description: 'Already received or invalid status transition' },
          403: { description: 'Forbidden for SALES role' },
        },
      },
    },
    '/customer-orders': {
      get: {
        tags: ['Customer Orders'],
        summary: 'List customer orders & stock reservations (ADMIN, OPERATIONS, SALES)',
        responses: { 200: { description: 'Customer orders list' } },
      },
      post: {
        tags: ['Customer Orders'],
        summary: 'Create customer order and atomically reserve stock (ADMIN, SALES)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['customerName', 'locationId', 'itemId', 'quantity'],
                properties: {
                  customerName: { type: 'string', example: 'Acme Industries' },
                  locationId: { type: 'string', format: 'uuid' },
                  itemId: { type: 'string', format: 'uuid' },
                  quantity: { type: 'integer', example: 50 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Order created and stock reserved in RESERVED status' },
          400: { description: 'Insufficient available stock for reservation' },
          403: { description: 'Forbidden for OPERATIONS role' },
        },
      },
    },
    '/customer-orders/{id}': {
      get: {
        tags: ['Customer Orders'],
        summary: 'Get single customer order details (ADMIN, OPERATIONS, SALES)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Customer order details' } },
      },
    },
    '/customer-orders/{id}/cancel': {
      post: {
        tags: ['Customer Orders'],
        summary: 'Cancel order and release reserved stock back to available (ADMIN, SALES)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Order cancelled and stock released' },
          400: { description: 'Already cancelled or invalid status' },
          403: { description: 'Forbidden for OPERATIONS role' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check endpoint',
        security: [],
        responses: {
          200: { description: 'System healthy' },
        },
      },
    },
  },
};

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
