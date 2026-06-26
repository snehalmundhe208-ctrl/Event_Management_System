# Event Management System

This is a full-stack Event Management System built with React (Vite) on the frontend, Node.js with Express on the backend, and PostgreSQL for the database.

## System Prerequisites

1. Node.js (v18 or higher)
2. PostgreSQL (installed and running locally)

## Installation and Setup Steps

### 1. Database Setup

1. Open your PostgreSQL terminal (psql) or GUI client (like pgAdmin).
2. Create a new database named `anti_event`:
   ```sql
   CREATE DATABASE anti_event;
   ```
3. Connect to the database and run the schema file:
   ```bash
   psql -U postgres -d anti_event -f database/schema.sql
   ```
4. Run the seed data file to prepopulate categories, tags, and default users:
   ```bash
   psql -U postgres -d anti_event -f database/seed.sql
   ```

*Note: Prepopulated users password is `password123`:*
- Admin: `admin@example.com`
- Organizer: `organizer@example.com`
- Attendee: `attendee@example.com`

### 2. Backend Setup

1. Open a terminal and navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. Verify the `.env` settings. The default configuration connects to `postgresql://postgres:postgres@localhost:5432/anti_event`. Adjust `DATABASE_URL` if your local postgres credentials differ.
4. Start the backend development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup

1. Open a new terminal and navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.
