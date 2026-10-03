import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Boxes, UserPlus, Key } from 'lucide-react';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import { fetchMyWorkspaces, setActiveWorkspace } from '../store/workspaceSlice';
import { workspaceService } from '../services/workspace.service';
import api from '../services/api';
import toast from 'react-hot-toast';

const WorkspaceSelectPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, status } = useSelector((state) => state.workspace);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    dispatch(fetchMyWorkspaces());
    api.get('/organizations').then((res) => setOrganizations(res.data.data.organizations));
  }, [dispatch]);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      let orgId = organizations[0]?._id;
      if (!orgId) {
        const orgRes = await api.post('/organizations', { name: `${name}'s Organization` });
        orgId = orgRes.data.data.organization._id;
      }

      const res = await workspaceService.create({ name, organizationId: orgId });
      dispatch(setActiveWorkspace(res.data.workspace));
      await dispatch(fetchMyWorkspaces()).unwrap();
      toast.success('Workspace created!');
      navigate(`/workspaces/${res.data.workspace._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create workspace.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code.');
      return;
    }

    setIsJoining(true);
    try {
      const res = await workspaceService.join(inviteCode.trim());
      toast.success(res.message || 'Joined workspace successfully!');
      dispatch(setActiveWorkspace(res.data.workspace));
      await dispatch(fetchMyWorkspaces()).unwrap();
      setIsJoinModalOpen(false);
      setInviteCode('');
      navigate(`/workspaces/${res.data.workspace._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join workspace. Check code.');
    } finally {
      setIsJoining(false);
    }
  };

  if (status === 'loading') return <Loader fullScreen />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Boxes size={20} />
          </div>
          <span className="text-xl font-bold text-gray-900">CollabSphere</span>
        </div>

        <h1 className="text-center text-2xl font-bold text-gray-900">Choose a workspace</h1>
        <p className="mt-1 text-center text-sm text-gray-500">
          Select an existing workspace, join one with a code, or create a new one.
        </p>

        <div className="mt-6 space-y-2">
          {list.map((ws) => (
            <button
              key={ws._id}
              onClick={() => navigate(`/workspaces/${ws._id}`)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-white p-4 text-left hover:border-primary-200 hover:shadow-sm"
            >
              <div>
                <p className="font-semibold text-gray-900">{ws.name}</p>
                <p className="text-xs text-gray-400">
                  {ws.organization?.name} {ws.inviteCode && `• Code: ${ws.inviteCode}`}
                </p>
              </div>
              <span className="text-sm text-gray-300">→</span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 p-3.5 text-sm font-semibold text-primary-700 hover:bg-primary-100"
          >
            <UserPlus size={16} />
            Join Workspace
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 p-3.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <Plus size={16} />
            Create Workspace
          </button>
        </div>
      </div>

      {/* Modal 1: Create Workspace */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Workspace"
      >
        <div className="space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name (e.g. Engineering)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500"
          />
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {isCreating ? 'Creating...' : 'Create Workspace'}
          </button>
        </div>
      </Modal>

      {/* Modal 2: Join Workspace with Invite Code */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title="Join Existing Workspace"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Ask your workspace administrator for the 6-character Workspace Join Code.
          </p>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. A3F8B2"
              maxLength={8}
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm font-mono uppercase outline-none focus:border-primary-500"
            />
          </div>
          <button
            onClick={handleJoin}
            disabled={isJoining}
            className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {isJoining ? 'Joining...' : 'Join Workspace'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default WorkspaceSelectPage;
