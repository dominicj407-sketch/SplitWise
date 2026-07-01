import { api } from './client'

export const UsersApi = {
  list: () => api.get('/users').then(r => r.data),
  create: (payload: { name: string; email: string; password: string }) => api.post('/users', payload).then(r => r.data),
  get: (id: number) => api.get(`/users/${id}`).then(r => r.data),
  joinRequests: (userId: number) => api.get(`/users/${userId}/join-requests`).then(r => r.data),
}

export const AuthApi = {
  login: (payload: { email: string; password: string }) => api.post('/auth/login', payload).then(r => r.data),
}

export const GroupsApi = {
  create: (payload: { name: string; creatorId: number; memberIds: number[] }) => api.post('/groups', payload).then(r => r.data),
  get: (id: number) => api.get(`/groups/${id}`).then(r => r.data),
  listForUser: (userId: number) => api.get(`/groups`, { params: { userId } }).then(r => r.data),
  addMember: (groupId: number, userId: number) => api.post(`/groups/${groupId}/members`, { userId }).then(r => r.data),
  removeMember: (groupId: number, userId: number) => api.delete(`/groups/${groupId}/members/${userId}`).then(r => r.data),
  generateCode: (groupId: number) => api.post(`/groups/${groupId}/generate-code`).then(r => r.data),
  getCode: (groupId: number) => api.get(`/groups/${groupId}/code`).then(r => r.data),
  submitJoinRequest: (payload: { groupCode: string; userId: number }) => api.post('/groups/join-request', payload).then(r => r.data),
  listJoinRequests: (groupId: number) => api.get(`/groups/${groupId}/join-requests`).then(r => r.data),
  approveJoin: (groupId: number, requestId: number) => api.post(`/groups/${groupId}/join-requests/${requestId}/approve`).then(r => r.data),
  rejectJoin: (groupId: number, requestId: number) => api.post(`/groups/${groupId}/join-requests/${requestId}/reject`).then(r => r.data),
  invite: (groupId: number, invitedUserId: number) => api.post(`/groups/${groupId}/invite`, { groupId, invitedUserId }).then(r => r.data),
  listMyInvitations: (userId: number) => api.get(`/groups/invitations/my`, { params: { userId } }).then(r => r.data),
  respondToInvitation: (invitationId: number, status: 'ACCEPTED' | 'REJECTED', userId: number) => api.post(`/groups/invitations/${invitationId}/respond`, { status, userId }).then(r => r.data),
  newEventWarning: (groupId: number, date?: string) => api.get(`/groups/${groupId}/weeks/new-event-warning`, { params: { date } }).then(r => r.data),
  deleteGroup: (groupId: number) => api.delete(`/groups/${groupId}`).then(r => r.data),
  listPendingJoinRequests: () => api.get('/groups/requests/pending').then(r => r.data),
}

export const EventsApi = {
  create: (payload: { groupId: number; name: string; creatorId: number; startDate: string; endDate: string }) => api.post('/events', payload).then(r => r.data),
  listByGroup: (groupId: number) => api.get(`/groups/${groupId}/events`).then(r => r.data),
  listByGroupWeek: (groupId: number, week: number, year: number) => api.get(`/groups/${groupId}/events/by-week`, { params: { week, year } }).then(r => r.data),
  listWeeks: (groupId: number) => api.get(`/groups/${groupId}/weeks`).then(r => r.data),
  get: (id: number) => api.get(`/events/${id}`).then(r => r.data),
  newEventWarning: (groupId: number, date?: string) => api.get(`/groups/${groupId}/weeks/new-event-warning`, { params: { date } }).then(r => r.data),
  deleteEvent: (id: number) => api.delete(`/events/${id}`).then(r => r.data),
}

export const SubEventsApi = {
  create: (payload: { eventId: number; description: string; totalAmount: string; payerId: number; subEventDate: string; shares: { userId: number; amount: string }[] }) => api.post('/subevents', payload).then(r => r.data),
  listByEvent: (eventId: number) => api.get(`/events/${eventId}/subevents`).then(r => r.data),
  get: (id: number) => api.get(`/subevents/${id}`).then(r => r.data),
}

export const SharesApi = {
  listBySubEvent: (subEventId: number) => api.get(`/subevents/${subEventId}/shares`).then(r => r.data),
  listByUser: (userId: number) => api.get(`/users/${userId}/shares`).then(r => r.data),
  get: (id: number) => api.get(`/shares/${id}`).then(r => r.data),
}

export const PaymentsApi = {
  markPaid: (shareId: number) => api.post('/payments/mark-paid', { shareId }).then(r => r.data),
  confirm: (shareId: number) => api.post('/payments/confirm', { shareId }).then(r => r.data),
}

export const SettlementsApi = {
  group: (groupId: number) => api.get(`/settlements/group/${groupId}`).then(r => r.data),
  user: (userId: number) => api.get(`/settlements/user/${userId}`).then(r => r.data),
  pairwise: (groupId: number) => api.get(`/settlements/group/${groupId}/pairwise`).then(r => r.data),
  byWeek: (groupId: number, week: number, year: number) => api.get(`/settlements/group/${groupId}/by-week`, { params: { week, year } }).then(r => r.data),
  balancesByWeek: (groupId: number, week: number, year: number) => api.get(`/settlements/group/${groupId}/balances/by-week`, { params: { week, year } }).then(r => r.data),
  eventPairwise: (eventId: number) => api.get(`/settlements/event/${eventId}/pairwise`).then(r => r.data),
  mySpendEvent: (eventId: number) => api.get(`/settlements/event/${eventId}/my-spend`).then(r => r.data),
  mySpendGroup: (groupId: number) => api.get(`/settlements/group/${groupId}/my-spend`).then(r => r.data),
}
