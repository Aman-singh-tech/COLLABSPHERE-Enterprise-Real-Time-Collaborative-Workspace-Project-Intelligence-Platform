const { Document, Workspace } = require('../models');
const ApiError = require('../utils/apiError');

const getAccessibleDocument = async (documentId, userId, write = false) => {
  const document = await Document.findOne({ _id: documentId, isArchived: false });
  if (!document) throw new ApiError(404, 'Document not found.');
  const workspace = await Workspace.findOne({
    _id: document.workspace, isActive: true, 'members.user': userId,
  });
  if (!workspace) throw new ApiError(403, 'You do not have access to this document.');
  const member = workspace.members.find((item) => item.user.toString() === userId.toString());
  const collaborator = document.collaborators.find((item) => item.user.toString() === userId.toString());
  if (write && (member.role === 'guest' || (collaborator && ['viewer', 'commenter'].includes(collaborator.role)))) {
    throw new ApiError(403, 'You do not have permission to edit this document.');
  }
  return document;
};

const saveDocumentContent = async (documentId, userId, content) => {
  if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > 1024 * 1024) {
    throw new ApiError(400, 'Document content must be HTML text under 1 MB.');
  }
  await getAccessibleDocument(documentId, userId, true);
  return Document.findByIdAndUpdate(documentId, { content, lastEditedBy: userId }, { new: true });
};

module.exports = { getAccessibleDocument, saveDocumentContent };
