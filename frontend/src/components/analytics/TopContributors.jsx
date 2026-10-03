import Avatar from '../common/Avatar';

const TopContributors = ({ contributors = [] }) => {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Top Contributors</h3>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
            <th className="pb-2 font-medium">Member</th>
            <th className="pb-2 font-medium">Role</th>
            <th className="pb-2 font-medium">Tasks Completed</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {contributors.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-400">
                No contributor data yet.
              </td>
            </tr>
          )}
          {contributors.map((c) => (
            <tr key={c.userId} className="border-b border-gray-50 last:border-0">
              <td className="flex items-center gap-2.5 py-3">
                <Avatar user={{ firstName: c.name?.split(' ')[0], avatar: c.avatar }} size="sm" />
                <span className="font-medium text-gray-800">{c.name}</span>
              </td>
              <td className="text-gray-500">{c.role || 'Member'}</td>
              <td className="font-semibold text-gray-800">{c.completedCount ?? 0}</td>
              <td>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  {c.status || 'Unknown'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TopContributors;
