import { TrendingUp, Users, Zap } from 'lucide-react';

const AnalyticsCards = ({ overview }) => {
  if (!overview) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">Productivity Score</span>
          <TrendingUp size={18} className="text-primary-500" />
        </div>
        <p className="mt-2 text-3xl font-bold text-gray-900">{overview.productivityScore}%</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">Active Users</span>
          <Users size={18} className="text-primary-500" />
        </div>
        <p className="mt-2 text-3xl font-bold text-gray-900">{overview.activeMembers}</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">Completed This Period</span>
          <Zap size={18} className="text-primary-500" />
        </div>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {overview.completedThisPeriod ?? 0}
        </p>
      </div>
    </div>
  );
};

export default AnalyticsCards;
