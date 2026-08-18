const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');

let server;
let baseUrl;
let parentToken;
let parentRefreshToken;
let studentToken;
let studentCode;
let linkedStudentId;
let createdBookId;
let createdDiaryId;

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

describe('Authentication & Parent Module Integration Test Suite', () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    if (server) server.close();
  });

  test('1. POST /auth/register - Register Private Student & Generate unique student_code', async () => {
    const res = await request('POST', '/auth/register', {}, {
      full_name: 'Child Student Test',
      email: `student_${Date.now()}@example.com`,
      password: 'SecurePass123!',
      role: 'student',
      account_type: 'private'
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.user.student_code);
    assert.equal(res.body.user.student_code.length, 6);
    studentCode = res.body.user.student_code;
    linkedStudentId = res.body.user.id;
  });

  test('2. POST /auth/register - Register Parent Account', async () => {
    const parentEmail = `parent_${Date.now()}@example.com`;
    const res = await request('POST', '/auth/register', {}, {
      full_name: 'Parent User Test',
      email: parentEmail,
      password: 'SecurePass123!',
      role: 'parent',
      account_type: 'private'
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.role, 'parent');

    // Login parent to get tokens
    const loginRes = await request('POST', '/auth/login', {}, {
      email: parentEmail,
      password: 'SecurePass123!'
    });

    assert.equal(loginRes.status, 200);
    assert.ok(loginRes.body.access_token);
    assert.ok(loginRes.body.refresh_token);
    parentToken = loginRes.body.access_token;
    parentRefreshToken = loginRes.body.refresh_token;
  });

  test('3. GET /auth/me - Retrieve current authenticated profile', async () => {
    const res = await request('GET', '/auth/me', { Authorization: `Bearer ${parentToken}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.role, 'parent');
  });

  test('4. POST /auth/refresh - Refresh token rotation & session update', async () => {
    const res = await request('POST', '/auth/refresh', {}, { refresh_token: parentRefreshToken });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.access_token);
    assert.ok(res.body.refresh_token);

    // Update parentToken and parentRefreshToken
    parentToken = res.body.access_token;
    parentRefreshToken = res.body.refresh_token;
  });

  test('5. POST /parents/children - Link child using 6-character student_code', async () => {
    const res = await request('POST', '/parents/children', { Authorization: `Bearer ${parentToken}` }, {
      student_code: studentCode
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.student.id, linkedStudentId);
  });

  test('6. GET /parents/children - Retrieve linked children summaries', async () => {
    const res = await request('GET', '/parents/children', { Authorization: `Bearer ${parentToken}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.children));
    assert.ok(res.body.children.some(c => c.id === linkedStudentId));
  });

  test('7. POST /parents/books - Ingest PDF/Textbook data into books and book_pages', async () => {
    const res = await request('POST', '/parents/books', { Authorization: `Bearer ${parentToken}` }, {
      title: 'Parent Custom Science Guide',
      author: 'Parent Educator',
      subject: 'Science',
      grade: 8,
      pages: [
        { page_number: 1, text: 'Chapter 1: Photosynthesis and Cellular Respiration.' },
        { page_number: 2, text: 'Chapter 2: Ecosystem Dynamics and Biodiversity.' }
      ]
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.book.title, 'Parent Custom Science Guide');
    assert.equal(res.body.data.book.total_pages, 2);
    createdBookId = res.body.data.book.id;
  });

  test('8. POST /diaries/upload - Create pending diary entry for linked child', async () => {
    const res = await request('POST', '/diaries/upload', { Authorization: `Bearer ${parentToken}` }, {
      student_id: linkedStudentId,
      title: 'Science Chapter 1 Assessment',
      test_date: '2026-10-01',
      book_id: createdBookId,
      syllabus_start_page: 1,
      syllabus_end_page: 2
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.diary_entry.status, 'pending');
    createdDiaryId = res.body.data.diary_entry.id;
  });

  test('9. PUT /diaries/:id/confirm - Confirm diary entry & trigger non-blocking async AI quiz generation', async () => {
    const res = await request('PUT', `/diaries/${createdDiaryId}/confirm`, { Authorization: `Bearer ${parentToken}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'confirmed');
  });

  test('10. GET /reports?student_id={id} - Retrieve aggregated child progress report (Zero IDOR check)', async () => {
    const res = await request('GET', `/reports?student_id=${linkedStudentId}`, { Authorization: `Bearer ${parentToken}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.student_id, linkedStudentId);
  });

  test('11. GET /reports?student_id=99999 - Enforce Zero IDOR 403 Forbidden for unlinked student', async () => {
    const res = await request('GET', '/reports?student_id=99999', { Authorization: `Bearer ${parentToken}` });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'ACCESS_DENIED_CHILD_NOT_LINKED');
  });

  test('12. GET /notifications - Fetch user notifications', async () => {
    const res = await request('GET', '/notifications', { Authorization: `Bearer ${parentToken}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.notifications));
  });

  test('13. POST /auth/logout - Token revocation & session termination', async () => {
    const res = await request('POST', '/auth/logout', { Authorization: `Bearer ${parentToken}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
});
