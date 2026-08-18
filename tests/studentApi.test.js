const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');

let server;
let baseUrl;
let studentToken;
let tutorToken;

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

describe('AI Tuition Student Module & Security Test Suite', () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Obtain JWT tokens for student and tutor test accounts
    const studentRes = await request('POST', '/auth/login', {}, { email: 'student@example.com', password: 'Admin123!' });
    studentToken = studentRes.body.access_token;

    const tutorRes = await request('POST', '/auth/login', {}, { email: 'tutor@example.com', password: 'Admin123!' });
    tutorToken = tutorRes.body.access_token;
  });

  after(() => {
    if (server) server.close();
  });

  test('RBAC: Unauthenticated request to /students/dashboard returns 401 UNAUTHENTICATED', async () => {
    const res = await request('GET', '/students/dashboard');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHENTICATED');
  });

  test('RBAC: Unauthorized role (tutor) accessing /students/dashboard returns 403 FORBIDDEN_ROLE', async () => {
    const res = await request('GET', '/students/dashboard', { Authorization: `Bearer ${tutorToken}` });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_ROLE');
  });

  test('1. GET /students/dashboard - Retrieves today\'s tasks, streak, and progress', async () => {
    const res = await request('GET', '/students/dashboard', { Authorization: `Bearer ${studentToken}` });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.summary);
    assert.equal(typeof res.body.data.summary.streak, 'number');
    assert.equal(typeof res.body.data.summary.progress_percentage, 'number');
    assert.ok(Array.isArray(res.body.data.today_tasks));
  });

  test('2. GET /homework - Lists all homework assignments for student', async () => {
    const res = await request('GET', '/homework', { Authorization: `Bearer ${studentToken}` });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.homework));
    assert.ok(res.body.data.homework.length >= 1);
  });

  test('3. GET /homework/:id/tasks - Fetches tasks for specified homework with enrollment check', async () => {
    const res = await request('GET', '/homework/1/tasks', { Authorization: `Bearer ${studentToken}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.homework_id, 1);
    assert.ok(Array.isArray(res.body.data.tasks));
  });

  test('4. GET /tasks/current - Fetches current active pending task for student', async () => {
    const res = await request('GET', '/tasks/current', { Authorization: `Bearer ${studentToken}` });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.task !== undefined);
  });

  test('5. POST /tasks/:id/attempt - Submits task attempt for verification', async () => {
    const res = await request('POST', '/tasks/1/attempt', { Authorization: `Bearer ${studentToken}` }, {
      answer: 'Step 1: x = (-b +/- sqrt(b^2-4ac))/2a'
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.task_id, 1);
    assert.equal(res.body.data.status, 'completed');
  });

  test('6. POST /chat/sessions - Starts new AI tutor chat session', async () => {
    const res = await request('POST', '/chat/sessions', { Authorization: `Bearer ${studentToken}` }, {
      topic: 'Calculus Derivatives Help'
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.data.session.id);
    assert.equal(res.body.data.session.topic, 'Calculus Derivatives Help');
  });

  test('7. POST /chat/sessions/:id/messages - Sends message to tutor and receives Socratic feedback', async () => {
    const res = await request('POST', '/chat/sessions/1/messages', { Authorization: `Bearer ${studentToken}` }, {
      message: 'How do I take the derivative of x^2?'
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.session_id, 1);
    assert.ok(res.body.data.ai_response);
  });

  test('8. GET /quizzes - Lists available quizzes for student', async () => {
    const res = await request('GET', '/quizzes', { Authorization: `Bearer ${studentToken}` });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.quizzes));
  });

  test('9. POST /quizzes/:id/submit - Submits quiz answers with score evaluation', async () => {
    const res = await request('POST', '/quizzes/1/submit', { Authorization: `Bearer ${studentToken}` }, {
      answers: [ { question_id: 101, selected_option: 'A' }, { question_id: 102, selected_option: 'B' } ]
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.quiz_id, 1);
  });

  test('Ownership Security Check: Returns 403 for unowned resources, and 404 for non-existent resources', async () => {
    // Homework unowned / unenrolled
    const resUnownedHomework = await request('GET', '/homework/3/tasks', { Authorization: `Bearer ${studentToken}` });
    assert.equal(resUnownedHomework.status, 403);
    assert.equal(resUnownedHomework.body.error.code, 'FORBIDDEN_RESOURCE');

    // Non-existent task attempt
    const resNotFoundTask = await request('POST', '/tasks/999/attempt', { Authorization: `Bearer ${studentToken}` }, {
      answer: 'Invalid answer'
    });
    assert.equal(resNotFoundTask.status, 404);
    assert.equal(resNotFoundTask.body.error.code, 'TASK_NOT_FOUND');
  });
});
