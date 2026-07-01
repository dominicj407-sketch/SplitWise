# Testing Guide - Mock Mode

## Quick Start

1. Start the dev server: `npm run dev`
2. Navigate to the login page
3. Use these credentials:
   - **Email:** `admin@gmail.com`
   - **Password:** `1234`

## What You Can Test

### 1. Dashboard Features
After login, you'll see:
- **3 Pre-loaded Groups:**
  - **Work** (3 members) - Office lunch & team activities
  - **Home** (3 members) - Monthly groceries & utility bills
  - **Hostel** (4 members) - Weekend trip expenses
- Click any group card to view details

### 2. Group Management
**Inside "Work" group:**
- View 3 members: Admin User, John Doe, Bob Wilson
- Events:
  - "Office Lunch" ($85)
  - "Team Building Activity" ($150)

**Inside "Home" group:**
- View 3 members: Admin User, Jane Smith, Alice Brown
- Events:
  - "Monthly Groceries" ($320)
  - "Utility Bills" ($180)

**Inside "Hostel" group:**
- View 4 members: Admin User, John, Jane, Bob
- Event:
  - "Weekend Trip" ($850) - Multiple subevents!

### 3. Event & SubEvent (Payment) Details
**Click "Office Lunch" to see:**
- SubEvent: Restaurant Bill ($85)
  - Split 3 ways
  - Different statuses per person

**Click "Weekend Trip" (in Hostel group) to see:**
- **SubEvent 1:** Hotel Booking ($480)
  - Split among 4 people ($120 each)
- **SubEvent 2:** Transport/Cab ($200)
  - $50 per person
- **SubEvent 3:** Meals & Snacks ($170)
  - $42.50 per person
  - This demonstrates the full hierarchy!

**Click "Utility Bills" to see:**
- **SubEvent 1:** Electricity Bill ($120)
- **SubEvent 2:** Internet Bill ($60)
  - Multiple payments under one event

### 4. Creating New Content

**Create a Group:**
1. Dashboard → "Create Group" button
2. Enter group name
3. Search for users (try "john", "jane", "bob", or "alice")
4. Add members and create

**Create an Event:**
1. Inside any group → "Create Event" button
2. Enter title and date range
3. Creates immediately

**Create a Payment:**
1. Inside any event → "Create Payment" button
2. Enter payment details
3. Choose split type:
   - **Equal:** Automatically divides amount
   - **Custom:** Enter amount for each person
4. Select sharers from group members

### 5. Payment Status Flow

**As a Sharer:**
1. Find a payment where you're listed
2. If status is PENDING, click "Mark My Share as Paid"
3. Status updates to PAID

**As a Payer:**
1. When all sharers mark as PAID
2. "Confirm All Payments" button appears
3. Click to mark all as CONFIRMED

### 6. Profile & Settings
- Click your avatar in navbar
- View profile with your name and email
- Toggle dark mode anytime

### 7. Mobile Testing
Test on mobile by:
- Resizing browser window
- Using Chrome DevTools mobile emulation
- Testing on actual mobile device

All features work identically on mobile!

## Mock Data Behavior

- All data persists during your session
- New items you create are added to mock arrays
- Refreshing the page resets to original mock data
- Status updates modify the mock data in real-time

## Available Mock Users

You can search and add these users when creating groups:
- Admin User (admin@gmail.com)
- John Doe (john@example.com)
- Jane Smith (jane@example.com)
- Bob Wilson (bob@example.com)
- Alice Brown (alice@example.com)

## Testing Checklist

- [ ] Login with test credentials
- [ ] View dashboard groups
- [ ] Navigate to group detail
- [ ] Switch between weeks
- [ ] Click into event detail
- [ ] Create new group
- [ ] Create new event
- [ ] Create new payment (equal split)
- [ ] Create payment (custom split)
- [ ] Mark share as paid
- [ ] Toggle dark mode
- [ ] View profile
- [ ] Test on mobile viewport
- [ ] Logout and login again

## Switching to Real Backend

To connect to your Spring Boot backend:
1. Ensure backend is running on `http://localhost:8080`
2. Login with real user credentials (not mock)
3. The app automatically uses real API calls
4. Mock mode only activates with `admin@gmail.com` / `1234`

## Known Mock Limitations

- Weekly pagination shows all events (date filtering simulated)
- Confirming payments only updates your own status
- Joining groups is not implemented in mock mode
- User search returns all users matching query
