# Malet Backend

Backend Application for the **Malet** platform, built with [NestJS](https://nestjs.com/).

## 🚀 Overview

This repository contains the server-side logic for the Malet platform. It is a robust, scalable backend handling user identities, communities, financial wallets, real-time messaging, and intelligent feed recommendations. It also facilitates integrations with external systems like Garzon and AI providers (Google Gemini).

The architecture follows **Domain-Driven Design (DDD)** principles, organizing the codebase into distinct Bounded Contexts to ensure maintainability and scalability.

## 🛠️ Tech Stack

*   **Runtime**: Node.js
*   **Framework**: NestJS (TypeScript)
*   **Database**: PostgreSQL
*   **ORM**: Prisma
*   **Caching & Pub/Sub**: Redis
*   **Real-Time**: Socket.io (WebSockets)
*   **File Storage**: AWS S3
*   **Authentication**: JWT & Passport
*   **Email**: Nodemailer (SMTP)

## 📂 Project Structure

The source code is structured around functional domains located in `src/context/`:

*   **`users`**: User management, profiles, authentication, and email verification.
*   **`communities`**: Logic for creating and managing communities and memberships.
*   **`feed`**: Recommendation engine and content feed generation.
*   **`messaging`**: Real-time chat system, including WebSocket gateways and conversation management.
*   **`wallet`**: Management of accounts, balances, and transactions.
*   **`integrations`**: Abstraction layer for external OAuth providers and user provisioning (e.g., Wheek).
*   **`garzon`**: Adapters for integration with the external "Garzon" system.
*   **`ai-chat`**: Interface for AI chat capabilities (currently using Gemini).
*   **`onboarding`**: User onboarding flows and interest capture.

## ⚙️ Prerequisites

Before running the project, ensure you have the following installed:

*   **Node.js** (v18 or higher)
*   **npm** (or pnpm/yarn)
*   **PostgreSQL** (running locally or accessible via URL)
*   **Redis** (optional for dev, required for WebSocket scaling)

## 🔧 Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd malet-backend
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

## 🔐 Configuration

1.  **Environment Variables**:
    Copy the example configuration file to create your local `.env` file:
    ```bash
    cp .env.example .env
    ```

2.  **Update `.env`**:
    Edit the `.env` file and provide values for the following key sections:
    *   **Database**: `DATABASE_URL` for PostgreSQL connection.
    *   **Redis**: `REDIS_HOST`, `REDIS_PORT`, etc.
    *   **AWS S3**: Credentials for file storage (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, etc.).
    *   **Security**: `JWT_SECRET` for token signing.
    *   **Keys**: `GEMINI_API_KEY` for AI features, `TOKEN_ENCRYPTION_KEY` for secure storage.

## 🗄️ Database Setup

Use Prisma to initialize your database schema:

```bash
# Generate Prisma Client (run this after every schema change)
npx prisma generate

# Run database migrations
npx prisma migrate dev
```

## ▶️ Running the Application

```bash
# Development mode
npm run start

# Watch mode (Auto-reload)
npm run start:dev

# Production build & run
npm run build
npm run start:prod
```

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run end-to-end tests
npm run test:e2e
```

## 📚 Documentation & Resources

*   **Security Audit**: Refer to `.security-audit-report.md` for security details.
*   **Redis Setup**: See `docs/REDIS_PROXMOX_SETUP.md` (if available) for infrastructure details.

## 📄 License

This project is proprietary and UNLICENSED.
