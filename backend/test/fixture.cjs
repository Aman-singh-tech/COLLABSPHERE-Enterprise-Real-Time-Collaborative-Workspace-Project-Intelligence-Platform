const path = require('node:path');
const crypto = require('node:crypto');
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = crypto.randomBytes(32).toString('hex');
process.env.JWT_REFRESH_SECRET = crypto.randomBytes(32).toString('hex');
process.env.COOKIE_SECRET = crypto.randomBytes(32).toString('hex');
process.env.GOOGLE_CLIENT_ID = 'isolated-local-test';
process.env.GOOGLE_CLIENT_SECRET = 'isolated-local-test';
process.env.GOOGLE_CALLBACK_URL = 'http://127.0.0.1/auth/callback';
process.env.MONGOMS_DOWNLOAD_DIR ||= path.join(__dirname, '../node_modules/.cache/mongodb-binaries');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const models = require('../src/models');

const createFixture = async (options = {}) => {
  const mongo = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1' } });
  await mongoose.connect(mongo.getUri());
  const user = await models.User.create({ firstName: 'QA', lastName: 'Tester', email: 'qa@example.com', isEmailVerified: true });
  const outsider = await models.User.create({ firstName: 'Other', email: 'outsider@example.com' });
  const organization = await models.Organization.create({ name: 'QA Organization', slug: 'qa-org', owner: user._id, members: [{ user: user._id, role: 'org_admin' }] });
  const workspace = await models.Workspace.create({ name: 'QA Regression', slug: 'qa-regression', organization: organization._id, owner: user._id, members: [{ user: user._id, role: 'workspace_admin' }], inviteCode: 'QATEST' });
  const otherWorkspace = await models.Workspace.create({ name: 'Private', slug: 'private', organization: organization._id, owner: outsider._id, members: [{ user: outsider._id, role: 'workspace_admin' }], inviteCode: 'OTHER1' });
  const app = require('../src/app');
  const http = require('node:http');
  const { generateAccessToken } = require('../src/utils/generateToken');
  const server = http.createServer(app);
  const io = require('../src/sockets')(server);
  app.set('io', io);
  await new Promise((resolve) => server.listen(options.port || 0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (route, { method = 'GET', body, as = user } = {}) => {
    const response = await fetch(`${base}/api/v1${route}`, { method, headers: { Authorization: `Bearer ${generateAccessToken(as._id.toString())}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, ...(await response.json()) };
  };
  const close = async () => { await new Promise((resolve) => io.close(resolve)); await mongoose.disconnect(); await mongo.stop(); };
  return { app, io, server, base, user, outsider, workspace, otherWorkspace, organization, request, close };
};
module.exports = { createFixture };
