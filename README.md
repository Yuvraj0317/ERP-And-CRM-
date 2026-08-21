# Mini Operations ERP System

Production-oriented, full-stack **Mini Operations ERP** built as per technical case study specifications. The application features multi-location inventory management, a dynamic work order shortage engine, multi-stage internal stock transfers with double-receipt protection, role-based authorization, and atomic PostgreSQL concurrency-safe customer stock reservations.

---

## 🏛️ System Architecture

```text
Frontend (React 18 + TS + Vite + Tailwind)
   │
   ▼  REST API (Axios + Bearer JWT)
Backend (Express + TS Layered Architecture)
   │
   ├─► Controllers  (Express HTTP Handlers)
   ├─► Services     (Zod Validation & Business Logic)
   ├─► Repositories (Data Access Layer)
   │
   ▼  Prisma ORM (Composite Batch Integrity & Idempotency)
PostgreSQL Database (Docker Compose / Native PostgreSQL)
```

---

## 🚀 Key Modules & Capabilities

1. **Authentication & Role-Based Access Control (RBAC)**
   - 3 Pre-configured User Roles: `ADMIN`, `OPERATIONS`, `SALES`.
   - JWT authentication (`Authorization: Bearer <token>`) with 10-round bcrypt password hashing.
   - Quick 1-click demo role login buttons on the login screen for rapid evaluator testing.

2. **Inventory Management Engine**
   - Tracks stock across **Items**, **Categories**, **Locations**, and **Batches**.
   - Authoritative Inventory Invariant:
     $$\text{availableQuantity} = \text{physicalQuantity} - \text{reservedQuantity}$$
   - Database-enforced composite batch identity `(itemId, locationId, batchId)` and idempotency key enforcement.

3. **Work Order & Material Shortage Engine**
   - Admin-exclusive work order creation.
   - Live material stock check with dynamic shortage calculation computed at read time:
     $$\text{Shortage} = \max(0, \text{Required Material} - \text{Current Available Stock})$$
   - Automatically updates reported shortage when stock is adjusted, transferred, reserved, or released without mutating Work Order records.

4. **Internal Stock Transfer Lifecycle**
   - Multi-stage state machine workflow:
     $$\text{REQUESTED} \xrightarrow{\quad\text{Dispatch}\quad} \text{DISPATCHED} \xrightarrow{\quad\text{Receive}\quad} \text{RECEIVED}$$
   - **On Dispatch**: Source physical and available stock decrease by quantity via atomic SQL update. Destination stock remains **unchanged**.
   - **On Receive**: Destination physical and available stock increase by quantity.
   - **Double-Receipt Guard**: Idempotency key `RECEIVE-${transferId}` and status validation block duplicate receipt calls.

5. **Customer Orders & Concurrency-Safe Stock Reservation Engine**
   - Sales users reserve inventory for customer orders.
   - **Database-Level Concurrency Control**: Single Prisma database transaction executing PostgreSQL atomic conditional updates:
     ```sql
     UPDATE "Inventory"
     SET "reservedQuantity" = "reservedQuantity" + $quantity,
         "availableQuantity" = "availableQuantity" - $quantity
     WHERE "id" = $inventoryId AND "availableQuantity" >= $quantity;
     ```
   - Parallel race condition protection ($A = 80, B = 50$ against available $100 \rightarrow$ 1 succeeds 201, 1 fails 400, final reserved stock is 80 or 50, **NEVER 130**).
   - Order cancellation releases reserved stock back to available stock with `RELEASE` audit logging.

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Swagger UI (`swagger-ui-express`), Vitest, Supertest.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Axios, React Router v6.
- **Database & Containerization**: PostgreSQL 16 via Docker Compose.
- **Testing**: 115 Vitest integration & concurrency tests.

---

## 📊 Database ER Diagram

```mermaid
erDiagram
    User ||--o{ WorkOrder : "assignedTo / createdBy"
    User ||--o{ StockTransfer : "requested / dispatched / received"
    User ||--o{ CustomerOrder : "salesUser"
    User ||--o{ InventoryTransaction : "createdById"

    Location ||--o{ Inventory : "houses"
    Location ||--o{ WorkOrder : "fulfilledAt"
    Location ||--o{ StockTransfer : "source / destination"
    Location ||--o{ CustomerOrder : "shippedFrom"

    Category ||--o{ Item : "contains"
    Item ||--o{ Batch : "has"
    Item ||--o{ Inventory : "trackedAs"
    Item ||--o{ WorkOrder : "requires"
    Item ||--o{ StockTransfer : "transferred"
    Item ||--o{ CustomerOrder : "ordered"

    Batch ||--o{ Inventory : "batchDetails"
    Inventory ||--o{ InventoryTransaction : "audited"

    User {
        string id PK
        string email
        string name
        string role "ADMIN | OPERATIONS | SALES"
    }

    Location {
        string id PK
        string name
        string code
    }

    Item {
        string id PK
        string sku
        string name
        string unit
    }

    Inventory {
        string id PK
        string itemId FK
        string locationId FK
        string batchId FK
        int physicalQuantity
        int reservedQuantity
        int availableQuantity
    }

    WorkOrder {
        string id PK
        string workOrderNumber
        string locationId FK
        string itemId FK
        int requiredQuantity
        string status "ASSIGNED | IN_PROGRESS | COMPLETED"
    }

    StockTransfer {
        string id PK
        string transferNumber
        string sourceLocationId FK
        string destinationLocationId FK
        string itemId FK
        string batchId FK
        int quantity
        string status "REQUESTED | DISPATCHED | RECEIVED"
    }

    CustomerOrder {
        string id PK
        string orderNumber
        string customerName
        string locationId FK
        string itemId FK
        int quantity
        string status "PENDING | RESERVED | CANCELLED | COMPLETED"
    }
```

---

## 🔧 Project Setup & Execution Guide

### Prerequisites
- Node.js (v18 or v20+)
- Docker & Docker Compose (or local PostgreSQL server)

### 1. Database & Environment Startup

Start PostgreSQL via Docker Compose:
```bash
docker compose up -d
```

Copy example environment configuration:
```bash
cd backend
cp .env.example .env
```
Environment variables:
```env
PORT=5000
DATABASE_URL="postgresql://erp_user:erp_password@localhost:5432/mini_operations_erp?schema=public"
JWT_SECRET="super-secret-mini-erp-key-2026"
NODE_ENV="development"
```

### 2. Backend Setup & Seeding

```bash
cd backend
npm install
npx prisma migrate dev
npx ts-node prisma/seed.ts
npm run dev
```
The backend API server runs at **`http://localhost:5000`**.

### 3. Interactive OpenAPI / Swagger Documentation

Visit: **`http://localhost:5000/api-docs`** to test all 19 endpoints interactively via Swagger UI.

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
The React frontend application launches at **`http://localhost:3000`**.

---

## 🧪 Running Automated Tests & Builds

```bash
# Run all 115 backend integration, RBAC & PostgreSQL concurrency tests
cd backend
npm test

# Verify backend TypeScript compilation and build
npx tsc --noEmit
npm run build

# Verify frontend TypeScript compilation and build
cd ../frontend
npx tsc --noEmit
npm run build
```

---

## 🔑 Demo Login Credentials

For quick evaluation, click the quick-login role buttons on the login page or use:

| Role | Email | Password | Allowed Operations |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@erp.com` | `password123` | Full administrative control across all modules |
| **OPERATIONS** | `ops@erp.com` | `password123` | Stock adjustments, Work Order status updates, Transfer dispatch/receive |
| **SALES** | `sales@erp.com` | `password123` | Customer Order creation & cancellation, Stock reservations |
