# Data Hierarchy - App Structure

## Correct Three-Level Hierarchy

```
Groups (Work, Home, Hostel)
    └── Events (Weekend Trip, Office Lunch, etc.)
            └── SubEvents/Payments (Hotel, Transport, Meals, etc.)
```

## Detailed Structure with Mock Data

### Level 1: GROUPS (Categories)
Groups represent different contexts or categories of expenses.

```
📁 Work
   └── Members: Admin User, John Doe, Bob Wilson

📁 Home
   └── Members: Admin User, Jane Smith, Alice Brown

📁 Hostel
   └── Members: Admin User, John Doe, Jane Smith, Bob Wilson
```

### Level 2: EVENTS (Occasions)
Events are specific occasions or time periods within a group.

```
📁 Work
   ├── 📅 Office Lunch (Oct 20, 2025) - $85
   └── 📅 Team Building Activity (Oct 18, 2025) - $150

📁 Home
   ├── 📅 Monthly Groceries (Oct 15, 2025) - $320
   └── 📅 Utility Bills (Oct 22, 2025) - $180

📁 Hostel
   └── 📅 Weekend Trip (Oct 19-21, 2025) - $850
```

### Level 3: SUBEVENTS (Individual Payments)
SubEvents are the actual itemized expenses within an event.

```
📁 Hostel
   └── 📅 Weekend Trip ($850)
          ├── 💰 Hotel Booking - $480
          │      └── Split: $120 per person (4 people)
          ├── 💰 Transport (Cab) - $200
          │      └── Split: $50 per person (4 people)
          └── 💰 Meals & Snacks - $170
                 └── Split: $42.50 per person (4 people)

📁 Home
   └── 📅 Utility Bills ($180)
          ├── 💰 Electricity Bill - $120
          │      └── Split: $40 per person (3 people)
          └── 💰 Internet Bill - $60
                 └── Split: $20 per person (3 people)

📁 Work
   └── 📅 Office Lunch ($85)
          └── 💰 Restaurant Bill - $85
                 └── Split: ~$28.33 per person (3 people)
```

## Real-World Examples

### Example 1: Planning a Weekend Trip
1. Create **Group**: "Hostel" (your roommates)
2. Create **Event**: "Weekend Trip" (the occasion)
3. Add **SubEvents** (the actual expenses):
   - Hotel booking
   - Transportation
   - Food and meals
   - Activities/tickets

### Example 2: Home Expenses
1. Create **Group**: "Home" (family/roommates)
2. Create **Event**: "Utility Bills" (monthly bills)
3. Add **SubEvents**:
   - Electricity bill
   - Internet bill
   - Water bill
   - Gas bill

### Example 3: Work Expenses
1. Create **Group**: "Work" (colleagues)
2. Create **Event**: "Office Lunch" (today's lunch)
3. Add **SubEvents**:
   - Restaurant bill
   - Tip
   - Drinks

## Navigation Flow in App

```
Dashboard
   ↓ (click group)
Group Detail Page (shows all events in this group)
   ↓ (click event)
Event Detail Page (shows all payments/subevents in this event)
   ↓ (view/manage)
Payment Details with Status Tracking
```

## Benefits of This Structure

1. **Organization**: Groups keep related expenses together (Work, Home, etc.)
2. **Time-based**: Events organize expenses by occasion or time period
3. **Detailed**: SubEvents track each individual payment
4. **Flexible**: Each level can have multiple items
5. **Clear Splits**: Each subevent has its own split configuration

## Payment Status Tracking

Each SubEvent (payment) tracks individual statuses:
- **PENDING**: Payment share not yet marked as paid
- **PAID**: Sharer has marked their portion as paid
- **CONFIRMED**: Payer has confirmed receipt of payment

Example flow for "Hotel Booking" subevent:
```
Admin User (Payer): CONFIRMED ✓
John Doe: PAID ✓ (waiting for payer confirmation)
Jane Smith: PAID ✓ (waiting for payer confirmation)
Bob Wilson: PENDING ⏳ (not yet paid)
```
