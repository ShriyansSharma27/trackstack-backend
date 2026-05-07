# TrackStack

A multi-tenant inventory management backend built with Node.js, Express, and SQLite. Each user gets a fully isolated database instance, with automatic audit trails for every inventory action.

## Features

- **Multi-tenant architecture** — every user gets their own isolated SQLite database
- **Full CRUD inventory management** — add, modify, remove, and query items by SKU
- **Automatic audit trails** — separate CSV logs maintained for sales, restocks, and removed items, each with timestamps and UUIDs for full traceability
- **Bulk CSV import** — stream-parse and ingest inventory data from CSV files via Multer
- **Low stock alerts** — query items below a configurable stock threshold
- **Report generation** — export current inventory, sales history, restock history, and removed items as downloadable CSV files
- **Auth** — bcrypt password hashing, session-based authentication

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (via Sequelize ORM) — one DB per tenant
- **Auth**: bcrypt + express-session
- **File Handling**: Multer (stream-based CSV ingestion)
- **Utilities**: date-fns, json2csv, fast-csv, uuid

## Getting Started

### Prerequisites

- Node.js v18+
- npm

### Installation

```bash
git clone https://github.com/ShriyansSharma27/trackstack-backend.git
cd trackstack-backend
npm install
```

### Running the Server

```bash
node server.js
```

Server runs on `http://localhost:3000` by default.

## API Reference

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Register a new user. Creates isolated DB + audit trail files |
| POST | `/login` | Authenticate and start session |
| POST | `/logout` | Destroy session |

### Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/grab/db/:user` | Fetch all inventory items |
| GET | `/api/grab/item/:user/:SKU` | Fetch a single item by SKU |
| POST | `/api/add/item/:user` | Add a new item |
| PUT | `/api/modify/item/:user` | Update item details |
| PUT | `/api/update/stock/:user` | Update stock — automatically logs sale or restock |
| DELETE | `/api/remove/item/:user/:SKU` | Remove item and log to audit trail |
| POST | `/api/read/csv/:user` | Bulk import inventory from CSV file |
| GET | `/api/check/low/:user/:lowlimit` | Get items at or below stock threshold |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/data/:user` | Export full inventory as CSV |
| GET | `/api/restocks/gen/:user` | Export restock history as CSV |
| GET | `/api/sales/gen/:user` | Export sales history as CSV |
| GET | `/api/removed/gen/:user` | Export removed items log as CSV |

## Architecture

```
trackstack-backend/
├── databases/              # Per-user SQLite DB files (auto-generated)
│   └── users.db            # User auth database
├── inventory_history/
│   ├── restocks/           # Per-user restock audit CSVs
│   ├── sales/              # Per-user sales audit CSVs
│   └── remitems/           # Per-user removed items CSVs
├── middleware/
│   └── model.js            # Sequelize Inventory model definition
├── router/
│   ├── auth.js             # Signup, login, logout routes
│   └── inventory.js        # All inventory + report routes
└── server.js               # Entry point
```

## Multi-Tenancy Model

On signup, TrackStack automatically provisions:
- A dedicated SQLite database file (`/databases/<username>.db`)
- Three CSV audit trail files for restocks, sales, and removed items

This ensures complete data isolation between users with zero configuration overhead.

## Audit Trail

Every stock-modifying action is automatically logged:

| Action | Log Location | Fields |
|--------|-------------|--------|
| Restock / CSV import | `restocks/<user>_tracker.csv` | SKU, action, timestamp, UUID |
| Sale (stock decrease) | `sales/<user>_tracker.csv` | item, units sold, monetary value, timestamp, UUID |
| Item removal | `remitems/<user>_tracker.csv` | SKU, timestamp, UUID |
