const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createFixture } = require('./fixture.cjs');
const models = require('../src/models');
let fixture;
before(async () => { fixture = await createFixture(); });
after(async () => { await fixture?.close(); });

test('socket save acknowledges persistence and does not acknowledge rejected content as saved', async () => {
  const document = await models.Document.create({ title: 'Socket save', workspace: fixture.workspace._id, createdBy: fixture.user._id });
  const handlers = {};
  const events = [];
  const socket = { user: fixture.user, on: (name, handler) => { handlers[name] = handler; }, emit: (name) => events.push(name) };
  const io = { to: () => ({ emit: (name) => events.push(name) }) };
  require('../src/sockets/document.socket').registerDocumentHandlers(io, socket);
  let acknowledgement;
  await handlers['document:save']({ documentId: document._id.toString(), content: '<p>Socket persisted</p>' }, (result) => { acknowledgement = result; });
  assert.equal(acknowledgement.ok, true);
  assert.equal((await models.Document.findById(document._id)).content, '<p>Socket persisted</p>');
  events.length = 0;
  await handlers['document:save']({ documentId: document._id.toString(), content: {} }, (result) => { acknowledgement = result; });
  assert.equal(acknowledgement.ok, false);
  assert.ok(!events.includes('document:saved'));
});

test('file versions restore metadata, reject unrelated versions and respect locks/access', async () => {
  const file = await models.File.create({ name: 'qa.txt', originalName: 'qa.txt', mimeType: 'text/plain', path: 'uploads/files/qa.txt', url: 'http://localhost/qa.txt', size: 10, workspace: fixture.workspace._id, owner: fixture.user._id });
  const version = await models.FileVersion.create({ file: file._id, path: 'uploads/files/old.pdf', url: 'http://localhost/old.pdf', size: 20, mimeType: 'application/pdf', uploadedBy: fixture.user._id });
  assert.equal((await fixture.request(`/files/${file._id}`, { as: fixture.outsider })).status, 403);
  assert.equal((await fixture.request(`/files/${file._id}/lock`, { method: 'PATCH' })).data.file.isLocked, true);
  assert.equal((await fixture.request(`/files/${file._id}/versions/${version._id}/restore`, { method: 'POST' })).status, 423);
  await fixture.request(`/files/${file._id}/lock`, { method: 'PATCH' });
  const restored = await fixture.request(`/files/${file._id}/versions/${version._id}/restore`, { method: 'POST' });
  assert.equal(restored.data.file.mimeType, 'application/pdf');
  assert.equal(restored.data.file.size, 20);
  assert.equal(await models.FileVersion.countDocuments({ file: file._id }), 2);
  const other = await models.File.create({ name: 'other.txt', originalName: 'other.txt', mimeType: 'text/plain', path: 'uploads/files/other.txt', url: 'http://localhost/other.txt', size: 10, workspace: fixture.workspace._id, owner: fixture.user._id });
  assert.equal((await fixture.request(`/files/${other._id}/versions/${version._id}/restore`, { method: 'POST' })).status, 404);
  assert.equal((await fixture.request(`/files/${file._id}/share`, { method: 'POST', body: { email: fixture.outsider.email } })).status, 400);
});

test('document HTML and empty content survive reload; outsiders cannot read/write', async () => {
  const created = await fixture.request('/documents', { method: 'POST', body: { title: 'QA persistence', workspaceId: fixture.workspace._id } });
  assert.equal(created.status, 201);
  const id = created.data.document._id;
  const content = '<h1>Persistent heading</h1><p>Saved text</p>';
  assert.equal((await fixture.request(`/documents/${id}/content`, { method: 'PATCH', body: { content } })).status, 200);
  assert.equal((await fixture.request(`/documents/${id}`)).data.document.content, content);
  assert.equal((await fixture.request(`/documents/${id}`, { as: fixture.outsider })).status, 403);
  assert.equal((await fixture.request(`/documents/${id}/content`, { method: 'PATCH', body: { content: 'forbidden' }, as: fixture.outsider })).status, 403);
  await fixture.request(`/documents/${id}/content`, { method: 'PATCH', body: { content: '' } });
  assert.equal((await fixture.request(`/documents/${id}`)).data.document.content, '');
});

test('document snapshot, restore and comments persist; unrelated versions are rejected', async () => {
  const document = await models.Document.create({ title: 'Versions', workspace: fixture.workspace._id, createdBy: fixture.user._id, content: '<p>one</p>' });
  const id = document._id;
  const version = await fixture.request(`/documents/${id}/versions`, { method: 'POST', body: { versionLabel: 'One' } });
  await fixture.request(`/documents/${id}/content`, { method: 'PATCH', body: { content: '<p>two</p>' } });
  const restored = await fixture.request(`/documents/${id}/versions/${version.data.version._id}/restore`, { method: 'POST' });
  assert.equal(restored.data.document.content, '<p>one</p>');
  assert.equal((await fixture.request(`/documents/${id}/comments`, { method: 'POST', body: { content: 'QA comment' } })).status, 201);
  const loaded = await fixture.request(`/documents/${id}`);
  assert.equal(loaded.data.document.comments[0].author.firstName, 'QA');
  const other = await models.Document.create({ title: 'Another', workspace: fixture.workspace._id, createdBy: fixture.user._id });
  assert.equal((await fixture.request(`/documents/${other._id}/versions/${version.data.version._id}/restore`, { method: 'POST' })).status, 404);
});

test('folders accept no storage path; actual files still require it', async () => {
  const result = await fixture.request('/files/folders', { method: 'POST', body: { name: 'QA folder', workspaceId: fixture.workspace._id } });
  assert.equal(result.status, 201);
  const loaded = await fixture.request(`/files?workspaceId=${fixture.workspace._id}`);
  assert.ok(loaded.data.files.some((file) => file.originalName === 'QA folder' && file.isFolder));
  await assert.rejects(models.File.create({ name: 'Missing path', originalName: 'invalid.txt', mimeType: 'text/plain', size: 1, workspace: fixture.workspace._id, owner: fixture.user._id }));
});

test('first reaction persists and toggles off in the database', async () => {
  const chat = await models.Chat.create({ name: 'reactions', workspace: fixture.workspace._id, members: [fixture.user._id], createdBy: fixture.user._id });
  const message = await models.Message.create({ chat: chat._id, sender: fixture.user._id, content: 'React' });
  const handlers = {};
  const socket = { user: fixture.user, on: (name, handler) => { handlers[name] = handler; }, emit: () => {} };
  const io = { to: () => ({ emit: () => {} }) };
  require('../src/sockets/chat.socket').registerChatHandlers(io, socket);
  const payload = { messageId: message._id.toString(), chatId: chat._id.toString(), emoji: '👍' };
  await handlers['message:react'](payload);
  assert.equal((await models.Message.findById(message._id)).reactions[0].users[0].toString(), fixture.user._id.toString());
  await handlers['message:react'](payload);
  assert.equal((await models.Message.findById(message._id)).reactions[0].users.length, 0);
});

test('workspace responses contain member identity', async () => {
  const response = await fixture.request('/workspaces');
  assert.equal(response.data.workspaces[0].members[0].user.firstName, 'QA');
});

test('search is literal and scoped to the authorized workspace', async () => {
  await models.Document.create({ title: 'QA [literal]', workspace: fixture.workspace._id, createdBy: fixture.user._id });
  await models.Document.create({ title: 'QA secret', workspace: fixture.otherWorkspace._id, createdBy: fixture.outsider._id });
  const results = await fixture.request(`/search?q=QA&workspaceId=${fixture.workspace._id}`);
  assert.equal(results.status, 200);
  assert.ok(results.data.results.documents.every((document) => !document.title.includes('secret')));
  assert.equal((await fixture.request(`/search?q=%5Bliteral%5D&workspaceId=${fixture.workspace._id}`)).data.results.documents.length, 1);
  assert.equal((await fixture.request(`/search?q=QA&workspaceId=${fixture.otherWorkspace._id}`)).status, 403);
});

test('analytics counts completed tasks, not arbitrary edited tasks', async () => {
  const project = await models.Project.create({ name: 'Metrics', workspace: fixture.workspace._id, createdBy: fixture.user._id });
  const board = await models.Board.create({ name: 'Metrics', project: project._id });
  const todo = await models.Column.create({ name: 'To Do', board: board._id });
  const done = await models.Column.create({ name: 'Done', board: board._id });
  await models.Task.create({ title: 'Incomplete', board: board._id, column: todo._id, createdBy: fixture.user._id });
  const service = require('../src/services/analytics.service');
  assert.equal((await service.getWorkspaceOverview(fixture.workspace._id)).productivityScore, 0);
  await models.Task.create({ title: 'Complete', board: board._id, column: done._id, completedAt: new Date(), createdBy: fixture.user._id });
  assert.equal((await service.getWorkspaceOverview(fixture.workspace._id)).productivityScore, 50);
  assert.equal((await service.getTaskCompletionTrend(fixture.workspace._id, '7days')).reduce((sum, entry) => sum + entry.count, 0), 1);
});

test('notification list and read acknowledgement work', async () => {
  const notification = await models.Notification.create({ recipient: fixture.user._id, type: 'task_assigned', title: 'QA notification' });
  assert.equal((await fixture.request('/notifications')).data.unreadCount, 1);
  assert.equal((await fixture.request(`/notifications/${notification._id}/read`, { method: 'PATCH' })).status, 200);
  assert.equal((await fixture.request('/notifications')).data.unreadCount, 0);
});
