import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Users, Timer, Zap } from 'lucide-react';
import StatsCard from '../components/dashboard/StatsCard';
import ActiveProjects from '../components/dashboard/ActiveProjects';
import RecentDocuments from '../components/dashboard/RecentDocuments';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import Loader from '../components/common/Loader';
import { fetchWorkspaceDashboard } from '../store/workspaceSlice';
import { useAuth } from '../hooks/useAuth';

const DashboardPage = () => {
  const dispatch = useDispatch();
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { dashboard, activeWorkspace } = useSelector((state) => state.workspace);

  useEffect(() => {
    if (workspaceId) dispatch(fetchWorkspaceDashboard(workspaceId));
  }, [dispatch, workspaceId]);

  if (!dashboard) return <Loader />;

  const tasksDueToday = dashboard.tasksDueToday || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good morning, {user?.firstName}!</h1>
          <p className="mt-1 text-gray-500">
            You have <span className="font-semibold text-gray-700">{tasksDueToday} tasks</span> due
            today. Let&apos;s get to work.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={CheckCircle2}
          label="Total Active Tasks"
          value={dashboard.totalActiveTasks ?? 0}
        />
        <StatsCard
          icon={Users}
          label="Active Members"
          value={dashboard.activeMembers ?? activeWorkspace?.members?.length ?? 0}
        />
        <StatsCard icon={Timer} label="Tasks Due Today" value={tasksDueToday} />
        <StatsCard
          icon={Zap}
          label="Productivity Score"
          value={`${dashboard.productivityScore ?? 0}/100`}
          delta="Based on completed tasks"
          accent
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ActiveProjects projects={dashboard.activeProjects} />
          <RecentDocuments documents={dashboard.recentDocuments} />
        </div>
        <div>
          <ActivityFeed activities={[]} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
