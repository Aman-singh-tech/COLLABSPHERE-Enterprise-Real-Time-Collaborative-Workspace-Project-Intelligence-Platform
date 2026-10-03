import api from './api';

export const documentService = {
  create: (data) => api.post('/documents', data).then((res) => res.data),
  getAll: (workspaceId) => api.get(`/documents?workspaceId=${workspaceId}`).then((res) => res.data),
  getById: (id) => api.get(`/documents/${id}`).then((res) => res.data),
  updateMeta: (id, data) => api.patch(`/documents/${id}`, data).then((res) => res.data),
  saveContent: (id, content) => api.patch(`/documents/${id}/content`, { content }).then((res) => res.data),
  addComment: (id, content) => api.post(`/documents/${id}/comments`, { content }).then((res) => res.data),
  remove: (id) => api.delete(`/documents/${id}`).then((res) => res.data),

  createVersion: (id, versionLabel) =>
    api.post(`/documents/${id}/versions`, { versionLabel }).then((res) => res.data),
  getVersionHistory: (id) => api.get(`/documents/${id}/versions`).then((res) => res.data),
  restoreVersion: (id, versionId) =>
    api.post(`/documents/${id}/versions/${versionId}/restore`).then((res) => res.data),

  addCollaborator: (id, data) => api.post(`/documents/${id}/collaborators`, data).then((res) => res.data),
};
