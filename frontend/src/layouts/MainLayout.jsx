import { useEffect, useState } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { fetchMyWorkspaces, setActiveWorkspace } from '../store/workspaceSlice';
import { workspaceService } from '../services/workspace.service';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

const MainLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { list, activeWorkspace, status } = useSelector((state) => state.workspace);
  const { socket } = useSocket();
  const routeWorkspace = list.find((workspace) => workspace._id === workspaceId);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (status === 'idle') dispatch(fetchMyWorkspaces());
  }, [dispatch, status]);

  useEffect(() => {
    if (workspaceId && list.length) {
      const ws = list.find((w) => w._id === workspaceId);
      dispatch(setActiveWorkspace(ws || null));
    }
  }, [workspaceId, list, dispatch]);

  useEffect(() => {
    if (socket && activeWorkspace) {
      socket.emit('presence:join', activeWorkspace._id);
    }
  }, [socket, activeWorkspace]);

  const handleInvite = async () => {
    if (!routeWorkspace || !inviteEmail.trim()) return;
    try {
      await workspaceService.inviteMember(workspaceId, { email: inviteEmail.trim() });
      toast.success('Invitation sent!');
      setIsInviteOpen(false);
      setInviteEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invite.');
    }
  };

  if (status === 'idle' || (status === 'loading' && !routeWorkspace)) {
    return <Loader fullScreen />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar workspace={routeWorkspace} onInviteClick={() => setIsInviteOpen(true)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar onQuickAdd={() => setIsInviteOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ activeWorkspace }} />
        </main>
      </div>

      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite Members">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Invite via Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:bg-white focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleInvite}
            className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Send Email Invitation
          </button>

          {routeWorkspace?.inviteCode && (
            <div className="border-t border-gray-100 pt-3">
              <p className="mb-1 text-xs font-medium text-gray-500">Or Share Workspace Join Code</p>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                <span className="font-mono text-sm font-bold text-gray-800">
                  {routeWorkspace.inviteCode}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(routeWorkspace.inviteCode);
                    toast.success('Join code copied!');
                  }}
                  className="rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-primary-600 shadow-sm hover:bg-gray-50"
                >
                  Copy Code
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MainLayout;
