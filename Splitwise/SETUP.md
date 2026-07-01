# Collaborative Finance Planner - Setup Guide

A comprehensive React + TypeScript + TailwindCSS frontend for managing group expenses, events, and payment splits.

## Quick Test Access

**Test without backend:** Use these credentials to test all features with mock data:
- **Email:** `admin@gmail.com`
- **Password:** `1234`

This will give you access to:
- 2 sample groups with members
- Sample events with payments
- Full CRUD operations (creates mock data in memory)
- All payment tracking features

## Mobile Support

**Yes, this app is fully mobile-ready!**

The application features:
- Fully responsive design that adapts to all screen sizes
- Touch-friendly interface elements
- Optimized layouts for mobile (320px+), tablet, and desktop
- Mobile-optimized navigation and modals
- Tested breakpoints for seamless experience across devices
- Dark mode support on mobile

Perfect for tracking expenses on the go!

## Features

### Authentication
- JWT-based authentication with Spring Boot backend
- Login and signup pages with secure token storage
- Protected routes with automatic redirect
- User profile management

### Dashboard
- View all groups with member counts and event summaries
- Create new groups or join existing ones
- Navigate to group details

### Group Management
- View group details with member list
- Weekly event pagination (7-day windows)
- Create events within groups
- Navigate between weeks

### Event Management
- View event details with date ranges
- List all payments (subevents) under an event
- Create new payments with split options
- See payer and sharer information

### Payment Tracking
- Equal or custom split options
- Track payment status (PENDING/PAID/CONFIRMED)
- Sharers can mark payments as paid
- Payers can confirm when all shares are paid
- Visual status badges and real-time updates

### UI/UX Features
- Dark mode toggle with persistent preference
- Responsive design for mobile and desktop
- Toast notifications for all actions
- Loading states and error handling
- Clean, modern interface with smooth transitions

## Prerequisites

- Node.js 18+ and npm
- Spring Boot backend running on `http://localhost:8080`

## Backend API Endpoints

Your Spring Boot backend should implement these endpoints:

### Authentication
- `POST /api/auth/login` - { email, password } → { token, user }
- `POST /api/auth/signup` - { name, email, password } → { token, user }

### Groups
- `GET /api/groups` - Get all user groups
- `GET /api/groups/:id` - Get group details
- `POST /api/groups` - Create group { name, memberIds }
- `POST /api/groups/:id/join` - Join group

### Events
- `GET /api/groups/:groupId/events?startDate&endDate` - Get events in date range
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event { groupId, title, startDate, endDate }

### SubEvents (Payments)
- `GET /api/events/:eventId/subevents` - Get all payments for event
- `POST /api/subevents` - Create payment with split details
- `PATCH /api/subevents/:id/status` - Update share status { status: 'PAID' | 'CONFIRMED' }

### Users
- `GET /api/users/search?q=query` - Search users by name or email
- `GET /api/users` - Get all users

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```env
VITE_API_BASE_URL=http://localhost:8080/api
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── CreateEventModal.tsx
│   ├── CreateGroupModal.tsx
│   ├── CreateSubEventModal.tsx
│   ├── Modal.tsx
│   ├── Navbar.tsx
│   ├── ProtectedRoute.tsx
│   └── Toast.tsx
├── contexts/           # React contexts
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── lib/               # API and utilities
│   └── api.ts
├── pages/             # Page components
│   ├── Dashboard.tsx
│   ├── EventDetail.tsx
│   ├── GroupDetail.tsx
│   ├── Login.tsx
│   ├── Profile.tsx
│   └── Signup.tsx
├── types/             # TypeScript types
│   └── index.ts
├── App.tsx            # Main app with routing
├── main.tsx          # App entry point
└── index.css         # Global styles
```

## Key Features Implementation

### JWT Authentication
- Tokens stored in localStorage
- Automatic header injection via axios interceptor
- 401 handling with redirect to login

### State Management
- React Context for auth and theme
- Local component state for UI
- Toast notifications system

### Weekly Pagination
- Events filtered by 7-day windows
- Navigation between weeks
- Date range display

### Payment Split Options
1. **Equal Split**: Amount divided equally among sharers
2. **Custom Split**: Manual amount entry per sharer with validation

### Status Flow
1. Payer creates payment
2. Sharers mark their share as PAID
3. When all shares are PAID, payer can CONFIRM
4. Status updates reflect in real-time

## API Integration Notes

- All API calls use axios with JWT bearer token
- Error responses show toast notifications
- 401 errors trigger automatic logout
- Success actions show confirmation toasts

## Dark Mode

- Toggle in navbar
- Persistent preference in localStorage
- Smooth transitions between themes
- Full app coverage

## Security

- JWT tokens in localStorage
- Protected routes with authentication check
- Automatic token expiry handling
- Secure API communication

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile devices
- Minimum viewport: 320px

## Development Commands

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
npm run typecheck # TypeScript type checking
```

## Troubleshooting

### CORS Issues
Ensure your Spring Boot backend has CORS configured:
```java
@CrossOrigin(origins = "http://localhost:5173")
```

### Token Expiry
If users are logged out unexpectedly, check JWT expiry time in backend.

### API Connection
Verify `VITE_API_BASE_URL` matches your backend URL.
