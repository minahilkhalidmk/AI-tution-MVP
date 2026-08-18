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

describe('All-in-One Quiz Submission & Evaluation API Test Suite', () => {
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

  test('RBAC: Unauthenticated request returns 401 UNAUTHENTICATED', async () => {
    const res = await request('POST', '/api/v1/quizzes/1/submit', {}, { answers: [{ question_id: 101, selected_option: 'A' }] });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHENTICATED');
  });

  test('RBAC: Non-student role (tutor) returns 403 FORBIDDEN_ROLE', async () => {
    const res = await request('POST', '/api/v1/quizzes/1/submit', { Authorization: `Bearer ${tutorToken}` }, {
      answers: [{ question_id: 101, selected_option: 'A' }]
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_ROLE');
  });

  test('Validation: Empty answers array returns 400 VALIDATION_ERROR', async () => {
    const res = await request('POST', '/api/v1/quizzes/1/submit', { Authorization: `Bearer ${studentToken}` }, {
      answers: []
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  test('Validation: Invalid question_id or missing selected_option returns 400 VALIDATION_ERROR', async () => {
    const res = await request('POST', '/api/v1/quizzes/1/submit', { Authorization: `Bearer ${studentToken}` }, {
      answers: [{ question_id: 'invalid', selected_option: '' }]
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  test('Ownership & Security: Non-existent quiz returns 404 QUIZ_NOT_FOUND', async () => {
    const res = await request('POST', '/api/v1/quizzes/999/submit', { Authorization: `Bearer ${studentToken}` }, {
      answers: [{ question_id: 101, selected_option: 'A' }]
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'QUIZ_NOT_FOUND');
  });

  test('Successful Quiz Evaluation: Evaluates answers server-side, records score, returns breakdown', async () => {
    const res = await request('POST', '/api/v1/quizzes/1/submit', { Authorization: `Bearer ${studentToken}` }, {
      answers: [
        { question_id: 101, selected_option: 'A' }, // Correct (A)
        { question_id: 102, selected_option: 'A' }  // Incorrect (Correct is B)
      ]
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.quiz_id, 1);
    assert.equal(res.body.data.total_questions, 2);
    assert.equal(res.body.data.correct_answers_count, 1);
    assert.equal(res.body.data.percentage, 50.0);

    // Verify breakdown details
    assert.ok(Array.isArray(res.body.data.breakdown));
    assert.equal(res.body.data.breakdown.length, 2);

    // Question 101 breakdown
    const q101 = res.body.data.breakdown.find(q => q.question_id === 101);
    assert.equal(q101.user_selected, 'A');
    assert.equal(q101.correct_option, 'A');
    assert.equal(q101.is_correct, true);
    assert.ok(q101.explanation);

    // Question 102 breakdown
    const q102 = res.body.data.breakdown.find(q => q.question_id === 102);
    assert.equal(q102.user_selected, 'A');
    assert.equal(q102.correct_option, 'B');
    assert.equal(q102.is_correct, false);
    assert.ok(q102.explanation);
  });
});
