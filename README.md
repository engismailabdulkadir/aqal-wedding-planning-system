# Wedding Planning System

A MERN wedding operations platform: venue and hall booking, service marketplace, payments, guests, tasks, timeline, invitations, messaging, notifications, and role-based workspaces for Admin, Customer, Planner, and Vendor.

## Tech stack

- **Frontend:** React, Vite, React Router, Tailwind CSS, Axios
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB
- **Auth:** JWT + bcrypt password hashing

## Architecture

```text
frontend/   React SPA (public catalog + role dashboards)
backend/    Express API at /api/v1
```

MongoDB is the source of truth for users, weddings, venues, halls, bookings, services, orders, payments, guests, tasks, timelines, invitations, messages, notifications, and reports.

## Roles

| Role | Access |
| --- | --- |
| **Admin** | Platform-wide users, weddings, bookings, payments, reports |
| **Customer** | Own weddings only |
| **Planner** | Assigned weddings only |
| **Vendor** | Own listings, orders, bookings, and payments |

## Folder structure

```text
.
├── frontend/src
│   ├── pages/          Public, customer, planner, vendor, admin
│   ├── components/
│   └── services/       API clients
└── backend/src
    ├── models/
    ├── controllers/
    ├── routes/
    ├── payments/       Provider adapter (mock by default)
    └── utils/          Occupancy, settlement, notifications
```

## Installation

### MongoDB

Run a local instance, or set `MONGO_URI` to Atlas.

```bash
mongodb://127.0.0.1:27017/wedding_planning
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

API: `http://localhost:5000/api/v1`  
Health: `GET /api/v1/health`

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: `http://localhost:5173`

## Environment variables

### Backend

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default 5000) |
| `NODE_ENV` | `development` or `production` |
| `MONGO_URI` | MongoDB connection string |
| `FRONTEND_URL` | CORS origin |
| `JWT_SECRET` | Token signing secret |
| `JWT_EXPIRES_IN` | Token lifetime |
| `PAYMENT_PROVIDER` | `mock` (default) |
| `PAYMENT_API_KEY` | Reserved for a live provider |
| `PAYMENT_SECRET` | Reserved for a live provider |
| `INITIAL_ADMIN_*` | Used by `npm run seed:admin` |

### Frontend

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL (`http://localhost:5000/api/v1`) |

Never commit live payment credentials. The mock provider captures test payments in development only. The browser cannot mark a payment successful.

## Seed and test accounts

```bash
cd backend
npm run seed          # Part 2 catalog + Part 3 accounts
npm run verify:part2
npm run verify:part3
```

Password for all seed users: `SeedPass123!`

| Email | Role |
| --- | --- |
| `admin@seed.test` | Admin |
| `customer.a@seed.test` | Customer |
| `customer.b@seed.test` | Customer |
| `planner.seed@seed.test` | Planner |
| `planner.two@seed.test` | Planner |
| `venue.bera@seed.test` | Vendor (Bera Bandir Hotel) |
| `atelier.noor@seed.test` | Vendor |
| `gentleman.fit@seed.test` | Vendor |
| `celebration.studio@seed.test` | Vendor |
| `florist.bloom@seed.test` | Vendor |

Bera Bandir Hotel includes Hall A, Hall B, and Hall C with Morning $300, Evening $400, Full Day $700.

## Booking and availability

Availability is **Hall + Date + Time Slot**, not a single boolean.

- Morning booked → evening can stay free
- Evening booked → morning can stay free
- Full day blocks morning, evening, and full day
- Booking Hall A never blocks Hall C
- Occupancy includes setup, cleanup, and buffer minutes
- Overnight evening slots use `startDateTime` / `endDateTime`
- Holds last 10 minutes; unique slot locks return **409 Conflict** on races

Flow: Available → Held → Deposit payment → Confirmed. Expired holds release the slot.

## Payment logic

Customers pay deposits, partial amounts, remaining balances, or full amounts against an order or hall booking. Amounts, balances, and `paymentStatus` are calculated on the server. Successful mock payments update the order, hall booking, selection, budget actuals, receipt reference, and notifications.

## Security

- JWT required except public catalog and invitation RSVP
- Ownership filters on every query (no unrestricted lists)
- Wrong role → 403, anonymous → 401
- Helmet, CORS, login/register rate limits, Mongo operator stripping
- Passwords hashed; payment secrets never returned to the client

## API

All routes are under `/api/v1/`. Success responses use `{ success: true, ... }`. Errors use `{ success: false, message }`.

Key groups: `/auth`, `/weddings`, `/venues`, `/halls`, `/hall-bookings`, `/listings`, `/selections`, `/orders`, `/payments`, `/budget`, `/guests`, `/tasks`, `/timeline`, `/invitations`, `/conversations`, `/notifications`, `/reports`, `/planner`, `/vendor`, `/admin`.
