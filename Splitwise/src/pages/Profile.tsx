import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import {
  Mail, User as UserIcon, QrCode, Save, Edit2, X,
  BarChart2, Download, Calendar, CheckCircle, AlertCircle,
  Clock, TrendingUp, FileText
} from 'lucide-react';
import { userAPI, reportAPI } from '../lib/api';
import { useToast } from '../components/Toast';

interface WeeklyReportItem {
  subEventId: number;
  subEventDescription: string;
  totalAmount: number;
  subEventDate: string;
  weekNumber: number;
  year: number;
  eventId: number;
  eventName: string;
  groupId: number;
  groupName: string;
  payerId: number;
  payerName: string;
  role: 'PAYER' | 'SHARER' | 'PAYER_AND_SHARER';
  myShareAmount: number;
  status: string;
}

type Tab = 'account' | 'weekly-report';

const roleLabel = (role: string) => {
  switch (role) {
    case 'PAYER_AND_SHARER': return { label: 'Payer & Sharer', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' };
    case 'PAYER': return { label: 'Payer', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' };
    case 'SHARER': return { label: 'Sharer', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' };
    default: return { label: role, color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' };
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'CONFIRMED':      return { label: 'Confirmed', icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' };
    case 'MARKED_AS_PAID':return { label: 'Paid', icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300' };
    case 'UNPAID':         return { label: 'Unpaid', icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300' };
    case 'PENDING':        return { label: 'Pending', icon: <Clock className="w-3.5 h-3.5" />, color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' };
    case 'N/A':            return { label: 'N/A (Payer)', icon: null, color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' };
    default:               return { label: status, icon: null, color: 'bg-gray-100 dark:bg-gray-700 text-gray-500' };
  }
};

export const Profile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [reportData, setReportData] = useState<WeeklyReportItem[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const { showToast, ToastContainer } = useToast();

  const fetchReport = useCallback(async () => {
    if (!user) return;
    setReportLoading(true);
    try {
      const res = await reportAPI.getWeekly(user.id);
      setReportData(res.data);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = status === 404
        ? 'Report endpoint not found — please restart the backend server.'
        : status === 401 || status === 403
        ? 'Authentication error — please log out and log in again.'
        : err?.response?.data?.message || 'Failed to load weekly report.';
      showToast(msg, 'error');
      console.error('[WeeklyReport] Error:', err);
    } finally {
      setReportLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'weekly-report') {
      fetchReport();
    }
  }, [activeTab, fetchReport]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await userAPI.updateProfile(user.id, name, upiId);
      localStorage.setItem('user', JSON.stringify(res.data));
      setIsEditing(false);
      window.location.reload();
    } catch {
      showToast('Failed to update profile. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadCSV = () => {
    const headers = ['Week', 'Date', 'Payment', 'Event', 'Group', 'Payer', 'Total Amount (₹)', 'My Share (₹)', 'My Role', 'Status'];
    const rows = reportData.map(item => [
      `Week ${item.weekNumber} (Year ${item.year})`,
      item.subEventDate || '',
      item.subEventDescription,
      item.eventName,
      item.groupName,
      item.payerName,
      Number(item.totalAmount).toFixed(2),
      Number(item.myShareAmount).toFixed(2),
      roleLabel(item.role).label,
      statusLabel(item.status).label,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${user?.name || 'my'}_weekly_report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV report downloaded!', 'success');
  };

  // Group report rows by week label
  const groupedReport: Record<string, WeeklyReportItem[]> = {};
  reportData.forEach(item => {
    const key = `Week ${item.weekNumber} (Year ${item.year})`;
    if (!groupedReport[key]) groupedReport[key] = [];
    groupedReport[key].push(item);
  });

  const totalOwed = reportData
    .filter(i => i.role !== 'PAYER' && (i.status === 'UNPAID' || i.status === 'PENDING'))
    .reduce((s, i) => s + Number(i.myShareAmount), 0);
  const totalPaid = reportData
    .filter(i => i.role !== 'PAYER' && (i.status === 'CONFIRMED' || i.status === 'MARKED_AS_PAID'))
    .reduce((s, i) => s + Number(i.myShareAmount), 0);
  const totalPaidOut = reportData
    .filter(i => i.role === 'PAYER_AND_SHARER')
    .reduce((s, i) => s + Number(i.totalAmount), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navbar />
      <ToastContainer />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Manage your account and view your spending reports</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-8 w-fit">
          <button
            id="tab-account"
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'account'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Account Info
          </button>
          <button
            id="tab-weekly-report"
            onClick={() => setActiveTab('weekly-report')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'weekly-report'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Weekly Report
          </button>
        </div>

        {/* ======== ACCOUNT INFO TAB ======== */}
        {activeTab === 'account' && (
          <div className="max-w-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Account Information</h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setName(user?.name || ''); setUpiId(user?.upiId || ''); setIsEditing(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8">
              <div className="flex items-center justify-center mb-8">
                <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-3xl">
                    {(name || user?.name || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <UserIcon className="w-4 h-4" />
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">{user?.name}</div>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">{user?.email}</div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <QrCode className="w-4 h-4" />
                    UPI ID (for receiving split payments)
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      placeholder="e.g. jerry@okaxis"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white italic">
                      {user?.upiId || 'Not configured'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======== WEEKLY REPORT TAB ======== */}
        {activeTab === 'weekly-report' && (
          <div>
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  Your Weekly Payment Report
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">All payments you paid for or participated in, grouped by week</p>
              </div>
              <button
                id="download-csv-btn"
                onClick={downloadCSV}
                disabled={reportData.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            </div>

            {/* Summary Stats */}
            {reportData.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">You Owe</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{totalOwed.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Unpaid / Pending shares</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">You Paid</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{totalPaid.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Confirmed / Marked as paid</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">You Covered</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{totalPaidOut.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Total of payments you made</p>
                </div>
              </div>
            )}

            {/* Content */}
            {reportLoading ? (
              <div className="flex flex-col items-center py-20 text-gray-400">
                <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mb-4" />
                <p>Loading your report...</p>
              </div>
            ) : reportData.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 py-20 text-center">
                <BarChart2 className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="font-semibold text-gray-600 dark:text-gray-300 text-lg">No payments found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">You haven't participated in any payments yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedReport).map(([weekLabel, items]) => {
                  const weekTotal = items.reduce((s, i) => s + Number(i.myShareAmount), 0);
                  return (
                    <div key={weekLabel} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                      {/* Week Header */}
                      <div className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-950/30 dark:to-indigo-950/20 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">{weekLabel}</span>
                          <span className="ml-1 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs rounded-full font-semibold">
                            {items.length} payment{items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-primary-700 dark:text-primary-300">My share total: ₹{weekTotal.toFixed(2)}</span>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                              <th className="px-6 py-3 text-left">Payment</th>
                              <th className="px-4 py-3 text-left">Event / Group</th>
                              <th className="px-4 py-3 text-left">Date</th>
                              <th className="px-4 py-3 text-left">Payer</th>
                              <th className="px-4 py-3 text-right">Total</th>
                              <th className="px-4 py-3 text-right">My Share</th>
                              <th className="px-4 py-3 text-center">Role</th>
                              <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {items.map((item) => {
                              const role = roleLabel(item.role);
                              const status = statusLabel(item.status);
                              return (
                                <tr key={item.subEventId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                  <td className="px-6 py-3.5">
                                    <span className="font-medium text-gray-900 dark:text-white">{item.subEventDescription}</span>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <p className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-[120px]">{item.eventName}</p>
                                    <p className="text-xs text-gray-400 truncate max-w-[120px]">{item.groupName}</p>
                                  </td>
                                  <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    {item.subEventDate || '—'}
                                  </td>
                                  <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300">{item.payerName}</td>
                                  <td className="px-4 py-3.5 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                    ₹{Number(item.totalAmount).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3.5 text-right font-bold text-primary-700 dark:text-primary-400 whitespace-nowrap">
                                    {item.myShareAmount > 0 ? `₹${Number(item.myShareAmount).toFixed(2)}` : '—'}
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${role.color}`}>
                                      {role.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                                      {status.icon}
                                      {status.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
