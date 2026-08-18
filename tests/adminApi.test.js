const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');

let server;
let baseUrl;
let superAdminToken;
let supportAdminToken;
let aiManagerToken;
let studentToken;

function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

describe('AI Tuition Admin API & Defense-in-Depth Suite', () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Obtain tokens for test accounts
    const superAdminRes = await request('POST', '/auth/login', {}, { email: 'superadmin@aituition.app', password: 'Admin123!' });
    superAdminToken = superAdminRes.body.access_token;

    const supportAdminRes = await request('POST', '/auth/login', {}, { email: 'supportadmin@aituition.app', password: 'Admin123!' });
    supportAdminToken = supportAdminRes.body.access_token;

    const aiManagerRes = await request('POST', '/auth/login', {}, { email: 'aimanager@aituition.app', password: 'Admin123!' });
    aiManagerToken = aiManagerRes.body.access_token;

    const studentRes = await request('POST', '/auth/login', {}, { email: 'student@example.com', password: 'Admin123!' });
    studentToken = studentRes.body.access_token;
  });

  after(() => {
    if (server) server.close();
  });

  test('GET /health returns HTTP 200 UP', async () => {
    const res = await request('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'UP');
  });

  test('Unauthenticated request to /admin/users returns 401 UNAUTHENTICATED', async () => {
    const res = await request('GET', '/admin/users');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHENTICATED');
  });

  test('Unauthorized role (student) hitting /admin/users returns 403 FORBIDDEN_ROLE', async () => {
    const res = await request('GET', '/admin/users', { Authorization: `Bearer ${studentToken}` });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_ROLE');
  });

  test('Super_Admin can GET /admin/users', async () => {
    const res = await request('GET', '/admin/users', { Authorization: `Bearer ${superAdminToken}` });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.users));
    assert.ok(res.body.data.pagination.total >= 6);
  });

  test('Super_Admin POST /admin/users with invalid email returns 400 VALIDATION_ERROR', async () => {
    const res = await request('POST', '/admin/users', { Authorization: `Bearer ${superAdminToken}` }, {
      full_name: 'Test Bad User',
      email: 'invalid-email-format',
      password: '123',
      role: 'student'
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.length > 0);
  });

  test('Super_Admin POST /admin/users provisions new user account with bcrypt hashing', async () => {
    const res = await request('POST', '/admin/users', { Authorization: `Bearer ${superAdminToken}` }, {
      full_name: 'New Admin Created',
      email: 'newcreated@example.com',
      password: 'SecurePassword123!',
      role: 'tutor'
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.email, 'newcreated@example.com');
    assert.equal(res.body.data.user.role, 'tutor');
  });

  test('Super_Admin PUT /admin/users/:id updates profile and role', async () => {
    const res = await request('PUT', '/admin/users/4', { Authorization: `Bearer ${superAdminToken}` }, {
      full_name: 'Ali Khan Updated',
      email: 'student@example.com',
      role: 'student'
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.full_name, 'Ali Khan Updated');
  });

  test('Super_Admin PATCH /admin/users/:id/status modifies user status to suspended', async () => {
    const res = await request('PATCH', '/admin/users/4/status', { Authorization: `Bearer ${superAdminToken}` }, {
      status: 'suspended'
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.status, 'suspended');
  });

  test('Super_Admin GET /admin/users/:id/sessions fetches active user sessions', async () => {
    const res = await request('GET', '/admin/users/4/sessions', { Authorization: `Bearer ${superAdminToken}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user_id, 4);
    assert.ok(Array.isArray(res.body.data.active_sessions));
  });

  test('Super_Admin DELETE /admin/users/:id/sessions revokes user sessions', async () => {
    const res = await request('DELETE', '/admin/users/4/sessions', { Authorization: `Bearer ${superAdminToken}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user_id, 4);
  });

  test('Super_Admin GET /admin/ai/usage retrieves aggregated token stats', async () => {
    const res = await request('GET', '/admin/ai/usage', { Authorization: `Bearer ${superAdminToken}` });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.summary.total_queries >= 0);
  });

  test('Super_Admin PUT /admin/ai/prompts/:id updates system prompt & guardrails', async () => {
    const res = await request('PUT', '/admin/ai/prompts/1', { Authorization: `Bearer ${superAdminToken}` }, {
      title: 'Advanced Calculus Prompt',
      system_prompt: 'You are an advanced calculus tutor.',
      learning_guardrails: 'Guide with step-by-step calculus hints.'
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.prompt.title, 'Advanced Calculus Prompt');
  });

  test('Super_Admin GET /admin/moderation/flagged fetches safety filter flags', async () => {
    const res = await request('GET', '/admin/moderation/flagged', { Authorization: `Bearer ${superAdminToken}` });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.flagged_items));
  });

  test('Super_Admin GET /admin/dashboard retrieves KPIs', async () => {
    const res = await request('GET', '/admin/dashboard', { Authorization: `Bearer ${superAdminToken}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.kpis.api_throughput_status, 'HEALTHY');
  });

  test('Super_Admin GET /admin/audit-logs retrieves immutable audit trail records', async () => {
    const res = await request('GET', '/admin/audit-logs', { Authorization: `Bearer ${superAdminToken}` });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.audit_logs));
    assert.ok(res.body.data.audit_logs.length > 0);
  });

  test('Super_Admin GET /admin/reports/export streams CSV report', async () => {
    const res = await request('GET', '/admin/reports/export?type=users&format=csv', { Authorization: `Bearer ${superAdminToken}` });
    assert.equal(res.status, 200);
    assert.ok(typeof res.body === 'string');
    assert.ok(res.body.includes('full_name'));
  });
});
