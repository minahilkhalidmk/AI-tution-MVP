const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');

let server;
let baseUrl;
let studentToken;
let tutorToken;
let parentToken;

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

describe('Dual-Hierarchy Model & Automated AI Quiz Workflow Test Suite', () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Obtain JWT tokens
    const studentRes = await request('POST', '/auth/login', {}, { email: 'student@example.com', password: 'Admin123!' });
    studentToken = studentRes.body.access_token;

    const tutorRes = await request('POST', '/auth/login', {}, { email: 'tutor@example.com', password: 'Admin123!' });
    tutorToken = tutorRes.body.access_token;

    const parentRes = await request('POST', '/auth/login', {}, { email: 'parent@example.com', password: 'Admin123!' });
    parentToken = parentRes.body.access_token;
  });

  after(() => {
    if (server) server.close();
  });

  test('1. POST /api/v1/books - Ingests page-by-page textbook content (Path A: Institutional / Tutor)', async () => {
    const res = await request('POST', '/api/v1/books', { Authorization: `Bearer ${tutorToken}` }, {
      title: 'Physics Fundamentals Vol 1',
      author: 'Dr. Newton',
      subject: 'Physics',
      grade: 10,
      pages: [
        'Page 1: Newton First Law of Motion. An object remains at rest or in uniform motion unless acted upon by a net external force.',
        'Page 2: Newton Second Law of Motion. F = ma.',
        'Page 3: Newton Third Law of Motion. Action and reaction forces are equal and opposite.'
      ]
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.book.title, 'Physics Fundamentals Vol 1');
    assert.equal(res.body.data.book.total_pages, 3);
    assert.equal(res.body.data.book.source_type, 'institution');
  });

  test('2. POST /api/v1/books - Ingests custom textbook (Path B: Private / Parent)', async () => {
    const res = await request('POST', '/api/v1/books', { Authorization: `Bearer ${parentToken}` }, {
      title: 'Custom Advanced Chemistry Prep',
      author: 'Parent Taught',
      subject: 'Chemistry',
      grade: 10,
      pages: [
        'Page 1: Chemical Bonding and Ionic Structures.',
        'Page 2: Covalent Bonding and Molecular Orbitals.'
      ]
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.book.title, 'Custom Advanced Chemistry Prep');
    assert.equal(res.body.data.book.source_type, 'parent');
  });

  test('3. GET /api/v1/books - Lists accessible textbooks based on zero-trust hierarchy', async () => {
    const res = await request('GET', '/api/v1/books', { Authorization: `Bearer ${studentToken}` });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.books));
  });

  test('4. POST /api/v1/diary - Creates test entry and triggers automated AI quiz generation from book pages', async () => {
    const res = await request('POST', '/api/v1/diary', { Authorization: `Bearer ${studentToken}` }, {
      title: 'Physics Midterm Chapter 1 Test',
      test_date: '2026-09-15',
      book_id: 1,
      syllabus_start_page: 1,
      syllabus_end_page: 2
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.diary_entry.title, 'Physics Midterm Chapter 1 Test');
    assert.equal(res.body.data.diary_entry.status, 'quiz_generated');

    // Verify AI generated quiz details
    assert.ok(res.body.data.generated_quiz);
    assert.ok(res.body.data.generated_quiz.quiz_id);
    assert.equal(res.body.data.generated_quiz.total_questions, 2);
  });

  test('5. GET /api/v1/diary - Retrieves test entries for student & linked parent', async () => {
    // Student GET /api/v1/diary
    const resStudent = await request('GET', '/api/v1/diary', { Authorization: `Bearer ${studentToken}` });
    assert.equal(resStudent.status, 200);
    assert.ok(Array.isArray(resStudent.body.data.diary_entries));

    // Linked Parent GET /api/v1/diary?student_id=4
    const resParent = await request('GET', '/api/v1/diary?student_id=4', { Authorization: `Bearer ${parentToken}` });
    assert.equal(resParent.status, 200);
    assert.ok(Array.isArray(resParent.body.data.diary_entries));
  });
});
