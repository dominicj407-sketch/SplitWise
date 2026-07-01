import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { groupAPI } from '../lib/api';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const JoinGroup = () => {
  const { groupCode } = useParams<{ groupCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const requestJoin = async () => {
      if (!groupCode || !user) {
        setStatus('error');
        setErrorMsg('Invalid code or not logged in.');
        return;
      }

      try {
        await groupAPI.submitJoinRequest(groupCode, user.id);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.response?.data?.message || 'Failed to submit join request. The code might be invalid or you are already a member.');
      }
    };

    requestJoin();
  }, [groupCode, user]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navbar />

      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border dark:border-gray-700">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Processing Request...</h2>
              <p className="text-sm text-gray-500 mt-2">Joining group with invite code "{groupCode}"</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Request Submitted!</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Your request to join the group has been sent. The group admin needs to approve it before you can view group expenses.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="py-6">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Join Request Failed</h2>
              <p className="text-sm text-red-600 dark:text-red-400 mb-6 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-950">
                {errorMsg}
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg transition"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
