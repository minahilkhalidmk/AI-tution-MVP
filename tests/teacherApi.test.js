const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');

let server;
let baseUrl;
let tutorToken;
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

describe('AI Tuition Teacher Module & Security Test Suite', () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Obtain JWT tokens for tutor and student test accounts
    const tutorRes = await request('POST', '/auth/login', {}, { email: 'tutor@example.com', password: 'Admin123!' });
    tutorToken = tutorRes.body.access_token;

    const studentRes = await request('POST', '/auth/login', {}, { email: 'student@example.com', password: 'Admin123!' });
    studentToken = studentRes.body.access_token;
  });

  after(() => {
    if (server) server.close();
  });

  test('RBAC: Unauthenticated request to /api/v1/teachers/dashboard returns 401 UNAUTHENTICATED', async () => {
    const res = await request('GET', '/api/v1/teachers/dashboard');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHENTICATED');
  });

  test('RBAC: Unauthorized role (student) accessing /api/v1/teachers/dashboard returns 403 FORBIDDEN_ROLE', async () => {
    const res = await request('GET', '/api/v1/teachers/dashboard', { Authorization: `Bearer ${studentToken}` });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_ROLE');
  });

  test('1. GET /api/v1/teachers/dashboard - Fetches summary stats for authenticated tutor', async () => {
    const res = await request('GET', '/api/v1/teachers/dashboard', { Authorization: `Bearer ${tutorToken}` });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.summary);
    assert.equal(typeof res.body.data.summary.total_classes, 'number');
    assert.equal(typeof res.body.data.summary.total_students, 'number');
    assert.equal(typeof res.body.data.summary.pending_ungraded_quizzes, 'number');
    assert.ok(res.body.data.summary.total_classes >= 2);
  });

  test('2. GET /api/v1/teachers/classes - Fetches assigned classes for tutor', async () => {
    const res = await request('GET', '/api/v1/teachers/classes', { Authorization: `Bearer ${tutorToken}` });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.classes));
    assert.ok(res.body.data.classes.length >= 2);
    assert.equal(res.body.data.classes[0].name, 'Algebra I - Grade 10');
  });

  test('3. GET /api/v1/teachers/students - Fetches enrolled students with optional grade query filter', async () => {
    // Test without query parameter
    const resAll = await request('GET', '/api/v1/teachers/students', { Authorization: `Bearer ${tutorToken}` });
    assert.equal(resAll.status, 200);
    assert.ok(Array.isArray(resAll.body.data.students));
    assert.ok(resAll.body.data.students.length > 0);

    // Test with ?grade=10 query parameter
    const resGrade10 = await request('GET', '/api/v1/teachers/students?grade=10', { Authorization: `Bearer ${tutorToken}` });
    assert.equal(resGrade10.status, 200);
    assert.ok(Array.isArray(resGrade10.body.data.students));
    assert.equal(resGrade10.body.data.students[0].grade, 10);

    // Test with invalid ?grade parameter
    const resInvalidGrade = await request('GET', '/api/v1/teachers/students?grade=invalid', { Authorization: `Bearer ${tutorToken}` });
    assert.equal(resInvalidGrade.status, 400);
    assert.equal(resInvalidGrade.body.error.code, 'VALIDATION_ERROR');
  });

  test('4. GET /api/v1/teachers/homework-status - Aggregates completed vs pending tasks', async () => {
    const res = await request('GET', '/api/v1/teachers/homework-status', { Authorization: `Bearer ${tutorToken}` });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.homework_status);
    assert.equal(typeof res.body.data.homework_status.completed_tasks, 'number');
    assert.equal(typeof res.body.data.homework_status.pending_tasks, 'number');
    assert.equal(typeof res.body.data.homework_status.total_tasks, 'number');
  });

  test('5. PUT /api/v1/tasks/:id/grade - Validates input and executes task grading with ownership check', async () => {
    // Validation failure: missing reason or invalid grade
    const resValidation = await request('PUT', '/api/v1/tasks/1/grade', { Authorization: `Bearer ${tutorToken}` }, {
      new_grade: 150.0 // exceeds max 100
    });
    assert.equal(resValidation.status, 400);
    assert.equal(resValidation.body.error.code, 'VALIDATION_ERROR');

    // Successful grade update on owned task
    const resSuccess = await request('PUT', '/api/v1/tasks/1/grade', { Authorization: `Bearer ${tutorToken}` }, {
      new_grade: 92.5,
      reason: 'Excellent performance on quadratic formula step-by-step resolution.'
    });
    assert.equal(resSuccess.status, 200);
    assert.equal(resSuccess.body.data.task.new_grade, 92.5);
    assert.equal(resSuccess.body.data.task.id, 1);
  });

  test('6. POST /api/v1/teachers/assign-quiz - Validates input and creates new quiz for assigned class', async () => {
    // Validation failure: missing title
    const resValidation = await request('POST', '/api/v1/teachers/assign-quiz', { Authorization: `Bearer ${tutorToken}` }, {
      class_id: 1
    });
    assert.equal(resValidation.status, 400);
    assert.equal(resValidation.body.error.code, 'VALIDATION_ERROR');

    // Successful quiz assignment
    const resSuccess = await request('POST', '/api/v1/teachers/assign-quiz', { Authorization: `Bearer ${tutorToken}` }, {
      class_id: 1,
      quiz_title: 'Polynomial Division & Factoring Assessment'
    });
    assert.equal(resSuccess.status, 201);
    assert.equal(resSuccess.body.data.quiz.quiz_title, 'Polynomial Division & Factoring Assessment');
    assert.equal(resSuccess.body.data.quiz.class_id, 1);
  });

  test('Ownership Security Check: Returns 403 when updating/assigning for unassigned class/task, and 404 when non-existent', async () => {
    // 1. Attempting to assign quiz to class_id 999 (non-existent class -> 404)
    const resQuizNotFound = await request('POST', '/api/v1/teachers/assign-quiz', { Authorization: `Bearer ${tutorToken}` }, {
      class_id: 999,
      quiz_title: 'Unauthorized Quiz Assignment'
    });
    assert.equal(resQuizNotFound.status, 404);
    assert.equal(resQuizNotFound.body.error.code, 'CLASS_NOT_FOUND');

    // 2. Attempting to assign quiz to class_id 3 (assigned to another teacher -> 403 Forbidden)
    const resQuizForbidden = await request('POST', '/api/v1/teachers/assign-quiz', { Authorization: `Bearer ${tutorToken}` }, {
      class_id: 3,
      quiz_title: 'Unowned Class Quiz Assignment'
    });
    assert.equal(resQuizForbidden.status, 403);
    assert.equal(resQuizForbidden.body.error.code, 'FORBIDDEN_RESOURCE');

    // 3. Attempting to grade task 3 (belongs to another teacher's class -> 403 Forbidden)
    const resTaskForbidden = await request('PUT', '/api/v1/tasks/3/grade', { Authorization: `Bearer ${tutorToken}` }, {
      new_grade: 88.0,
      reason: 'Attempting to grade task from another teacher\'s class'
    });
    assert.equal(resTaskForbidden.status, 403);
    assert.equal(resTaskForbidden.body.error.code, 'FORBIDDEN_RESOURCE');

    // 4. Attempting to grade non-existent task 999 (-> 404 Not Found)
    const resTaskNotFound = await request('PUT', '/api/v1/tasks/999/grade', { Authorization: `Bearer ${tutorToken}` }, {
      new_grade: 90.0,
      reason: 'Grading non-existent task'
    });
    assert.equal(resTaskNotFound.status, 404);
    assert.equal(resTaskNotFound.body.error.code, 'TASK_NOT_FOUND');
  });
});
