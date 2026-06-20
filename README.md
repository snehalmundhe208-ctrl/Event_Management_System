# Event Management System

A full-stack Event Management System built using React, Node.js, Express, PostgreSQL, and JWT Authentication. The platform allows users to create, manage, discover, and register for events while providing organizers and administrators with analytics and management tools.

## Features

### Authentication
- User Registration
- User Login
- JWT Authentication
- Protected Routes
- Profile Management

### Event Management
- Create Events
- Edit Events
- Delete Events
- View Event Details
- Event Capacity Management

### Event Discovery
- Browse Events
- Search Events
- Category Filters

### Registration System
- Event Registration
- Registration Tracking
- My Registrations
- Capacity Validation

### Ticketing
- QR Code Ticket Generation
- Ticket Verification
- Event Check-In

### Dashboard
- Organizer Dashboard
- Registration Statistics
- Attendance Tracking

### Admin Panel
- User Management
- Event Management
- Reports & Analytics

### Feedback System
- Ratings and Reviews
- Feedback Collection

### Gallery
- Event Photos and Media

### Notifications
- Event Reminders
- Registration Updates

### Certificates
- Certificate Generation for Participants

---

## Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- React Router

### Backend
- Node.js
- Express.js

### Database
- PostgreSQL

### Authentication
- JWT
- bcrypt

### Additional Services
- QR Code Generation
- File Upload Management
- Email Services

---

## Project Structure

EVENT
│
├── client
│   ├── src
│   │   ├── components
│   │   ├── context
│   │   ├── pages
│   │   ├── utils
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── server
│   ├── db
│   ├── middleware
│   ├── routes
│   ├── services
│   ├── .env
│   ├── index.js
│   └── package.json
│
└── README.md
[For Now , it will change until the project completion]
---

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd EVENT
```

### Backend Setup

```bash
cd server
npm install
```

Create a `.env` file:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=event_management
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_secret_key
```

Run Backend:

```bash
npm run dev
```

### Frontend Setup

```bash
cd client
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:5000
```

---

## Database Setup

Create database:

```sql
CREATE DATABASE event_management;
```

Run migrations and seed:

```bash
node db/migrations.js
node db/seed.js
```

---

## Future Enhancements

- Email Verification
- Real-Time Notifications
- Payment Integration
- Advanced Analytics
- Mobile Application
- Event Recommendation System

---

## Contributors

- Snehal
- Ash
- Sailee

---

## License

This project is developed for educational and academic purposes.