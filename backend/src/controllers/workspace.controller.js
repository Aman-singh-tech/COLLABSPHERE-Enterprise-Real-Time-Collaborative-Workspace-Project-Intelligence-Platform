const crypto = require('crypto');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { Workspace, User, Project, Document, Task, Board } = require('../models');
const { ROLES } = require('../config/constants');
const { pushNotification } = require('../sockets/notification.socket');
const { sendEmail } = require('../services/email.service');
const { getWorkspaceOverview } = require('../services/analytics.service');

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');

const generateInviteCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g. "A3F8B2"
};

// POST /api/v1/workspaces
const createWorkspace = catchAsync(async (req, res) => {
  const { name, description, organizationId } = req.body;
  let slug = slugify(name);

  const existing = await Workspace.findOne({ organization: organizationId, slug });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const inviteCode = generateInviteCode();

  const workspace = await Workspace.create({
    name,
    slug,
    description,
    organization: organizationId,
    owner: req.user._id,
    members: [{ user: req.user._id, role: ROLES.WORKSPACE_ADMIN }],
    inviteCode,
  });

  await req.audit('workspace_create', 'Workspace', workspace._id);

  res.status(201).json(new ApiResponse(201, { workspace }, 'Workspace created.'));
});

// POST /api/v1/workspaces/join
const joinWorkspace = catchAsync(async (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode) throw new ApiError(400, 'Invite code is required.');

  const cleanCode = inviteCode.trim().toUpperCase();
  const workspace = await Workspace.findOne({ inviteCode: cleanCode, isActive: true });

  if (!workspace) {
    throw new ApiError(404, 'Invalid invite code. No workspace found.');
  }

  const isAlreadyMember = workspace.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (isAlreadyMember) {
    return res
      .status(200)
      .json(new ApiResponse(200, { workspace }, 'You are already a member of this workspace.'));
  }

  workspace.members.push({
    user: req.user._id,
    role: ROLES.MEMBER,
    invitedBy: workspace.owner,
  });

  await workspace.save();

  await req.audit('workspace_join', 'Workspace', workspace._id, { inviteCode: cleanCode });

  res.status(200).json(new ApiResponse(200, { workspace }, `Successfully joined ${workspace.name}!`));
});

// GET /api/v1/workspaces  (workspaces the current user belongs to)
const getMyWorkspaces = catchAsync(async (req, res) => {
  const workspaces = await Workspace.find({
    'members.user': req.user._id,
    isActive: true,
  })
    .populate('organization', 'name slug logo')
    .populate('members.user', 'firstName lastName email avatar status')
    .sort('-updatedAt');

  for (const ws of workspaces) {
    if (!ws.inviteCode) {
      ws.inviteCode = generateInviteCode();
      await ws.save();
    }
  }

  res.status(200).json(new ApiResponse(200, { workspaces }));
});

// GET /api/v1/workspaces/:workspaceId
const getWorkspaceById = catchAsync(async (req, res) => {
  const workspace = await Workspace.findById(req.params.workspaceId).populate(
    'members.user',
    'firstName lastName email avatar status'
  );
  if (!workspace) throw new ApiError(404, 'Workspace not found.');

  res.status(200).json(new ApiResponse(200, { workspace }));
});

// PATCH /api/v1/workspaces/:workspaceId
const updateWorkspace = catchAsync(async (req, res) => {
  const allowedFields = ['name', 'description', 'settings'];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const workspace = await Workspace.findByIdAndUpdate(req.params.workspaceId, updates, {
    new: true,
    runValidators: true,
  });

  await req.audit('workspace_update', 'Workspace', workspace._id);

  res.status(200).json(new ApiResponse(200, { workspace }, 'Workspace updated.'));
});

// DELETE /api/v1/workspaces/:workspaceId
const deleteWorkspace = catchAsync(async (req, res) => {
  const workspace = await Workspace.findByIdAndUpdate(
    req.params.workspaceId,
    { isActive: false },
    { new: true }
  );
  if (!workspace) throw new ApiError(404, 'Workspace not found.');

  await req.audit('workspace_delete', 'Workspace', workspace._id);

  res.status(200).json(new ApiResponse(200, null, 'Workspace deleted.'));
});

// POST /api/v1/workspaces/:workspaceId/invite
const inviteMember = catchAsync(async (req, res) => {
  const { email, role = ROLES.MEMBER } = req.body;
  const workspace = req.workspace;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    const alreadyMember = workspace.members.some(
      (m) => m.user.toString() === user._id.toString()
    );
    if (alreadyMember) throw new ApiError(409, 'User is already a member of this workspace.');

    workspace.members.push({ user: user._id, role, invitedBy: req.user._id });
    await workspace.save();

    await pushNotification({
      recipient: user._id,
      sender: req.user._id,
      type: 'workspace_invitation',
      title: `You've been added to ${workspace.name}`,
      message: `${req.user.firstName} invited you to join the workspace.`,
      entityType: 'Workspace',
      entityId: workspace._id,
      link: `/workspaces/${workspace._id}`,
    });
  } else {
    // No account yet — send an email invitation to sign up
    await sendEmail({
      to: email,
      subject: `You've been invited to join ${workspace.name} on CollabSphere`,
      html: `<p>${req.user.firstName} invited you to join <strong>${workspace.name}</strong> on CollabSphere. Sign up to get started.</p>`,
    });
  }

  await req.audit('member_invite', 'Workspace', workspace._id, { email, role });

  res.status(200).json(new ApiResponse(200, null, 'Invitation sent.'));
});

// DELETE /api/v1/workspaces/:workspaceId/members/:userId
const removeMember = catchAsync(async (req, res) => {
  const workspace = req.workspace;
  workspace.members = workspace.members.filter(
    (m) => m.user.toString() !== req.params.userId
  );
  await workspace.save();

  await req.audit('member_remove', 'Workspace', workspace._id, { userId: req.params.userId });

  res.status(200).json(new ApiResponse(200, { workspace }, 'Member removed.'));
});

// PATCH /api/v1/workspaces/:workspaceId/members/:userId/role
const updateMemberRole = catchAsync(async (req, res) => {
  const { role } = req.body;
  const workspace = req.workspace;

  const member = workspace.members.find((m) => m.user.toString() === req.params.userId);
  if (!member) throw new ApiError(404, 'Member not found in this workspace.');

  const oldRole = member.role;
  member.role = role;
  await workspace.save();

  await req.audit('role_update', 'Workspace', workspace._id, {
    userId: req.params.userId,
    oldRole,
    newRole: role,
  });

  res.status(200).json(new ApiResponse(200, { workspace }, 'Member role updated.'));
});

// GET /api/v1/workspaces/:workspaceId/dashboard
const getDashboardSummary = catchAsync(async (req, res) => {
  const { workspaceId } = req.params;

  // Resolve project IDs -> board IDs once, then reuse for task queries
  const projectIds = await Project.find({ workspace: workspaceId }).distinct('_id');
  const boardIds = await Board.find({ project: { $in: projectIds } }).distinct('_id');

  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

  const [activeProjects, recentDocuments, tasksDueToday, totalActiveTasks] = await Promise.all([
    Project.find({ workspace: workspaceId, status: { $ne: 'archived' } })
      .sort('-updatedAt')
      .limit(5),
    Document.find({ workspace: workspaceId, isArchived: false })
      .sort('-updatedAt')
      .limit(5)
      .select('title updatedAt tags'),
    Task.countDocuments({
      board: { $in: boardIds },
      dueDate: { $gte: startOfDay, $lt: endOfDay },
      isArchived: false,
    }),
    Task.countDocuments({ board: { $in: boardIds }, isArchived: false }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      activeProjects,
      recentDocuments,
      tasksDueToday,
      totalActiveTasks,
      activeMembers: req.workspace ? req.workspace.members.length : undefined,
      productivityScore: (await getWorkspaceOverview(workspaceId)).productivityScore,
    })
  );
});

module.exports = {
  createWorkspace,
  joinWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  removeMember,
  updateMemberRole,
  getDashboardSummary,
};
