export type PaymentState = 'UNPAID' | 'MARKED_AS_PAID' | 'CONFIRMED'

export interface UserResponse { id: number; name: string; email: string; createdAt: string }
export interface GroupResponse { id: number; name: string; creatorId: number; memberIds: number[]; createdAt: string; groupCode?: string }
export interface EventResponse { id: number; name: string; groupId: number; creatorId: number; createdAt: string; startDate: string; endDate: string; weekNumber?: number; year?: number }
export interface SubEventResponse { id: number; description: string; totalAmount: string; payerId: number; eventId: number; eventCreatorId: number; timestamp: string; subEventDate?: string; weekNumber?: number; year?: number }
export interface ShareResponse { id: number; subEventId: number; userId: number; payerId: number; amount: string; status: PaymentState; markedAt?: string; confirmedAt?: string }
export interface UserBalance { userId: number; netBalance: string }
export interface GroupSettlementSummary { groupId: number; balances: UserBalance[]; outstandingConfirmations: number }
export interface UserOutstandingDebts { userId: number; debts: ShareResponse[] }
export interface AuthResponse { token: string; user: UserResponse }

export interface GenerateGroupCodeResponse { groupId: number; groupCode: string }
export interface GroupCodeResponse { groupId: number; groupCode: string }
export interface JoinRequestResponse { id: number; groupId: number; groupCode: string; requesterId: number; status: 'PENDING' | 'APPROVED' | 'REJECTED'; requestedAt: string; respondedAt?: string; respondedBy?: number }
export interface WeekSummary { weekNumber: number; year: number; eventCount: number }
export interface ToPayEntry { userId: number; toUser: string; amount: string }
export interface ToReceiveEntry { userId: number; fromUser: string; amount: string }
export interface PairwiseBalance { user1Id: number; user1: string; user2Id: number; user2: string; amount: string; owedBy: string; description?: string }
export interface WeeklySettlementResponse { weekNumber: number; year: number; currentUser: number; toPay: ToPayEntry[]; toReceive: ToReceiveEntry[]; pairwiseBalances: PairwiseBalance[] }
export interface InvitationResponse { id: number; groupId: number; groupName: string; invitedUserId: number; invitedUserName: string; invitedById: number; invitedByName: string; status: 'PENDING' | 'ACCEPTED' | 'REJECTED'; createdAt: string }
export interface NewEventWarningResponse { warn: boolean; blocked: boolean; droppingWeek?: number | null; droppingYear?: number | null; pendingPayments: number; message?: string | null }
export interface EventSettlementResponse { eventId: number; pairwiseBalances: PairwiseBalance[] }
export interface PairwiseOwe { fromUserId: number; toUserId: number; amount: string; description?: string }
export interface GroupPairwise { groupId: number; owes: PairwiseOwe[]; pairwiseBalances: PairwiseBalance[] }
export interface SpendResponse { amount: string }
