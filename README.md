# Last-Mile Delivery Tracker

A premium, full-stack delivery management platform built with Next.js, Prisma, and SQLite.

## System Design Write-Up

### 1. Rate Calculation Engine
The rate calculation engine is designed to be highly dynamic and admin-configurable. It relies on the `RateCard` model which defines base rates and per-kg rates for combinations of `orderType` (B2B/B2C) and `zoneType` (INTRA/INTER). When a customer places an order, the system calculates the **volumetric weight** using the standard formula `(Length × Breadth × Height) / 5000`. The billable weight is then determined as the higher value between the actual weight and the volumetric weight.
The engine calculates the base zone charge for the first kilogram and adds the `perKgRate` multiplied by the remaining billable weight. If the order is marked as Cash on Delivery (COD), the engine fetches a global configuration value (`COD_SURCHARGE_B2C` or `COD_SURCHARGE_B2B`) and appends it to the total charge. This approach ensures no hardcoded rates exist in the application code, allowing operations teams to adjust pricing dynamically via the admin panel.

### 2. Zone Detection Approach
Zone detection is streamlined by associating specific pickup and drop-off areas with predefined `Zone` entities. The customer selects their pickup and drop zones from a prepopulated list (managed by the admin). The system evaluates these selections: if `pickupZoneId === dropZoneId`, the delivery is classified as an **INTRA-zone** delivery, typically yielding a lower rate. If the zones differ, it is classified as an **INTER-zone** delivery. In a production environment, this could be extended to use geospatial polygons (e.g., PostGIS) where the customer simply enters a raw address or drops a pin, and a spatial query automatically resolves the coordinate into the correct Zone UUID.

### 3. Auto-Assignment Logic
To optimize delivery times, the system incorporates an auto-assignment mechanism. Upon order creation, if the admin hasn't opted for manual assignment, the system queries the database for the nearest available `AGENT`. In this simplified SQLite implementation, we perform a database lookup for the first available user with the `AGENT` role. In a scalable real-world application, this logic would utilize real-time agent location tracking (e.g., Redis Geospatial indexes) and availability statuses to find the nearest online agent to the `pickupZone`, significantly reducing first-mile pickup latency. If no agent is found, the order remains in the `PENDING` state until an admin manually assigns it from the dashboard.

### 4. Failed Delivery Handling
Delivery failures are an inevitable part of last-mile logistics. When a delivery agent encounters an issue (e.g., customer unavailable), they can mark the order status as `FAILED` from their agent dashboard. This action immediately logs an immutable tracking event in the `TrackingHistory` table, recording the timestamp and the actor (the agent) who reported the failure. 
Once flagged as failed, the customer dashboard dynamically reveals a "Reschedule" option. When the customer submits a new delivery date, a database transaction is initiated: 
1. The order status is reset to `PENDING`.
2. The `assignedAgentId` is cleared to allow for reassignment.
3. A record is inserted into the `Reschedule` table.
4. A new tracking event is appended.
This ensures a seamless retry pipeline while maintaining a strict audit trail of every status change.

---

## Setup Guide

### Prerequisites
- Node.js (v18+)
- npm

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Copy `.env.example` to `.env`
   ```bash
   cp .env.example .env
   ```

3. Initialize the SQLite database and run migrations:
   ```bash
   npx prisma migrate dev
   ```

4. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```
   Access the app at `http://localhost:3000`.

---

## .env.example
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="super-secret-jwt-key-change-in-prod"
```

---

## API Documentation

### Auth APIs
- `POST /api/auth/register` - Register a new user (Body: `name`, `email`, `password`, `role`).
- `POST /api/auth/login` - Login and receive an HTTP-only cookie token (Body: `email`, `password`).
- `POST /api/auth/logout` - Clear the auth cookie.
- `GET /api/auth/me` - Get current session user.

### Customer APIs
- `GET /api/orders` - Get all orders for the logged-in customer.
- `POST /api/orders` - Create a new order with auto-calculated rates.
- `GET /api/orders/:id` - Get order details and tracking history.
- `POST /api/orders/:id/reschedule` - Reschedule a failed delivery.

### Agent APIs
- `GET /api/agent/orders` - Get orders assigned to the logged-in agent.
- `POST /api/orders/:id/status` - Update the status of an order.

### Admin APIs
- `GET /api/admin/orders` - View all orders.
- `POST /api/admin/orders/:id/assign` - Assign an agent to an order.
- `GET /api/admin/zones` - Get all zones.
- `POST /api/admin/zones` - Create a new zone.
- `GET /api/admin/rates` - Get all rate cards.
- `POST /api/admin/rates` - Create or update a rate card.

---

## DB Schema Overview

- **User**: Stores customers, admins, and agents.
- **Zone & Area**: Defines geographical regions for pickup/drop logic.
- **RateCard**: Stores dynamic pricing (Base Rate, Per Kg Rate) based on Zone Type (Intra/Inter) and Order Type (B2B/B2C).
- **Order**: Contains shipment details, dimensions, calculated weights, charges, and relationships to the assigned Agent and Customer.
- **TrackingHistory**: Immutable log of every status change (who and when).
- **Reschedule**: Tracks requested reschedule dates for failed orders.
