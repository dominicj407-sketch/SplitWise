import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, KeyRound, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../lib/api';
import { useToast } from '../components/Toast';

type Step = 'email' | 'reset' | 'success';

export const ForgotPassword = () => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showMaster, setShowMaster] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast, ToastContainer } = useToast();
  const navigate = useNavigate();

  const handleEmailNext = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStep('reset');
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await authAPI.forgotPassword(email, masterPassword, newPassword);
      setStep('success');
    } catch (err: any) {
      const msg = err?.response?.data?.message
        || err?.response?.data
        || 'Invalid master password or account not found';
      showToast(String(msg), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-4 transition-colors">
      <ToastContainer />
      <div className="max-w-md w-full">

        {/* Back to login */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-colors">

          {/* ── Step Indicator ── */}
          <div className="flex items-center gap-2 mb-8">
            {(['email', 'reset', 'success'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900'
                    : (['email', 'reset', 'success'].indexOf(step) > i)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {(['email', 'reset', 'success'].indexOf(step) > i) ? '✓' : i + 1}
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 transition-all ${(['email', 'reset', 'success'].indexOf(step) > i) ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />}
              </div>
            ))}
          </div>

          {/* ── STEP 1: Email ── */}
          {step === 'email' && (
            <>
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-indigo-200 dark:shadow-indigo-900">
                  <KeyRound className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot Password?</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm text-center">
                  Enter your email address to continue
                </p>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-6">
                <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  💡 You'll need the <strong>master password</strong> that was sent to your email when you first signed up.
                </p>
              </div>

              <form onSubmit={handleEmailNext} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="forgot-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  Continue →
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: Master Password + New Password ── */}
          {step === 'reset' && (
            <>
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-indigo-200 dark:shadow-indigo-900">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{email}</p>
              </div>

              <form onSubmit={handleReset} className="space-y-5">
                {/* Master Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Master Password
                    <span className="ml-1 text-xs text-gray-400">(from your signup email)</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showMaster ? 'text' : 'password'}
                      id="master-password"
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono tracking-widest transition-colors"
                      placeholder="••••••••••••"
                      required
                    />
                    <button type="button" onClick={() => setShowMaster(!showMaster)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showMaster ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showNew ? 'text' : 'password'}
                      id="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      id="confirm-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-red-400 dark:border-red-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Repeat new password"
                      required
                    />
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || (!!confirmPassword && confirmPassword !== newPassword)}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all shadow-md"
                  >
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── STEP 3: Success ── */}
          {step === 'success' && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Password Reset!</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">
                Your password has been updated successfully. A confirmation email has been sent to <strong>{email}</strong>.
              </p>
              <button
                id="goto-login-btn"
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all shadow-md"
              >
                Log In with New Password
              </button>
            </div>
          )}

          {/* Bottom link */}
          {step !== 'success' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Remember your password?{' '}
                <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
