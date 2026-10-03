const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { Document, DocumentVersion, Workspace } = require('../models');
const { getAccessibleDocument, saveDocumentContent } = require('../services/document.service');

const requireDocumentAccess = catchAsync(async (req, res, next) => {
  const write = req.method !== 'GET';
  await getAccessibleDocument(req.params.id, req.user._id, write);
  next();
});

const saveContent = catchAsync(async (req, res) => {
  const document = await saveDocumentContent(req.params.id, req.user._id, req.body.content);
  const savedAt = document.updatedAt;
  req.app.get('io')?.to(`document:${document._id}`).emit('document:saved', { savedAt, savedBy: req.user._id });
  res.status(200).json(new ApiResponse(200, { document, savedAt }, 'Document saved.'));
});

const addComment = catchAsync(async (req, res) => {
  const content = req.body.content?.trim();
  if (!content || content.length > 5000) throw new ApiError(400, 'Comment must contain 1–5000 characters.');
  const document = await Document.findByIdAndUpdate(req.params.id, {
    $push: { comments: { author: req.user._id, content } },
  }, { new: true, runValidators: true }).populate('comments.author', 'firstName lastName avatar');
  res.status(201).json(new ApiResponse(201, { comments: document.comments }, 'Comment added.'));
});

// POST /api/v1/documents
const createDocument = catchAsync(async (req, res) => {
  const { title, workspaceId, projectId } = req.body;
  const workspace = await Workspace.findOne({ _id: workspaceId, isActive: true, 'members.user': req.user._id });
  if (!workspace || workspace.members.find((member) => member.user.toString() === req.user._id.toString()).role === 'guest') throw new ApiError(403, 'You cannot create documents in this workspace.');

  const document = await Document.create({
    title,
    workspace: workspaceId,
    project: projectId,
    createdBy: req.user._id,
    lastEditedBy: req.user._id,
    collaborators: [{ user: req.user._id, role: 'owner' }],
    content: { type: 'doc', content: [{ type: 'paragraph' }] }, // empty TipTap doc
  });

  await req.audit('document_create', 'Document', document._id);

  res.status(201).json(new ApiResponse(201, { document }, 'Document created.'));
});

// GET /api/v1/documents?workspaceId=...
const getDocuments = catchAsync(async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId) throw new ApiError(400, 'workspaceId query param is required.');
  if (!await Workspace.exists({ _id: workspaceId, isActive: true, 'members.user': req.user._id })) throw new ApiError(403, 'You do not have access to this workspace.');

  const documents = await Document.find({ workspace: workspaceId, isArchived: false })
    .select('title updatedAt tags lastEditedBy')
    .populate('lastEditedBy', 'firstName lastName avatar')
    .sort('-updatedAt');

  res.status(200).json(new ApiResponse(200, { documents }));
});

// GET /api/v1/documents/:id
const getDocumentById = catchAsync(async (req, res) => {
  const document = await Document.findById(req.params.id).populate(
    'collaborators.user',
    'firstName lastName avatar'
  ).populate('comments.author', 'firstName lastName avatar');
  if (!document) throw new ApiError(404, 'Document not found.');

  res.status(200).json(new ApiResponse(200, { document }));
});

// PATCH /api/v1/documents/:id  (title, tags, outline - not live content; that's via sockets)
const updateDocumentMeta = catchAsync(async (req, res) => {
  const allowedFields = ['title', 'tags', 'outline'];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const document = await Document.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!document) throw new ApiError(404, 'Document not found.');

  res.status(200).json(new ApiResponse(200, { document }, 'Document updated.'));
});

// POST /api/v1/documents/:id/versions  (snapshot current content as a named version)
const createVersion = catchAsync(async (req, res) => {
  const { versionLabel } = req.body;
  const document = await Document.findById(req.params.id);
  if (!document) throw new ApiError(404, 'Document not found.');

  const version = await DocumentVersion.create({
    document: document._id,
    content: document.content,
    versionLabel: versionLabel || `Snapshot ${new Date().toLocaleString()}`,
    editedBy: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, { version }, 'Version saved.'));
});

// GET /api/v1/documents/:id/versions
const getVersionHistory = catchAsync(async (req, res) => {
  const versions = await DocumentVersion.find({ document: req.params.id })
    .populate('editedBy', 'firstName lastName avatar')
    .sort('-createdAt');

  res.status(200).json(new ApiResponse(200, { versions }));
});

// POST /api/v1/documents/:id/versions/:versionId/restore
const restoreVersion = catchAsync(async (req, res) => {
  const version = await DocumentVersion.findById(req.params.versionId);
  if (!version || version.document.toString() !== req.params.id) throw new ApiError(404, 'Version not found.');

  const document = await Document.findByIdAndUpdate(
    req.params.id,
    { content: version.content, lastEditedBy: req.user._id },
    { new: true }
  );

  await req.audit('document_restore', 'Document', document._id, { versionId: version._id });

  res.status(200).json(new ApiResponse(200, { document }, 'Document restored to selected version.'));
});

// POST /api/v1/documents/:id/collaborators
const addCollaborator = catchAsync(async (req, res) => {
  const { userId, role = 'editor' } = req.body;
  const document = await Document.findById(req.params.id);
  if (!document) throw new ApiError(404, 'Document not found.');

  const exists = document.collaborators.some((c) => c.user.toString() === userId);
  if (exists) throw new ApiError(409, 'User is already a collaborator.');

  document.collaborators.push({ user: userId, role });
  await document.save();

  res.status(200).json(new ApiResponse(200, { document }, 'Collaborator added.'));
});

// DELETE /api/v1/documents/:id
const archiveDocument = catchAsync(async (req, res) => {
  const document = await Document.findByIdAndUpdate(
    req.params.id,
    { isArchived: true },
    { new: true }
  );
  if (!document) throw new ApiError(404, 'Document not found.');

  res.status(200).json(new ApiResponse(200, null, 'Document archived.'));
});

module.exports = {
  requireDocumentAccess,
  saveContent,
  addComment,
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocumentMeta,
  createVersion,
  getVersionHistory,
  restoreVersion,
  addCollaborator,
  archiveDocument,
};
