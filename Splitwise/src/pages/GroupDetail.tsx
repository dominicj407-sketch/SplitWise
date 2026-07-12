import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Users, Calendar, Plus, ChevronLeft, ChevronRight, QrCode, Search, Download, LogOut, TrendingDown, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { groupAPI, eventAPI, userAPI, subEventAPI } from '../lib/api';
import { Group, Event, User } from '../types';
import { useToast } from '../components/Toast';
import { CreateEventModal } from '../components/CreateEventModal';
import { useAuth } from '../contexts/AuthContext';
import { BudgetAlertBanner } from '../components/BudgetAlertBanner';

export const GroupDetail = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [weeklySpent, setWeeklySpent] = useState<number>(0);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [groupSettlements, setGroupSettlements] = useState<any[]>([]);
  
  // Settle modal state
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [pendingSettle, setPendingSettle] = useState<{
    debtorId: any; creditorId: any;
    debtorName: string; creditorName: string;
    amount: number; isCurrentUserDebtor: boolean;
  } | null>(null);
  const [isSettling, setIsSettling] = useState(false);

  // Search & Invite states
  const [searchText, setSearchText] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { showToast, ToastContainer } = useToast();

  function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  const fetchGroupData = async () => {
    if (!groupId) return;

    try {
      const groupResponse = await groupAPI.getById(groupId);
      const groupData = groupResponse.data;
      setGroup(groupData);

      // Fetch all users to resolve memberIds to User objects
      try {
        const usersResponse = await userAPI.getAll();
        const allUsers: User[] = usersResponse.data;
        const memberIdSet = new Set(
          (groupData.memberIds || []).map((id: string | number) => String(id))
        );
        setMembers(allUsers.filter((u: User) => memberIdSet.has(String(u.id))));
      } catch {
        setMembers([]);
      }

      // Fetch group simplified pairwise settlements
      try {
        const setRes = await groupAPI.getGroupPairwise(groupId);
        // Backend now returns { groupId, pairwiseBalances: [...] } with user1Id/user1/user2Id/user2/amount
        setGroupSettlements(setRes.data?.pairwiseBalances || []);
      } catch {
        setGroupSettlements([]);
      }

      await fetchEvents();
    } catch (error) {
      showToast('Failed to load group', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExitGroup = async () => {
    if (!groupId || !user) return;
    if (!window.confirm('Are you sure you want to exit this group?')) return;
    try {
      await groupAPI.leaveGroup(groupId, user.id);
      showToast('Successfully exited group!', 'success');
      navigate('/dashboard');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to exit group. Verify if you have non-zero balance.', 'error');
    }
  };

  const initiateSettle = (item: any, isDebtor: boolean) => {
    setPendingSettle({
      debtorId: item.user1Id,
      creditorId: item.user2Id,
      debtorName: item.user1,
      creditorName: item.user2,
      amount: Number(item.amount),
      isCurrentUserDebtor: isDebtor,
    });
    setShowSettleModal(true);
  };

  const confirmSettle = async () => {
    if (!pendingSettle || !groupId) return;
    setIsSettling(true);
    try {
      await subEventAPI.settlePairwise(
        Number(groupId), null,
        pendingSettle.debtorId, pendingSettle.creditorId,
        pendingSettle.amount
      );
      showToast('Settlement confirmed! All related payments marked as settled.', 'success');
      setShowSettleModal(false);
      setPendingSettle(null);
      fetchGroupData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to settle balance', 'error');
    } finally {
      setIsSettling(false);
    }
  };

  const fetchEvents = async () => {
    if (!groupId) return;
    try {
      // Backend returns all events for the group; we filter client-side by week
      const response = await eventAPI.getByGroup(groupId, '', '');
      const all: Event[] = response.data;
      setAllEvents(all);
      filterEventsByWeek(all, currentWeekStart);
    } catch (error) {
      showToast('Failed to load events', 'error');
    }
  };

  const filterEventsByWeek = async (all: Event[], weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const startStr = fmt(weekStart);
    const endStr = fmt(weekEnd);

    const inWeek = all.filter(e => {
      const s = e.startDate ? e.startDate.slice(0, 10) : '';
      return s >= startStr && s <= endStr;
    });
    setEvents(inWeek);

    // Fetch subevents for events in this week to compute total spend for budget bar
    if (!isMockMode()) {
      try {
        let total = 0;
        for (const ev of inWeek) {
          const subRes = await subEventAPI.getByEvent(String(ev.id));
          for (const sub of subRes.data) {
            total += Number(sub.totalAmount) || 0;
          }
        }
        setWeeklySpent(total);
      } catch {
        setWeeklySpent(inWeek.reduce((s, e) => s + (e.totalAmount || 0), 0));
      }
    } else {
      setWeeklySpent(inWeek.reduce((s, e) => s + (e.totalAmount || 0), 0));
    }
  };

  const isMockMode = () => localStorage.getItem('mockMode') === 'true';

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  useEffect(() => {
    if (group) {
      filterEventsByWeek(allEvents, currentWeekStart);
    }
  }, [currentWeekStart]);

  const nextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const prevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const formatDateRange = () => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    return `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const handleEventCreated = () => {
    setShowCreateModal(false);
    fetchEvents();
  };

  const handleExportCSV = () => {
    const headers = ["Event Title", "Start Date", "End Date", "Total Amount (INR)"];
    const rows = events.map(e => [
      e.name || e.title || "Unnamed Event",
      new Date(e.startDate).toLocaleDateString(),
      new Date(e.endDate).toLocaleDateString(),
      (e.totalAmount || 0).toFixed(2)
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${group?.name || 'group'}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Expenses exported successfully!', 'success');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-gray-600 dark:text-gray-400">Group not found</p>
        </div>
      </div>
    );
  }

  const handleEditBudget = async () => {
    if (!group || !groupId) return;
    const current = group.budgetLimit;
    const input = window.prompt('Set group budget limit (₹). Leave blank to remove.', current ? String(current) : '');
    if (input === null) return; // cancelled
    const trimmed = input.trim();
    const budgetLimit = trimmed === '' ? null : Number(trimmed);
    if (budgetLimit !== null && (isNaN(budgetLimit) || budgetLimit < 0)) {
      showToast('Enter a valid non-negative number', 'error');
      return;
    }
    try {
      await groupAPI.update(groupId, { name: group.name, budgetLimit });
      showToast('Budget updated', 'success');
      fetchGroupData();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to update budget', 'error');
    }
  };

  // weeklySpent is loaded from state (computed from real subevent totals)
  const budgetLimit = group?.budgetLimit || 0;

  const filteredEvents = events.filter(e => {
    const label = e.name || e.title || '';
    return label.toLowerCase().includes(searchText.toLowerCase());
  });

  const inviteLink = `${window.location.origin}/groups/join/${group.groupCode}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navbar />
      <ToastContainer />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Group Header */}
        <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{group.name}</h1>
            <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <Users className="w-5 h-5" />
                <span>{(group.memberIds?.length || group.members?.length || 0)} members</span>
              </div>
              {group.groupCode && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                  Code: {group.groupCode}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {group && user && String(group.creatorId) !== String(user.id) && (
              <button
                onClick={handleExitGroup}
                className="flex items-center gap-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-650 px-4 py-2 rounded-lg text-sm font-medium transition dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <LogOut className="w-4 h-4" />
                Exit Group
              </button>
            )}
            {group && user && String(group.creatorId) === String(user.id) && (
              <button
                onClick={handleEditBudget}
                className="flex items-center gap-2 bg-white border border-gray-300 dark:border-gray-650 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                💰 Edit Budget
              </button>
            )}
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 bg-white border border-gray-300 dark:border-gray-650 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <QrCode className="w-4 h-4" />
              Invite Link / QR
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-white border border-gray-300 dark:border-gray-650 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Budget Alert Banner */}
        <BudgetAlertBanner
          spent={weeklySpent}
          limit={Number(budgetLimit)}
          groupName={group.name}
        />

        {/* Members Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Members</h2>
          <div className="flex flex-wrap gap-2">
            {members.length > 0 ? members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-full"
              >
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">{member.name}</span>
              </div>
            )) : (group.memberIds || []).map((memberId) => (
              <div
                key={memberId}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-full"
              >
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">?</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">Member #{memberId}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Settlement Center ===== */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md mb-6 overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-950/30 dark:to-indigo-950/20">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Settlement Center</h2>
              {groupSettlements.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs rounded-full font-semibold">
                  {groupSettlements.length} pending
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Net balances · Circular debts resolved
            </p>
          </div>

          {groupSettlements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
              <p className="font-semibold text-gray-700 dark:text-gray-200">All settled up! 🎉</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No outstanding balances in this group.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {groupSettlements.map((item: any, idx: number) => {
                const isDebtor   = user && String(item.user1Id) === String(user.id);
                const isCreditor = user && String(item.user2Id) === String(user.id);
                const isInvolved = isDebtor || isCreditor;

                return (
                  <div
                    key={idx}
                    className={`flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-4 transition ${
                      isDebtor   ? 'bg-red-50/60   dark:bg-red-950/10' :
                      isCreditor ? 'bg-green-50/60 dark:bg-green-950/10' : ''
                    }`}
                  >
                    {/* Direction label */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex flex-col items-start gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            isDebtor ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {item.user1}{isDebtor ? ' (You)' : ''}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            isCreditor ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {item.user2}{isCreditor ? ' (You)' : ''}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${
                          isDebtor   ? 'text-red-600 dark:text-red-400' :
                          isCreditor ? 'text-green-600 dark:text-green-400' :
                                       'text-gray-500 dark:text-gray-400'
                        }`}>
                          {isDebtor   && `You owe ${item.user2} — this is the net after offsetting mutual payments`}
                          {isCreditor && `${item.user1} owes you — net after offsetting mutual payments`}
                          {!isInvolved && 'Settlement pending between these two members (you are not involved)'}
                        </p>
                        {item.description && (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 italic font-medium leading-relaxed bg-gray-50 dark:bg-gray-800/40 p-2 rounded-lg border border-gray-100/50 dark:border-gray-700/30">
                            💡 {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Amount + Settle button */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                          ₹{Number(item.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">net amount</p>
                      </div>
                      {isInvolved ? (
                        <button
                          id={`settle-btn-${idx}`}
                          onClick={() => initiateSettle(item, !!isDebtor)}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-sm ${
                            isDebtor
                              ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
                              : 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {isDebtor ? "Settle" : 'Confirm Received'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">(not involved)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


        {/* Filters and Action Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Week navigation */}
            <div className="flex items-center justify-center gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-1 bg-white dark:bg-gray-800">
              <button
                onClick={prevWeek}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-750 transition"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-250">
                  {formatDateRange()}
                </span>
              </div>
              <button
                onClick={nextWeek}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-755 transition"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-60"
              />
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium w-full md:w-auto"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No events found
            </h3>
            <p className="text-gray-650 dark:text-gray-400 mb-4">
              Try a different search or create a new event for this week
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-transparent hover:border-primary-500 hover:bg-primary-50/5 dark:hover:bg-primary-950/10"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 truncate">
                  {event.name || event.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {new Date(event.startDate).toLocaleDateString()} -{' '}
                  {new Date(event.endDate).toLocaleDateString()}
                </p>
                <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                  ₹{(event.totalAmount || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Links Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4 text-center">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">Group Invitation</h3>
            <p className="text-xs text-gray-500 mb-4">Let friends scan this QR code or use the link to request joining this group.</p>
            
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteLink)}`} 
              alt="Group Invite Link QR Code" 
              className="mx-auto border p-2 bg-white rounded-lg mb-4"
            />
            
            <div className="bg-gray-55 bg-gray-50 dark:bg-gray-700 p-2.5 rounded text-xs font-mono text-gray-900 dark:text-gray-200 break-all select-all border dark:border-gray-600">
              {inviteLink}
            </div>
            
            <button 
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                showToast('Invite link copied to clipboard!', 'success');
              }}
              className="mt-3 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-semibold w-full transition"
            >
              Copy Link
            </button>
            
            <button 
              onClick={() => setShowInviteModal(false)}
              className="mt-2 px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded w-full transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ===== Settlement Confirmation Modal ===== */}
      {showSettleModal && pendingSettle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className={`px-6 py-4 ${
              pendingSettle.isCurrentUserDebtor
                ? 'bg-gradient-to-r from-red-500 to-orange-500'
                : 'bg-gradient-to-r from-green-500 to-emerald-500'
            }`}>
              <h3 className="text-white font-bold text-lg">
                {pendingSettle.isCurrentUserDebtor ? '💸 Confirm Payment Settlement' : '✅ Confirm Receipt'}
              </h3>
              <p className="text-white/80 text-xs mt-0.5">
                {pendingSettle.isCurrentUserDebtor
                  ? 'Confirm that you have paid this net balance'
                  : 'Confirm that you have received this net balance'}
              </p>
            </div>

            {/* Settlement Details */}
            <div className="px-6 py-5">
              {/* Net Amount Card */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Net amount to settle</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">
                  ₹{pendingSettle.amount.toFixed(2)}
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-xs font-bold">
                    {pendingSettle.debtorName}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                    {pendingSettle.creditorName}
                  </span>
                </div>
              </div>

              {/* Explanation */}
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 mb-5">
                <p className="font-semibold mb-1">ℹ️ How this works</p>
                <p>This net amount is calculated after offsetting any mutual payments between {pendingSettle.debtorName} and {pendingSettle.creditorName}.</p>
                <p className="mt-1">Confirming will mark <b>all payment records</b> between these two users as <b>settled/confirmed</b>. Only ₹{pendingSettle.amount.toFixed(2)} needs to actually change hands.</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowSettleModal(false); setPendingSettle(null); }}
                  disabled={isSettling}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition"
                >
                  <XCircle className="w-4 h-4" /> Cancel
                </button>
                <button
                  id="confirm-settle-btn"
                  onClick={confirmSettle}
                  disabled={isSettling}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition ${
                    pendingSettle.isCurrentUserDebtor
                      ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                      : 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                  }`}
                >
                  {isSettling ? (
                    <><span className="animate-spin">⏳</span> Processing...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> {pendingSettle.isCurrentUserDebtor ? 'Confirm Payment' : 'Confirm Receipt'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleEventCreated}
        groupId={groupId!}
      />
    </div>
  );
};
