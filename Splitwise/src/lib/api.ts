import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const isMockMode = () => localStorage.getItem('token') === 'mock-jwt-token-for-testing';

const mockGroups: any[] = [
  {
    id: 'group-1',
    name: 'Work',
    members: [
      { id: 'mock-user-1', name: 'Admin User', email: 'admin@gmail.com' },
      { id: 'user-2', name: 'John Doe', email: 'john@example.com' },
      { id: 'user-4', name: 'Bob Wilson', email: 'bob@example.com' },
    ],
    latestEventSummary: 'Office Lunch - $85.00',
    createdAt: '2025-10-15T10:00:00Z',
  },
  {
    id: 'group-2',
    name: 'Home',
    members: [
      { id: 'mock-user-1', name: 'Admin User', email: 'admin@gmail.com' },
      { id: 'user-3', name: 'Jane Smith', email: 'jane@example.com' },
      { id: 'user-5', name: 'Alice Brown', email: 'alice@example.com' },
    ],
    latestEventSummary: 'Monthly Groceries - $320.00',
    createdAt: '2025-10-10T14:30:00Z',
  },
  {
    id: 'group-3',
    name: 'Hostel',
    members: [
      { id: 'mock-user-1', name: 'Admin User', email: 'admin@gmail.com' },
      { id: 'user-2', name: 'John Doe', email: 'john@example.com' },
      { id: 'user-3', name: 'Jane Smith', email: 'jane@example.com' },
      { id: 'user-4', name: 'Bob Wilson', email: 'bob@example.com' },
    ],
    latestEventSummary: 'Weekend Trip - $850.00',
    createdAt: '2025-10-12T09:00:00Z',
  },
];

const mockEvents: any[] = [
  {
    id: 'event-1',
    groupId: 'group-1',
    title: 'Office Lunch',
    startDate: '2025-10-20T00:00:00Z',
    endDate: '2025-10-20T00:00:00Z',
    totalAmount: 85.00,
    createdAt: '2025-10-20T09:00:00Z',
  },
  {
    id: 'event-2',
    groupId: 'group-1',
    title: 'Team Building Activity',
    startDate: '2025-10-18T00:00:00Z',
    endDate: '2025-10-18T00:00:00Z',
    totalAmount: 150.00,
    createdAt: '2025-10-18T10:00:00Z',
  },
  {
    id: 'event-3',
    groupId: 'group-2',
    title: 'Monthly Groceries',
    startDate: '2025-10-15T00:00:00Z',
    endDate: '2025-10-15T00:00:00Z',
    totalAmount: 320.00,
    createdAt: '2025-10-15T08:00:00Z',
  },
  {
    id: 'event-4',
    groupId: 'group-2',
    title: 'Utility Bills',
    startDate: '2025-10-22T00:00:00Z',
    endDate: '2025-10-22T00:00:00Z',
    totalAmount: 180.00,
    createdAt: '2025-10-22T07:00:00Z',
  },
  {
    id: 'event-5',
    groupId: 'group-3',
    title: 'Weekend Trip',
    startDate: '2025-10-19T00:00:00Z',
    endDate: '2025-10-21T00:00:00Z',
    totalAmount: 850.00,
    createdAt: '2025-10-19T06:00:00Z',
  },
];

const mockSubEvents: any[] = [
  {
    id: 'subevent-1',
    eventId: 'event-1',
    title: 'Restaurant Bill',
    payerId: 'mock-user-1',
    payerName: 'Admin User',
    totalAmount: 85.00,
    sharers: [
      { id: 'share-1', userId: 'mock-user-1', userName: 'Admin User', amount: 28.33, status: 'CONFIRMED' },
      { id: 'share-2', userId: 'user-2', userName: 'John Doe', amount: 28.33, status: 'MARKED_AS_PAID' },
      { id: 'share-3', userId: 'user-4', userName: 'Bob Wilson', amount: 28.34, status: 'UNPAID' },
    ],
    createdAt: '2025-10-20T13:00:00Z',
  },
  {
    id: 'subevent-2',
    eventId: 'event-2',
    title: 'Activity Tickets',
    payerId: 'user-2',
    payerName: 'John Doe',
    totalAmount: 150.00,
    sharers: [
      { id: 'share-4', userId: 'mock-user-1', userName: 'Admin User', amount: 50.00, status: 'MARKED_AS_PAID' },
      { id: 'share-5', userId: 'user-2', userName: 'John Doe', amount: 50.00, status: 'CONFIRMED' },
      { id: 'share-6', userId: 'user-4', userName: 'Bob Wilson', amount: 50.00, status: 'MARKED_AS_PAID' },
    ],
    createdAt: '2025-10-18T11:00:00Z',
  },
  {
    id: 'subevent-3',
    eventId: 'event-3',
    title: 'Supermarket Shopping',
    payerId: 'user-3',
    payerName: 'Jane Smith',
    totalAmount: 320.00,
    sharers: [
      { id: 'share-7', userId: 'mock-user-1', userName: 'Admin User', amount: 106.67, status: 'UNPAID' },
      { id: 'share-8', userId: 'user-3', userName: 'Jane Smith', amount: 106.67, status: 'CONFIRMED' },
      { id: 'share-9', userId: 'user-5', userName: 'Alice Brown', amount: 106.66, status: 'UNPAID' },
    ],
    createdAt: '2025-10-15T15:00:00Z',
  },
  {
    id: 'subevent-4',
    eventId: 'event-4',
    title: 'Electricity Bill',
    payerId: 'mock-user-1',
    payerName: 'Admin User',
    totalAmount: 120.00,
    sharers: [
      { id: 'share-10', userId: 'mock-user-1', userName: 'Admin User', amount: 40.00, status: 'CONFIRMED' },
      { id: 'share-11', userId: 'user-3', userName: 'Jane Smith', amount: 40.00, status: 'MARKED_AS_PAID' },
      { id: 'share-12', userId: 'user-5', userName: 'Alice Brown', amount: 40.00, status: 'MARKED_AS_PAID' },
    ],
    createdAt: '2025-10-22T08:00:00Z',
  },
  {
    id: 'subevent-5',
    eventId: 'event-4',
    title: 'Internet Bill',
    payerId: 'user-5',
    payerName: 'Alice Brown',
    totalAmount: 60.00,
    sharers: [
      { id: 'share-13', userId: 'mock-user-1', userName: 'Admin User', amount: 20.00, status: 'UNPAID' },
      { id: 'share-14', userId: 'user-3', userName: 'Jane Smith', amount: 20.00, status: 'UNPAID' },
      { id: 'share-15', userId: 'user-5', userName: 'Alice Brown', amount: 20.00, status: 'CONFIRMED' },
    ],
    createdAt: '2025-10-22T08:30:00Z',
  },
  {
    id: 'subevent-6',
    eventId: 'event-5',
    title: 'Hotel Booking',
    payerId: 'mock-user-1',
    payerName: 'Admin User',
    totalAmount: 480.00,
    sharers: [
      { id: 'share-16', userId: 'mock-user-1', userName: 'Admin User', amount: 120.00, status: 'CONFIRMED' },
      { id: 'share-17', userId: 'user-2', userName: 'John Doe', amount: 120.00, status: 'MARKED_AS_PAID' },
      { id: 'share-18', userId: 'user-3', userName: 'Jane Smith', amount: 120.00, status: 'MARKED_AS_PAID' },
      { id: 'share-19', userId: 'user-4', userName: 'Bob Wilson', amount: 120.00, status: 'UNPAID' },
    ],
    createdAt: '2025-10-19T07:00:00Z',
  },
  {
    id: 'subevent-7',
    eventId: 'event-5',
    title: 'Transport (Cab)',
    payerId: 'user-2',
    payerName: 'John Doe',
    totalAmount: 200.00,
    sharers: [
      { id: 'share-20', userId: 'mock-user-1', userName: 'Admin User', amount: 50.00, status: 'UNPAID' },
      { id: 'share-21', userId: 'user-2', userName: 'John Doe', amount: 50.00, status: 'CONFIRMED' },
      { id: 'share-22', userId: 'user-3', userName: 'Jane Smith', amount: 50.00, status: 'UNPAID' },
      { id: 'share-23', userId: 'user-4', userName: 'Bob Wilson', amount: 50.00, status: 'UNPAID' },
    ],
    createdAt: '2025-10-19T09:00:00Z',
  },
  {
    id: 'subevent-8',
    eventId: 'event-5',
    title: 'Meals & Snacks',
    payerId: 'user-3',
    payerName: 'Jane Smith',
    totalAmount: 170.00,
    sharers: [
      { id: 'share-24', userId: 'mock-user-1', userName: 'Admin User', amount: 42.50, status: 'UNPAID' },
      { id: 'share-25', userId: 'user-2', userName: 'John Doe', amount: 42.50, status: 'UNPAID' },
      { id: 'share-26', userId: 'user-3', userName: 'Jane Smith', amount: 42.50, status: 'CONFIRMED' },
      { id: 'share-27', userId: 'user-4', userName: 'Bob Wilson', amount: 42.50, status: 'UNPAID' },
    ],
    createdAt: '2025-10-20T12:00:00Z',
  },
];

const mockUsers = [
  { id: 'mock-user-1', name: 'Admin User', email: 'admin@gmail.com' },
  { id: 'user-2', name: 'John Doe', email: 'john@example.com' },
  { id: 'user-3', name: 'Jane Smith', email: 'jane@example.com' },
  { id: 'user-4', name: 'Bob Wilson', email: 'bob@example.com' },
  { id: 'user-5', name: 'Alice Brown', email: 'alice@example.com' },
];

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    if (email === 'admin@gmail.com' && password === '1234') {
      return {
        data: {
          token: 'mock-jwt-token-for-testing',
          user: {
            id: 'mock-user-1',
            name: 'Admin User',
            email: 'admin@gmail.com',
          },
        },
      };
    }
    return api.post('/auth/login', { email, password });
  },
  signup: (name: string, email: string, password: string) =>
    api.post('/auth/signup', { name, email, password }),
  /** Send Google ID token to backend â†’ get our JWT back */
  googleAuth: (credential: string) =>
    api.post('/auth/google', { credential }),
  /** Reset password using the master password that was emailed at signup */
  forgotPassword: (email: string, masterPassword: string, newPassword: string) =>
    api.post('/auth/forgot-password', { email, masterPassword, newPassword }),
};

export const groupAPI = {
  getAll: () => {
    if (isMockMode()) {
      return Promise.resolve({ data: mockGroups });
    }
    const storedUser = localStorage.getItem('user');
    const userId = storedUser ? JSON.parse(storedUser).id : null;
    return api.get('/groups', { params: { userId } });
  },
  getById: (id: string) => {
    if (isMockMode()) {
      const group = mockGroups.find(g => g.id === id);
      return Promise.resolve({ data: group || mockGroups[0] });
    }
    return api.get(`/groups/${id}`);
  },
  create: (name: string, memberIds: (string | number)[], budgetLimit?: number) => {
    if (isMockMode()) {
      const newGroup = {
        id: `group-${Date.now()}`,
        name,
        members: mockUsers.filter(u => memberIds.includes(u.id) || u.id === 'mock-user-1'),
        latestEventSummary: 'No events yet',
        createdAt: new Date().toISOString(),
        groupCode: `CODE-${Date.now().toString().substring(8)}`,
        budgetLimit
      };
      mockGroups.push(newGroup);
      return Promise.resolve({ data: newGroup });
    }
    const storedUser = localStorage.getItem('user');
    const creatorId = storedUser ? JSON.parse(storedUser).id : null;
    return api.post('/groups', { name, creatorId, memberIds, budgetLimit });
  },
  join: (groupId: string) => api.post(`/groups/${groupId}/join`),
  submitJoinRequest: (groupCode: string, userId: string | number) => {
    if (isMockMode()) {
      const g = mockGroups.find(group => group.groupCode === groupCode);
      if (!g) return Promise.reject(new Error("Invalid group code"));
      const userObj = mockUsers.find(u => u.id === userId);
      if (userObj && !g.members.some((m: any) => m.id === userId)) {
        g.members.push(userObj);
      }
      return Promise.resolve({ data: { success: true } });
    }
    return api.post('/groups/join-request', { groupCode, userId });
  },
  listJoinRequests: (groupId: string | number) => {
    if (isMockMode()) {
      return Promise.resolve({ data: [] });
    }
    return api.get(`/groups/${groupId}/join-requests`);
  },
  approveJoinRequest: (groupId: string | number, requestId: string | number) => {
    if (isMockMode()) {
      return Promise.resolve({ data: { success: true } });
    }
    return api.post(`/groups/${groupId}/join-requests/${requestId}/approve`);
  },
  rejectJoinRequest: (groupId: string | number, requestId: string | number) => {
    if (isMockMode()) {
      return Promise.resolve({ data: { success: true } });
    }
    return api.post(`/groups/${groupId}/join-requests/${requestId}/reject`);
  },
  listPendingCreatorRequests: () => {
    if (isMockMode()) {
      return Promise.resolve({ data: [] });
    }
    return api.get('/groups/requests/pending');
  },
  leaveGroup: (groupId: string | number, userId: string | number) => {
    if (isMockMode()) {
      const g = mockGroups.find(group => group.id === groupId);
      if (g) {
        g.members = g.members.filter((m: any) => m.id !== userId);
      }
      return Promise.resolve({ data: { success: true } });
    }
    return api.delete(`/groups/${groupId}/members/${userId}`);
  },
  getGroupPairwise: (groupId: string | number) => {
    if (isMockMode()) {
      return Promise.resolve({ data: { pairwiseBalances: [] } });
    }
    return api.get(`/settlements/group/${groupId}/pairwise`);
  },
};

export const eventAPI = {
  getByGroup: (groupId: string, startDate: string, endDate: string) => {
    if (isMockMode()) {
      const filtered = mockEvents.filter(e => e.groupId === groupId);
      return Promise.resolve({ data: filtered });
    }
    return api.get(`/groups/${groupId}/events`, { params: { startDate, endDate } });
  },
  getById: (id: string) => {
    if (isMockMode()) {
      const event = mockEvents.find(e => e.id === id);
      return Promise.resolve({ data: event || mockEvents[0] });
    }
    return api.get(`/events/${id}`);
  },
  create: (groupId: string, title: string, startDate: string, endDate: string) => {
    if (isMockMode()) {
      const newEvent = {
        id: `event-${Date.now()}`,
        groupId,
        title,
        startDate,
        endDate,
        totalAmount: 0,
        createdAt: new Date().toISOString(),
      };
      mockEvents.push(newEvent);
      return Promise.resolve({ data: newEvent });
    }
    const storedUser = localStorage.getItem('user');
    const creatorId = storedUser ? JSON.parse(storedUser).id : null;
    // Backend expects 'name' field (not 'title') and requires groupId, name, creatorId, startDate, endDate
    return api.post('/events', {
      groupId: Number(groupId),
      name: title,
      creatorId,
      startDate,
      endDate,
    });
  },
};

export const subEventAPI = {
  getByEvent: async (eventId: string | number) => {
    if (isMockMode()) {
      const filtered = mockSubEvents.filter(s => s.eventId === String(eventId));
      return Promise.resolve({ data: filtered });
    }
    const response = await api.get<any[]>(`/events/${eventId}/subevents`);
    const subEventsWithShares = await Promise.all(
      response.data.map(async (subEvent) => {
        try {
          const sharesResponse = await api.get(`/subevents/${subEvent.id}/shares`);
          return {
            ...subEvent,
            shares: sharesResponse.data,
            sharers: sharesResponse.data
          };
        } catch {
          return { ...subEvent, shares: [], sharers: [] };
        }
      })
    );
    return { data: subEventsWithShares };
  },
  create: (data: {
    eventId: string | number;
    title: string;
    totalAmount: number;
    payerId?: string | number;
    subEventDate?: string;
    sharerIds: (string | number)[];
    splitType: 'EQUAL' | 'CUSTOM';
    customAmounts?: Record<string | number, number>;
    isRecurring?: boolean;
    recurringPeriod?: string;
  }) => {
    if (isMockMode()) {
      const perPerson = data.splitType === 'EQUAL'
        ? data.totalAmount / data.sharerIds.length
        : 0;

      const newSubEvent = {
        id: `subevent-${Date.now()}`,
        eventId: data.eventId,
        title: data.title,
        payerId: 'mock-user-1',
        payerName: 'Admin User',
        totalAmount: data.totalAmount,
        sharers: data.sharerIds.map(id => {
          const user = mockUsers.find(u => u.id === id);
          return {
            userId: id,
            userName: user?.name || 'Unknown',
            amount: data.splitType === 'EQUAL'
              ? perPerson
              : (data.customAmounts?.[id] || 0),
            status: 'PENDING' as const,
          };
        }),
        createdAt: new Date().toISOString(),
        isRecurring: data.isRecurring,
        recurringPeriod: data.recurringPeriod,
        nextRunDate: data.isRecurring ? new Date(Date.now() + 60000).toISOString() : undefined
      };
      mockSubEvents.push(newSubEvent);
      return Promise.resolve({ data: newSubEvent });
    }

    // Build the backend DTO
    const storedUser = localStorage.getItem('user');
    const currentUserId = storedUser ? JSON.parse(storedUser).id : null;
    const payerId = data.payerId ?? currentUserId;
    const perPerson = data.splitType === 'EQUAL'
      ? data.totalAmount / data.sharerIds.length
      : 0;
    const shares = data.sharerIds.map(id => ({
      userId: Number(id),
      amount: data.splitType === 'EQUAL'
        ? perPerson
        : (data.customAmounts?.[id] ?? 0),
    }));

    return api.post('/subevents', {
      eventId: Number(data.eventId),
      description: data.title,             // Backend field is 'description'
      totalAmount: data.totalAmount,
      payerId: Number(payerId),
      subEventDate: data.subEventDate ?? new Date().toISOString().slice(0, 10),
      shares,
      isRecurring: data.isRecurring ?? false,
      recurringPeriod: data.recurringPeriod ?? null,
    });
  },
  update: (id: string | number, data: {
    title: string;
    totalAmount: number;
    payerId: string | number;
    subEventDate?: string;
    sharerIds: (string | number)[];
    splitType: 'EQUAL' | 'CUSTOM';
    customAmounts?: Record<string | number, number>;
    isRecurring?: boolean;
    recurringPeriod?: string;
  }) => {
    const perPerson = data.splitType === 'EQUAL'
      ? data.totalAmount / data.sharerIds.length
      : 0;
    const shares = data.sharerIds.map(sid => ({
      userId: Number(sid),
      amount: data.splitType === 'EQUAL' ? perPerson : (data.customAmounts?.[sid] ?? 0),
    }));
    return api.put(`/subevents/${id}`, {
      description: data.title,
      totalAmount: data.totalAmount,
      payerId: Number(data.payerId),
      subEventDate: data.subEventDate ?? new Date().toISOString().slice(0, 10),
      shares,
      isRecurring: data.isRecurring ?? false,
      recurringPeriod: data.recurringPeriod ?? null,
    });
  },
  delete: (id: string | number) => api.delete(`/subevents/${id}`),
  markPaid: (shareId: string | number, transactionRef?: string, proofUrl?: string, subEventId?: string | number) => {
    if (isMockMode()) {
      const subEvent = mockSubEvents.find(s => s.id === subEventId);
      if (subEvent) {
        const userShare = subEvent.sharers.find((s: any) => s.userId === 'mock-user-1');
        if (userShare) {
          userShare.status = 'MARKED_AS_PAID';
          (userShare as any).transactionRef = transactionRef;
          (userShare as any).proofUrl = proofUrl;
        }
      }
      return Promise.resolve({ data: { success: true } });
    }
    return api.post('/payments/mark-paid', { shareId, transactionRef, proofUrl });
  },
  confirmPayment: (shareId: string | number, subEventId?: string | number) => {
    if (isMockMode()) {
      const subEvent = mockSubEvents.find(s => s.id === subEventId);
      if (subEvent) {
        // In mock mode, confirm the specific share by id
        const targetShare = subEvent.sharers.find((s: any) => s.id === shareId);
        if (targetShare && targetShare.status === 'MARKED_AS_PAID') {
          targetShare.status = 'CONFIRMED';
        }
      }
      return Promise.resolve({ data: { success: true } });
    }
    return api.post('/payments/confirm', { shareId });
  },
  settlePairwise: (groupId: string | number | null, eventId: string | number | null, debtorId: string | number, creditorId: string | number, amount: number) => {
    if (isMockMode()) {
      mockSubEvents.forEach(subEvent => {
        const payerId = subEvent.payerId;
        subEvent.sharers.forEach((s: any) => {
          if ((String(s.userId) === String(debtorId) && String(payerId) === String(creditorId)) ||
              (String(s.userId) === String(creditorId) && String(payerId) === String(debtorId))) {
            s.status = 'CONFIRMED';
          }
        });
      });
      return Promise.resolve({ data: { success: true } });
    }
    return api.post('/payments/settle-pairwise', { groupId, eventId, debtorId, creditorId, amount });
  },
};

export const userAPI = {
  search: (query: string) => {
    if (isMockMode()) {
      const filtered = mockUsers.filter(u =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
      );
      return Promise.resolve({ data: filtered });
    }
    return api.get('/users/search', { params: { q: query } });
  },
  getAll: () => {
    if (isMockMode()) {
      return Promise.resolve({ data: mockUsers });
    }
    return api.get('/users');
  },
  updateProfile: (userId: string | number, name: string, upiId: string) => {
    if (isMockMode()) {
      const u = mockUsers.find(user => user.id === userId);
      if (u) {
        u.name = name;
        (u as any).upiId = upiId;
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.id === userId) {
            parsed.name = name;
            parsed.upiId = upiId;
            localStorage.setItem('user', JSON.stringify(parsed));
          }
        }
      }
      return Promise.resolve({ data: { id: userId, name, email: u?.email || '', upiId } });
    }
    return api.put(`/users/${userId}`, { name, upiId });
  },
};

export const reportAPI = {
  getWeekly: (userId: string | number) => {
    if (isMockMode()) {
      // Build mock report from mockSubEvents
      const storedUser = localStorage.getItem('user');
      const currentUserId = storedUser ? JSON.parse(storedUser).id : 'mock-user-1';
      const uid = String(userId || currentUserId);
      const items: any[] = [];

      mockSubEvents.forEach((se: any) => {
        const isPayer = String(se.payerId) === uid;
        const myShare = se.sharers?.find((s: any) => String(s.userId) === uid);
        if (!isPayer && !myShare) return;

        const role = isPayer && myShare ? 'PAYER_AND_SHARER' : isPayer ? 'PAYER' : 'SHARER';
        const status = myShare ? (myShare.status === 'CONFIRMED' ? 'CONFIRMED' : myShare.status === 'MARKED_AS_PAID' ? 'MARKED_AS_PAID' : 'UNPAID') : 'N/A';
        const ev = mockEvents.find((e: any) => e.id === se.eventId);
        const gr = mockGroups.find((g: any) => g.id === ev?.groupId);

        items.push({
          subEventId: se.id,
          subEventDescription: se.title || se.description,
          totalAmount: se.totalAmount,
          subEventDate: se.createdAt?.slice(0, 10),
          weekNumber: 1,
          year: 2025,
          eventId: se.eventId,
          eventName: ev?.title || 'Event',
          groupId: gr?.id || '',
          groupName: gr?.name || 'Group',
          payerId: se.payerId,
          payerName: se.payerName || 'Unknown',
          role,
          myShareAmount: myShare?.amount || 0,
        status,
        });
      });
      return Promise.resolve({ data: items });
    }
    return api.get('/reports/weekly', { params: { userId } });
  },
};

export default api;
