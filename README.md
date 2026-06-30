# CampusCrave

CampusCrave is a production-grade, multi-vendor campus food delivery platform designed to connect students/faculty (customers), campus canteens/shops (vendors), university admins, and student delivery partners.

This repository is set up as a monorepo using **pnpm workspaces**.

## Monorepo Structure

- **`apps/web`**: Next.js 14 frontend web application (App Router, TypeScript, Tailwind CSS).
- **`apps/api`**: NestJS backend service (TypeScript, Prisma ORM, PostgreSQL, Socket.IO, Redis).
- **`packages/shared-types`**: Shared TypeScript types, interfaces, DTOs, and enums imported by both frontend and backend.

## Tech Stack Overview

- **Core**: Next.js 14 (App Router), NestJS (Modular Architecture), TypeScript.
- **Database**: PostgreSQL (relational storage via Prisma ORM).
- **Caching & Session**: Redis (live order state tracking, rate limiting, and OTP cache).
- **Real-time Gateway**: Socket.IO (instant order status updates).
- **Third-party APIs**:
  - **Firebase**: Client-side authentication (Google/Phone/Email) + FCM (Push Notifications) + Firebase Storage (Images).
  - **Razorpay**: Online payments processor (Test Mode).

---

## Prerequisites

Ensure you have the following installed on your system:
- **Node.js**: `v18.x` or higher (recommended `v20` / `v22`)
- **pnpm**: `v8.x` or higher (run via `npx pnpm` if not installed globally)
- **PostgreSQL**: Running instance
- **Redis**: Running instance

---

## Local Setup Instructions

### 1. Install Dependencies
From the repository root, install dependencies for all apps and packages:
```bash
npx pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in `apps/api/` and configure database connection and credentials:
```bash
cp apps/api/.env.example apps/api/.env
```
Ensure your `DATABASE_URL` matches your local PostgreSQL connection. For example:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/campus_crave?schema=public"
```

### 3. Generate Prisma Database Client
Generate the Prisma client code mapping to the models:
```bash
npx pnpm db:generate
```

### 4. Apply Database Migrations
Create and run migrations to create tables on your PostgreSQL database:
```bash
npx pnpm db:migrate
```

### 5. Running the Application locally
Run the NestJS backend and Next.js frontend concurrently in development mode:
```bash
npx pnpm dev
```
- **NestJS API**: Running on [http://localhost:3001/api](http://localhost:3001/api)
- **Next.js Web Client**: Running on [http://localhost:3000](http://localhost:3000)

Alternatively, start them separately:
- Run only the Next.js frontend: `npx pnpm dev:web`
- Run only the NestJS API: `npx pnpm dev:api`

---

## Workspace Scripts Summary

Run these scripts from the monorepo root:

- `pnpm dev`: Runs both Next.js and NestJS in development mode (parallel execution).
- `pnpm build`: Builds all packages/workspaces in the monorepo.
- `pnpm lint`: Lints the entire codebase.
- `pnpm format`: Formats all files using Prettier.
- `pnpm db:generate`: Triggers Prisma client generation inside the NestJS app.
- `pnpm db:migrate`: Triggers Prisma migrate command inside the NestJS app.
- `pnpm db:studio`: Opens the Prisma Studio GUI for exploring database records.