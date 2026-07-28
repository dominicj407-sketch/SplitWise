import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Plus, Users, Calendar, AlertCircle } from 'lucide-react';
import { groupAPI } from '../lib/api';
import { Group } from '../types';
import { useToast } from '../components/Toast';
import { CreateGroupModal } from '../components/CreateGroupModal';

export const Dashboard = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [groupCode, setGroupCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();

  const fetchGroups = async () => {
    try {
      const [response, reqRes] = await Promise.all([
        groupAPI.getAll(),
        groupAPI.listPendingCreatorRequests(),
      ]);
      setGroups(response.data);
      setPendingRequests(reqRes.data || []);
    } catch (error) {
      showToast('Failed to load groups', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleGroupCreated = () => {
    setShowCreateModal(false);
    fetchGroups();
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupCode.trim()) {
      showToast('Please enter a group code', 'error');
      return;
    }

    setIsJoining(true);
    try {
      const storedUser = localStorage.getItem('user');
      const userId = storedUser ? JSON.parse(storedUser).id : null;
      if (!userId) {
        showToast('Not authenticated', 'error');
        return;
      }

      await groupAPI.submitJoinRequest(groupCode.trim().toUpperCase(), userId);
      showToast('Join request submitted successfully! Creator approval pending.', 'success');
      setGroupCode('');
      setShowJoinModal(false);
      fetchGroups();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to submit join request', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleApproveRequest = async (groupId: number | string, requestId: number | string) => {
    try {
      await groupAPI.approveJoinRequest(groupId, requestId);
      showToast('Request approved successfully!', 'success');
      fetchGroups();
    } catch (err) {
      showToast('Failed to approve request', 'error');
    }
  };

  const handleRejectRequest = async (groupId: number | string, requestId: number | string) => {
    try {
      await groupAPI.rejectJoinRequest(groupId, requestId);
      showToast('Request rejected successfully!', 'success');
      fetchGroups();
    } catch (err) {
      showToast('Failed to reject request', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navbar />
      <ToastContainer />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {pendingRequests.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-primary-500 dark:border-primary-800 mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary-500" />
              Pending Join Requests
            </h2>
            <div className="space-y-4">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-700">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      User ID {req.requesterId} requested to join Group Code <span className="font-mono bg-gray-200 dark:bg-gray-750 px-1 rounded">{req.groupCode}</span>
                    </p>
                    <p className="text-xs text-gray-550 dark:text-gray-400 mt-1">
                      Requested at: {new Date(req.requestedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveRequest(req.groupId, req.id)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.groupId, req.id)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Groups</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your shared expenses across groups
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-2 bg-white border border-gray-300 dark:border-gray-650 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Users className="w-5 h-5 text-gray-500" />
              Join Group
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Group
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No groups yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first group or join one to start tracking shared expenses
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowJoinModal(true)}
                className="inline-flex items-center gap-2 bg-white border border-gray-300 dark:border-gray-650 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg transition-colors"
              >
                <Users className="w-5 h-5 text-gray-500" />
                Join Existing Group
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Group
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => navigate(`/groups/${group.id}`)}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-transparent hover:border-primary-600 hover:bg-primary-50"
              >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {group.name}
                </h3>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{(group.memberIds?.length || group.members?.length || 0)} members</span>
                </div>
                {group.latestEventSummary && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{group.latestEventSummary}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleGroupCreated}
      />

      {/* Join Group Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">Join Group</h3>
            <p className="text-xs text-gray-550 dark:text-gray-400 mb-4">
              Enter the unique 8-10 digit Group Code to request access to join.
            </p>
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="e.g. ABCDEFGH"
                value={groupCode}
                onChange={(e) => setGroupCode(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-center uppercase tracking-widest text-lg"
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="w-1/2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="w-1/2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded transition disabled:opacity-50"
                >
                  {isJoining ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
