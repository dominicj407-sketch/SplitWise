import { AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';

interface BudgetAlertBannerProps {
  spent: number;
  limit: number;
  groupName?: string;
}

export const BudgetAlertBanner = ({ spent, limit, groupName }: BudgetAlertBannerProps) => {
  if (!limit || limit <= 0) return null;

  const pct = Math.min((spent / limit) * 100, 100);
  const overBudget = spent > limit;
  const nearLimit = pct >= 80 && !overBudget;

  const status = overBudget ? 'exceeded' : nearLimit ? 'warning' : 'ok';

  const colors = {
    exceeded: {
      bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50',
      bar: 'from-orange-400 to-red-600',
      text: 'text-red-700 dark:text-red-300',
      icon: <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />,
      label: 'Budget Exceeded! 🔴',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/50',
      bar: 'from-yellow-400 to-orange-500',
      text: 'text-yellow-700 dark:text-yellow-300',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />,
      label: 'Approaching Budget Limit ⚠️',
    },
    ok: {
      bg: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40',
      bar: 'from-green-400 to-emerald-500',
      text: 'text-green-700 dark:text-green-300',
      icon: <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />,
      label: 'Within Budget ✅',
    },
  };

  const c = colors[status];

  return (
    <div className={`rounded-xl border p-4 mb-6 transition-colors ${c.bg}`}>
      <div className="flex items-start gap-3">
        {c.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <p className={`font-semibold text-sm ${c.text}`}>
              {c.label}
              {groupName && <span className="font-normal ml-1">— {groupName}</span>}
            </p>
            <p className={`text-xs font-bold ${c.text} flex items-center gap-1`}>
              <TrendingUp className="w-3.5 h-3.5" />
              ₹{spent.toFixed(2)} / ₹{limit.toFixed(2)}
            </p>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${c.bar} rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex justify-between mt-1">
            <span className={`text-xs ${c.text} opacity-70`}>{pct.toFixed(0)}% used</span>
            {overBudget && (
              <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                ₹{(spent - limit).toFixed(2)} over limit
              </span>
            )}
            {!overBudget && (
              <span className={`text-xs ${c.text} opacity-70`}>
                ₹{(limit - spent).toFixed(2)} remaining
              </span>
            )}
          </div>

          {overBudget && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
              🚨 All group members are notified that the budget has been exceeded. Please review recent expenses.
            </p>
          )}
          {nearLimit && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 font-medium">
              ⚠️ You are close to the budget limit. Consider pausing new expenses.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
