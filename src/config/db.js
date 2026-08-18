const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// In-Memory Database Fallback for development/testing when MySQL connection is inactive
class InMemoryDatabase {
  constructor() {
    const hashedPass = bcrypt.hashSync('Admin123!', 10);
    this.users = [
      { id: 1, full_name: 'Super Admin User', email: 'superadmin@aituition.app', password_hash: hashedPass, role: 'Super_Admin', status: 'active', created_at: new Date(), updated_at: new Date() },
      { id: 2, full_name: 'Support Admin User', email: 'supportadmin@aituition.app', password_hash: hashedPass, role: 'Super_Admin', status: 'active', created_at: new Date(), updated_at: new Date() },
      { id: 3, full_name: 'AI Manager User', email: 'aimanager@aituition.app', password_hash: hashedPass, role: 'Super_Admin', status: 'active', created_at: new Date(), updated_at: new Date() },
      { id: 4, full_name: 'Sample Student Ali Khan', email: 'student@example.com', password_hash: hashedPass, role: 'student', status: 'active', created_at: new Date(), updated_at: new Date() },
      { id: 5, full_name: 'Sample Tutor Sara Ahmed', email: 'tutor@example.com', password_hash: hashedPass, role: 'tutor', status: 'active', created_at: new Date(), updated_at: new Date() },
      { id: 6, full_name: 'Sample Parent Bilal Shah', email: 'parent@example.com', password_hash: hashedPass, role: 'parent', status: 'active', created_at: new Date(), updated_at: new Date() }
    ];

    this.user_sessions = [
      { id: 1, user_id: 4, session_token: 'sess_token_student_1', device_platform: 'ios', device_version: '1.0', ip_address: '127.0.0.1', user_agent: 'Mozilla/5.0 Mobile', is_active: 1, created_at: new Date(), expires_at: new Date(Date.now() + 3600000) },
      { id: 2, user_id: 4, session_token: 'sess_token_student_2', device_platform: 'web', device_version: '2.4', ip_address: '192.168.1.10', user_agent: 'Chrome/120.0', is_active: 1, created_at: new Date(), expires_at: new Date(Date.now() + 3600000) }
    ];

    this.ai_usage_logs = [
      { id: 1, user_id: 4, tokens_consumed: 1500, query_cost: 0.003000, model_name: 'gemini-3.5-flash', timestamp: new Date() },
      { id: 2, user_id: 4, tokens_consumed: 3200, query_cost: 0.006400, model_name: 'gemini-3.5-flash', timestamp: new Date() },
      { id: 3, user_id: 5, tokens_consumed: 4800, query_cost: 0.009600, model_name: 'gemini-3.5-flash', timestamp: new Date() }
    ];

    this.ai_prompts = [
      { id: 1, title: 'Math & Science Tutor Prompt', system_prompt: 'You are an empathetic AI tutor for Mathematics and Physics.', learning_guardrails: 'Never solve homework directly.', version: 1, updated_by: 3, updated_at: new Date() }
    ];

    this.flagged_moderations = [
      { id: 1, user_id: 4, input_content: 'Can you write an entire assignment essay for me to submit directly?', output_content: 'I can help outline your essay.', violation_category: 'Academic Integrity', flagged_at: new Date(), review_status: 'pending' }
    ];

    this.audit_logs = [];

    // Mock Teacher Module Data Store
    this.classes = [
      { id: 1, teacher_id: 5, name: 'Algebra I - Grade 10', subject: 'Mathematics', grade: 10, created_at: new Date() },
      { id: 2, teacher_id: 5, name: 'Physics Fundamentals', subject: 'Physics', grade: 10, created_at: new Date() },
      { id: 3, teacher_id: 99, name: 'Chemistry Advanced', subject: 'Chemistry', grade: 11, created_at: new Date() }
    ];

    this.enrollments = [
      { id: 1, class_id: 1, student_id: 4, enrolled_at: new Date() },
      { id: 2, class_id: 2, student_id: 4, enrolled_at: new Date() }
    ];

    this.tasks = [
      { id: 1, class_id: 1, student_id: 4, title: 'Quadratic Equations Homework', status: 'pending', grade: null, created_at: new Date(), updated_at: new Date() },
      { id: 2, class_id: 2, student_id: 4, title: 'Newton Laws Lab Report', status: 'completed', grade: 85.0, created_at: new Date(), updated_at: new Date() },
      { id: 3, class_id: 3, student_id: 4, title: 'Organic Chemistry Lab', status: 'pending', grade: null, created_at: new Date(), updated_at: new Date() }
    ];

    this.quizzes = [
      { id: 1, class_id: 1, quiz_title: 'Algebra Midterm Quiz', status: 'pending', created_by: 5, created_at: new Date(), updated_at: new Date() }
    ];

    // Mock Institutions & Parent-Student Links
    this.institutions = [
      { id: 1, name: 'Oxford Academy', code: 'OXF-101', address: 'Main Campus' }
    ];

    this.parent_student_links = [
      { id: 1, parent_id: 6, student_id: 4, relationship_type: 'parent' }
    ];

    // Mock Books & Page-by-Page Pages Store
    this.books = [
      { id: 1, title: 'Algebra I Textbook', author: 'Dr. Euler', subject: 'Mathematics', grade: 10, source_type: 'institution', owner_id: 1, total_pages: 10, created_at: new Date() }
    ];

    this.book_pages = [
      { id: 1, book_id: 1, page_number: 1, page_text: 'Chapter 1: Quadratic Equations. Standard form ax^2 + bx + c = 0 where a is non-zero.', source_type: 'institution', owner_id: 1, created_at: new Date() },
      { id: 2, book_id: 1, page_number: 2, page_text: 'Chapter 1 Continued: Solving by Factoring and Quadratic Formula.', source_type: 'institution', owner_id: 1, created_at: new Date() }
    ];

    // Mock Questions & Quiz Submissions Store
    this.questions = [
      { id: 101, quiz_id: 1, question_text: 'What is the standard form of a quadratic equation?', correct_option: 'A', explanation: 'Standard form is ax^2 + bx + c = 0.' },
      { id: 102, quiz_id: 1, question_text: 'Solve for x: x + 5 = 10', correct_option: 'B', explanation: 'Subtracting 5 from both sides gives x = 5.' }
    ];

    this.quiz_submissions = [];

    // Mock Diary Entries Store
    this.diary_entries = [
      { id: 1, student_id: 4, title: 'Algebra Midterm Exam Prep', test_date: '2026-09-01', book_id: 1, syllabus_start_page: 1, syllabus_end_page: 2, status: 'quiz_generated', created_at: new Date() }
    ];

    // Mock Chat Sessions & Messages Store
    this.chat_sessions = [
      { id: 1, user_id: 4, topic: 'Algebra Homework Assistance', status: 'active', created_at: new Date() }
    ];

    this.chat_messages = [
      { id: 1, session_id: 1, sender: 'user', message: 'How do I solve quadratic equations?', created_at: new Date() },
      { id: 2, session_id: 1, sender: 'ai', message: 'Start by arranging terms into standard form ax^2 + bx + c = 0.', created_at: new Date() }
    ];

    // Ensure student user has grade
    const studentUser = this.users.find(u => u.id === 4);
    if (studentUser) studentUser.grade = 10;

    this.nextUserId = 7;
    this.nextSessionId = 3;
    this.nextPromptId = 2;
    this.nextAuditId = 1;
    this.nextQuizId = 2;
    this.nextChatSessionId = 2;
    this.nextChatMessageId = 3;
  }

  async executeQuery(sql, params = []) {
    const trimmed = sql.trim().toUpperCase();

    // Query Audit Logs
    if (trimmed.startsWith('SELECT') && sql.includes('audit_logs')) {
      let results = [...this.audit_logs];
      results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return [results];
    }

    // Insert Audit Log
    if (trimmed.startsWith('INSERT INTO AUDIT_LOGS') || trimmed.startsWith('INSERT INTO `AUDIT_LOGS`')) {
      const logItem = {
        id: this.nextAuditId++,
        admin_id: params[0],
        action_type: params[1],
        target_resource: params[2],
        payload_delta: typeof params[3] === 'string' ? JSON.parse(params[3]) : params[3],
        ip_address: params[4],
        timestamp: new Date().toISOString()
      };
      this.audit_logs.push(logItem);
      return [{ insertId: logItem.id, affectedRows: 1 }];
    }

    // TEACHER QUERY: Total assigned classes count
    if (sql.includes('COUNT(*) AS total_classes') && sql.includes('FROM classes')) {
      const teacherId = Number(params[0]);
      const count = this.classes.filter(c => c.teacher_id === teacherId).length;
      return [[{ total_classes: count }]];
    }

    // TEACHER QUERY: Total unique enrolled students count
    if (sql.includes('total_students') && sql.includes('enrollments')) {
      const teacherId = Number(params[0]);
      const teacherClassIds = this.classes.filter(c => c.teacher_id === teacherId).map(c => c.id);
      const studentIds = new Set(this.enrollments.filter(e => teacherClassIds.includes(e.class_id)).map(e => e.student_id));
      return [[{ total_students: studentIds.size }]];
    }

    // TEACHER QUERY: Pending ungraded quizzes count
    if (sql.includes('pending_ungraded_quizzes') && sql.includes('quizzes')) {
      const teacherId = Number(params[0]);
      const teacherClassIds = this.classes.filter(c => c.teacher_id === teacherId).map(c => c.id);
      const count = this.quizzes.filter(q => teacherClassIds.includes(q.class_id) && q.status === 'pending').length;
      return [[{ pending_ungraded_quizzes: count }]];
    }

    // TEACHER QUERY: Get assigned classes list
    if (sql.includes('FROM classes') && sql.includes('WHERE teacher_id = ?') && !sql.includes('COUNT')) {
      const teacherId = Number(params[0]);
      const classes = this.classes.filter(c => c.teacher_id === teacherId);
      return [classes];
    }

    // TEACHER QUERY: Get enrolled students list (with optional grade filter)
    if (sql.includes('FROM users u') && sql.includes('JOIN enrollments e')) {
      const teacherId = Number(params[0]);
      const teacherClassIds = this.classes.filter(c => c.teacher_id === teacherId).map(c => c.id);
      const studentIds = new Set(this.enrollments.filter(e => teacherClassIds.includes(e.class_id)).map(e => e.student_id));
      
      let matchedUsers = this.users.filter(u => studentIds.has(u.id));
      if (params.length > 1 && params[1] !== undefined) {
        const targetGrade = Number(params[1]);
        matchedUsers = matchedUsers.filter(u => u.grade === targetGrade);
      }
      return [matchedUsers];
    }

    // TEACHER QUERY: Homework status aggregation
    if (sql.includes('completed_tasks') && sql.includes('pending_tasks')) {
      const teacherId = Number(params[0]);
      const teacherClassIds = this.classes.filter(c => c.teacher_id === teacherId).map(c => c.id);
      const teacherTasks = this.tasks.filter(t => teacherClassIds.includes(t.class_id));

      const completed = teacherTasks.filter(t => t.status === 'completed').length;
      const pending = teacherTasks.filter(t => t.status === 'pending').length;

      return [[{
        completed_tasks: completed,
        pending_tasks: pending,
        total_tasks: teacherTasks.length
      }]];
    }

    // TEACHER QUERY: Grade Task Ownership Check
    if (sql.includes('FROM tasks t') && sql.includes('JOIN classes c') && sql.includes('c.teacher_id = ?')) {
      const taskId = Number(params[0]);
      const teacherId = Number(params[1]);
      const task = this.tasks.find(t => t.id === taskId);
      if (!task) return [[]];
      const targetClass = this.classes.find(c => c.id === task.class_id && c.teacher_id === teacherId);
      if (!targetClass) return [[]];
      return [[{
        id: task.id,
        old_grade: task.grade,
        student_id: task.student_id,
        class_id: task.class_id,
        title: task.title
      }]];
    }

    // TEACHER QUERY: Task global lookup by ID
    if (trimmed.startsWith('SELECT ID FROM TASKS WHERE ID = ?') || trimmed.startsWith('SELECT `ID` FROM `TASKS` WHERE `ID` = ?')) {
      const taskId = Number(params[0]);
      const task = this.tasks.find(t => t.id === taskId);
      return [task ? [{ id: task.id }] : []];
    }

    // TEACHER QUERY: Update Task Grade
    if (trimmed.startsWith('UPDATE TASKS') || trimmed.startsWith('UPDATE `TASKS`')) {
      const newGrade = Number(params[0]);
      const taskId = Number(params[1]);
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        task.grade = newGrade;
        task.status = 'completed';
        task.updated_at = new Date();
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    // TEACHER QUERY: Class Ownership Check
    if (sql.includes('FROM classes') && sql.includes('WHERE id = ? AND teacher_id = ?')) {
      const classId = Number(params[0]);
      const teacherId = Number(params[1]);
      const targetClass = this.classes.find(c => c.id === classId && c.teacher_id === teacherId);
      return [targetClass ? [{ id: targetClass.id, name: targetClass.name }] : []];
    }

    // TEACHER QUERY: Class global lookup by ID
    if (trimmed.startsWith('SELECT ID FROM CLASSES WHERE ID = ?') || trimmed.startsWith('SELECT `ID` FROM `CLASSES` WHERE `ID` = ?')) {
      const classId = Number(params[0]);
      const targetClass = this.classes.find(c => c.id === classId);
      return [targetClass ? [{ id: targetClass.id }] : []];
    }

    // STUDENT QUERY: Enrollment check (class_id & student_id)
    if (sql.includes('FROM enrollments') && sql.includes('WHERE class_id = ? AND student_id = ?')) {
      const classId = Number(params[0]);
      const studentId = Number(params[1]);
      const enrollment = this.enrollments.find(e => e.class_id === classId && e.student_id === studentId);
      return [enrollment ? [{ id: enrollment.id }] : []];
    }

    // STUDENT QUERY: Get homework list for student
    if (sql.includes('c.id AS homework_id') && sql.includes('FROM classes c')) {
      const studentId = Number(params[0]);
      const studentClassIds = this.enrollments.filter(e => e.student_id === studentId).map(e => e.class_id);
      const studentClasses = this.classes.filter(c => studentClassIds.includes(c.id)).map(c => ({
        homework_id: c.id,
        title: c.name,
        subject: c.subject,
        grade: c.grade,
        created_at: c.created_at
      }));
      return [studentClasses];
    }

    // STUDENT QUERY: Get tasks for homework/class
    if (sql.includes('WHERE class_id = ? AND student_id = ?')) {
      const classId = Number(params[0]);
      const studentId = Number(params[1]);
      const matchedTasks = this.tasks.filter(t => t.class_id === classId && t.student_id === studentId);
      return [matchedTasks];
    }

    // STUDENT QUERY: Task ownership check (id & student_id)
    if (sql.includes('FROM tasks') && sql.includes('WHERE id = ? AND student_id = ?')) {
      const taskId = Number(params[0]);
      const studentId = Number(params[1]);
      const task = this.tasks.find(t => t.id === taskId && t.student_id === studentId);
      return [task ? [{ id: task.id, class_id: task.class_id, title: task.title, status: task.status }] : []];
    }

    // STUDENT QUERY: Chat Sessions Insert
    if (trimmed.startsWith('INSERT INTO CHAT_SESSIONS') || trimmed.startsWith('INSERT INTO `CHAT_SESSIONS`')) {
      const newSession = {
        id: this.nextChatSessionId++,
        user_id: Number(params[0]),
        topic: params[1],
        status: 'active',
        created_at: new Date()
      };
      this.chat_sessions.push(newSession);
      return [{ insertId: newSession.id, affectedRows: 1 }];
    }

    // STUDENT QUERY: Chat Sessions Ownership Check
    if (sql.includes('FROM chat_sessions') && sql.includes('WHERE id = ? AND user_id = ?')) {
      const sessionId = Number(params[0]);
      const studentId = Number(params[1]);
      const session = this.chat_sessions.find(s => s.id === sessionId && s.user_id === studentId);
      return [session ? [{ id: session.id, topic: session.topic }] : []];
    }

    // STUDENT QUERY: Chat Sessions Global Lookup
    if (trimmed.startsWith('SELECT ID FROM CHAT_SESSIONS WHERE ID = ?') || trimmed.startsWith('SELECT `ID` FROM `CHAT_SESSIONS` WHERE `ID` = ?')) {
      const sessionId = Number(params[0]);
      const session = this.chat_sessions.find(s => s.id === sessionId);
      return [session ? [{ id: session.id }] : []];
    }

    // STUDENT QUERY: Chat Messages Insert
    if (trimmed.startsWith('INSERT INTO CHAT_MESSAGES') || trimmed.startsWith('INSERT INTO `CHAT_MESSAGES`')) {
      const newMsg = {
        id: this.nextChatMessageId++,
        session_id: Number(params[0]),
        sender: params[1],
        message: params[2],
        created_at: new Date()
      };
      this.chat_messages.push(newMsg);
      return [{ insertId: newMsg.id, affectedRows: 1 }];
    }

    // QUIZ & QUESTION INSERTION HANDLERS
    if (trimmed.startsWith('INSERT INTO QUIZZES') || trimmed.startsWith('INSERT INTO `QUIZZES`')) {
      const newQuiz = {
        id: this.quizzes.length + 1,
        diary_id: params[0] ? Number(params[0]) : null,
        quiz_title: params[1],
        status: 'pending',
        created_by: Number(params[2]),
        created_at: new Date()
      };
      this.quizzes.push(newQuiz);
      return [{ insertId: newQuiz.id, affectedRows: 1 }];
    }

    if (trimmed.startsWith('INSERT INTO QUESTIONS') || trimmed.startsWith('INSERT INTO `QUESTIONS`')) {
      const newQuestion = {
        id: this.questions.length + 101,
        quiz_id: Number(params[0]),
        diary_id: params[1] ? Number(params[1]) : null,
        question_text: params[2],
        options_json: params[3],
        correct_option: params[4],
        explanation: params[5],
        created_at: new Date()
      };
      this.questions.push(newQuestion);
      return [{ insertId: newQuestion.id, affectedRows: 1 }];
    }

    // BOOK QUERY: Insert book metadata
    if (trimmed.startsWith('INSERT INTO BOOKS') || trimmed.startsWith('INSERT INTO `BOOKS`')) {
      const newBook = {
        id: this.books.length + 1,
        title: params[0],
        author: params[1],
        subject: params[2],
        grade: params[3],
        source_type: params[4],
        owner_id: Number(params[5]),
        total_pages: Number(params[6]),
        created_at: new Date()
      };
      this.books.push(newBook);
      return [{ insertId: newBook.id, affectedRows: 1 }];
    }

    // BOOK QUERY: Insert book_pages
    if (trimmed.startsWith('INSERT INTO BOOK_PAGES') || trimmed.startsWith('INSERT INTO `BOOK_PAGES`')) {
      const newPage = {
        id: this.book_pages.length + 1,
        book_id: Number(params[0]),
        page_number: Number(params[1]),
        page_text: params[2],
        source_type: params[3],
        owner_id: Number(params[4]),
        created_at: new Date()
      };
      this.book_pages.push(newPage);
      return [{ insertId: newPage.id, affectedRows: 1 }];
    }

    // BOOK QUERY: Select book by ID
    if (sql.includes('FROM books WHERE id = ?') || sql.includes('FROM `books` WHERE `id` = ?')) {
      const bookId = Number(params[0]);
      const book = this.books.find(b => b.id === bookId);
      return [book ? [book] : []];
    }

    // BOOK QUERY: Select page text range
    if (sql.includes('FROM book_pages') && sql.includes('BETWEEN ? AND ?')) {
      const bookId = Number(params[0]);
      const startPage = Number(params[1]);
      const endPage = Number(params[2]);
      const matchedPages = this.book_pages.filter(p => p.book_id === bookId && p.page_number >= startPage && p.page_number <= endPage);
      return [matchedPages];
    }

    // PARENT LINK QUERY: Parent student link check
    if (sql.includes('FROM parent_student_links') && sql.includes('WHERE parent_id = ? AND student_id = ?')) {
      const parentId = Number(params[0]);
      const studentId = Number(params[1]);
      const link = this.parent_student_links.find(l => l.parent_id === parentId && l.student_id === studentId);
      return [link ? [{ id: link.id }] : []];
    }

    // DIARY QUERY: Insert diary entry
    if (trimmed.startsWith('INSERT INTO DIARY_ENTRIES') || trimmed.startsWith('INSERT INTO `DIARY_ENTRIES`')) {
      const newDiary = {
        id: this.diary_entries.length + 1,
        student_id: Number(params[0]),
        title: params[1],
        test_date: params[2],
        book_id: Number(params[3]),
        syllabus_start_page: Number(params[4]),
        syllabus_end_page: Number(params[5]),
        status: 'pending',
        created_at: new Date()
      };
      this.diary_entries.push(newDiary);
      return [{ insertId: newDiary.id, affectedRows: 1 }];
    }

    // DIARY QUERY: Update status
    if (trimmed.startsWith('UPDATE DIARY_ENTRIES') || trimmed.startsWith('UPDATE `DIARY_ENTRIES`')) {
      const diaryId = Number(params[0]);
      const diary = this.diary_entries.find(d => d.id === diaryId);
      if (diary) {
        diary.status = 'quiz_generated';
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    // DIARY QUERY: Select entries for student
    if (sql.includes('FROM diary_entries d') && sql.includes('WHERE d.student_id = ?')) {
      const studentId = Number(params[0]);
      const matchedEntries = this.diary_entries.filter(d => d.student_id === studentId).map(d => {
        const bk = this.books.find(b => b.id === d.book_id);
        return {
          id: d.id,
          student_id: d.student_id,
          title: d.title,
          test_date: d.test_date,
          book_id: d.book_id,
          book_title: bk ? bk.title : 'Textbook',
          syllabus_start_page: d.syllabus_start_page,
          syllabus_end_page: d.syllabus_end_page,
          status: d.status,
          created_at: d.created_at
        };
      });
      return [matchedEntries];
    }

    // QUIZ QUERY: Fetch ground truth questions for quiz_id
    if (sql.includes('FROM questions') && sql.includes('WHERE quiz_id = ?')) {
      const quizId = Number(params[0]);
      const matchedQuestions = this.questions.filter(q => q.quiz_id === quizId);
      return [matchedQuestions];
    }

    // QUIZ QUERY: Insert quiz submission record
    if (trimmed.startsWith('INSERT INTO QUIZ_SUBMISSIONS') || trimmed.startsWith('INSERT INTO `QUIZ_SUBMISSIONS`')) {
      const newSub = {
        id: this.quiz_submissions.length + 1,
        quiz_id: Number(params[0]),
        student_id: Number(params[1]),
        score: Number(params[2]),
        total_questions: Number(params[3]),
        percentage: Number(params[4]),
        submitted_at: new Date()
      };
      this.quiz_submissions.push(newSub);
      return [{ insertId: newSub.id, affectedRows: 1 }];
    }

    // STUDENT QUERY: Quiz ownership check via enrollment
    if (sql.includes('FROM quizzes q') && sql.includes('WHERE q.id = ? AND e.student_id = ?')) {
      const quizId = Number(params[0]);
      const studentId = Number(params[1]);
      const quiz = this.quizzes.find(q => q.id === quizId);
      if (!quiz) return [[]];
      const isEnrolled = this.enrollments.some(e => e.class_id === quiz.class_id && e.student_id === studentId);
      if (!isEnrolled) return [[]];
      return [[{ id: quiz.id, class_id: quiz.class_id, quiz_title: quiz.quiz_title }]];
    }

    // STUDENT QUERY: Quizzes list for student enrollments
    if (sql.includes('FROM quizzes q') && sql.includes('JOIN enrollments e')) {
      const studentId = Number(params[params.length - 1]);
      const studentClassIds = this.enrollments.filter(e => e.student_id === studentId).map(e => e.class_id);
      const studentQuizzes = this.quizzes.filter(q => studentClassIds.includes(q.class_id)).map(q => {
        const cls = this.classes.find(c => c.id === q.class_id);
        return {
          id: q.id,
          class_id: q.class_id,
          class_name: cls ? cls.name : 'Class',
          quiz_title: q.quiz_title,
          status: q.status,
          created_at: q.created_at
        };
      });
      return [studentQuizzes];
    }

    // STUDENT QUERY: Quiz Status Update
    if (trimmed.startsWith('UPDATE QUIZZES') || trimmed.startsWith('UPDATE `QUIZZES`')) {
      const quizId = Number(params[0]);
      const quiz = this.quizzes.find(q => q.id === quizId);
      if (quiz) {
        quiz.status = 'completed';
        quiz.updated_at = new Date();
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    // COUNT users
    if (trimmed.startsWith('SELECT COUNT(*)')) {
      let filtered = [...this.users];
      if (params.length > 0 && typeof params[0] === 'string' && !params[0].startsWith('%')) {
        filtered = filtered.filter(u => u.role === params[0]);
      }
      return [[{ total: filtered.length }]];
    }

    // SELECT users
    if (trimmed.startsWith('SELECT') && sql.includes('users') && !sql.includes('user_sessions')) {
      if (sql.includes('WHERE id = ?') || sql.includes('WHERE `id` = ?')) {
        const id = Number(params[0]);
        const user = this.users.find(u => u.id === id);
        return [user ? [user] : []];
      }
      if (sql.includes('WHERE email = ?') || sql.includes('WHERE `email` = ?')) {
        const email = String(params[0]).toLowerCase();
        const user = this.users.find(u => u.email.toLowerCase() === email);
        return [user ? [user] : []];
      }
      let filtered = [...this.users];
      if (params.length >= 3 && typeof params[0] === 'string' && params[0].startsWith('%')) {
        const term = params[0].replace(/%/g, '').toLowerCase();
        filtered = filtered.filter(u => u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
      }
      return [filtered];
    }

    // INSERT INTO users
    if (trimmed.startsWith('INSERT INTO USERS') || trimmed.startsWith('INSERT INTO `USERS`')) {
      const newUser = {
        id: this.nextUserId++,
        full_name: params[0],
        email: params[1],
        password_hash: params[2],
        role: params[3] || 'student',
        account_type: params[4] || 'institutional',
        status: 'active',
        student_code: params[5] || null,
        created_at: new Date(),
        updated_at: new Date()
      };
      this.users.push(newUser);
      return [{ insertId: newUser.id, affectedRows: 1 }];
    }

    // SELECT user by student_code
    if (sql.includes('student_code = UPPER(?)') || sql.includes('student_code = ?')) {
      const targetCode = String(params[0]).toUpperCase();
      const matched = this.users.filter(u => u.student_code && u.student_code.toUpperCase() === targetCode && u.role === 'student');
      return [matched];
    }

    // INSERT INTO parent_student_links
    if (trimmed.startsWith('INSERT INTO PARENT_STUDENT_LINKS') || trimmed.startsWith('INSERT INTO `PARENT_STUDENT_LINKS`')) {
      const pId = Number(params[0]);
      const sId = Number(params[1]);
      const existingLink = this.parent_student_links.find(l => l.parent_id === pId && l.student_id === sId);
      if (existingLink) {
        const err = new Error('Duplicate link');
        err.code = 'ER_DUP_ENTRY';
        throw err;
      }
      const newLink = { id: this.parent_student_links.length + 1, parent_id: pId, student_id: sId, created_at: new Date() };
      this.parent_student_links.push(newLink);
      return [{ insertId: newLink.id, affectedRows: 1 }];
    }

    // GET linked children
    if (sql.includes('FROM users u') && sql.includes('JOIN parent_student_links psl')) {
      const parentId = Number(params[0]);
      const linkedStudentIds = this.parent_student_links.filter(l => l.parent_id === parentId).map(l => l.student_id);
      const matchedChildren = this.users.filter(u => linkedStudentIds.includes(u.id)).map(u => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        grade: u.grade || 10,
        student_code: u.student_code,
        status: u.status,
        linked_at: new Date()
      }));
      return [matchedChildren];
    }

    // INSERT INTO notifications
    if (trimmed.startsWith('INSERT INTO NOTIFICATIONS') || trimmed.startsWith('INSERT INTO `NOTIFICATIONS`')) {
      if (!this.notifications) this.notifications = [];
      const newNotif = { id: this.notifications.length + 1, user_id: Number(params[0]), title: params[1], message: params[2], is_read: 0, created_at: new Date() };
      this.notifications.push(newNotif);
      return [{ insertId: newNotif.id, affectedRows: 1 }];
    }

    // GET notifications
    if (trimmed.startsWith('SELECT') && sql.includes('notifications')) {
      if (!this.notifications) this.notifications = [];
      const userId = Number(params[0]);
      const matched = this.notifications.filter(n => n.user_id === userId);
      return [matched];
    }

    // INSERT INTO user_sessions
    if (trimmed.startsWith('INSERT INTO USER_SESSIONS') || trimmed.startsWith('INSERT INTO `USER_SESSIONS`')) {
      const newSess = {
        id: this.user_sessions.length + 1,
        user_id: Number(params[0]),
        refresh_token_hash: params[1],
        device_info: params[2],
        ip_address: params[3],
        expires_at: params[4],
        is_revoked: 0,
        is_active: 1,
        created_at: new Date()
      };
      this.user_sessions.push(newSess);
      return [{ insertId: newSess.id, affectedRows: 1 }];
    }

    // GET session by refresh_token_hash
    if (sql.includes('refresh_token_hash = ?')) {
      const hashVal = params[0];
      const sess = this.user_sessions.filter(s => s.refresh_token_hash === hashVal && s.is_revoked === 0);
      return [sess];
    }

    // UPDATE user_sessions by refresh_token_hash or user_id
    if (trimmed.startsWith('UPDATE USER_SESSIONS') || trimmed.startsWith('UPDATE `USER_SESSIONS`')) {
      if (sql.includes('WHERE refresh_token_hash = ?')) {
        const hashVal = params[0];
        this.user_sessions.forEach(s => { if (s.refresh_token_hash === hashVal) s.is_revoked = 1; });
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('WHERE user_id = ?')) {
        const uId = Number(params[0]);
        this.user_sessions.forEach(s => { if (s.user_id === uId) s.is_revoked = 1; });
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('WHERE id = ?')) {
        const sId = Number(params[0]);
        this.user_sessions.forEach(s => { if (s.id === sId) s.is_revoked = 1; });
        return [{ affectedRows: 1 }];
      }
    }

    // UPDATE users
    if ((trimmed.startsWith('UPDATE USERS') || trimmed.startsWith('UPDATE `USERS`')) && !sql.includes('status = ?')) {
      const full_name = params[0];
      const email = params[1];
      const role = params[2];
      const id = Number(params[3]);
      const user = this.users.find(u => u.id === id);
      if (user) {
        user.full_name = full_name;
        user.email = email;
        user.role = role;
        user.updated_at = new Date();
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    // PATCH user status
    if (sql.includes('SET status = ?') || sql.includes('SET `status` = ?')) {
      const status = params[0];
      const id = Number(params[1]);
      const user = this.users.find(u => u.id === id);
      if (user) {
        user.status = status;
        user.updated_at = new Date();
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    // GET sessions by user_id
    if (trimmed.startsWith('SELECT') && sql.includes('user_sessions') && sql.includes('user_id = ?')) {
      const userId = Number(params[0]);
      const sessions = this.user_sessions.filter(s => s.user_id === userId && s.is_revoked === 0);
      return [sessions];
    }

    // GET quiz_submissions reports for student
    if (sql.includes('FROM quiz_submissions qs') && sql.includes('WHERE qs.student_id = ?')) {
      const sId = Number(params[0]);
      const matched = this.quiz_submissions.filter(qs => qs.student_id === sId).map(qs => {
        const q = this.quizzes.find(qz => qz.id === qs.quiz_id);
        return {
          id: qs.id,
          quiz_id: qs.quiz_id,
          quiz_title: q ? q.quiz_title : 'Assessment Quiz',
          score: qs.score,
          total_questions: qs.total_questions,
          percentage: qs.percentage,
          submitted_at: qs.submitted_at
        };
      });
      return [matched];
    }

    // AI Usage Stats
    if (sql.includes('ai_usage_logs')) {
      const totalTokens = this.ai_usage_logs.reduce((acc, item) => acc + item.tokens_consumed, 0);
      const totalCost = this.ai_usage_logs.reduce((acc, item) => acc + Number(item.query_cost), 0);
      return [[{
        total_tokens: totalTokens,
        total_cost: totalCost.toFixed(4),
        total_queries: this.ai_usage_logs.length
      }]];
    }

    // UPDATE ai_prompts
    if (trimmed.startsWith('UPDATE AI_PROMPTS') || trimmed.startsWith('UPDATE `AI_PROMPTS`')) {
      const title = params[0];
      const prompt = params[1];
      const guardrails = params[2];
      const updated_by = params[3];
      const id = Number(params[4]);
      const promptObj = this.ai_prompts.find(p => p.id === id);
      if (promptObj) {
        promptObj.title = title;
        promptObj.system_prompt = prompt;
        promptObj.learning_guardrails = guardrails;
        promptObj.version += 1;
        promptObj.updated_by = updated_by;
        promptObj.updated_at = new Date();
        return [{ affectedRows: 1 }];
      } else {
        const newPrompt = {
          id,
          title,
          system_prompt: prompt,
          learning_guardrails: guardrails,
          version: 1,
          updated_by,
          updated_at: new Date()
        };
        this.ai_prompts.push(newPrompt);
        return [{ affectedRows: 1 }];
      }
    }

    // GET flagged moderation
    if (sql.includes('flagged_moderations')) {
      return [this.flagged_moderations];
    }

    // GET dashboard KPIs
    if (sql.includes('SELECT') && sql.includes('COUNT')) {
      return [[{
        total_users: this.users.length,
        active_sessions: this.user_sessions.filter(s => s.is_revoked === 0).length,
        flagged_count: this.flagged_moderations.filter(m => m.review_status === 'pending').length
      }]];
    }

    return [[]];
  }
}

const memoryDb = new InMemoryDatabase();
let mysqlPool = null;

try {
  mysqlPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ai_tuition_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
} catch (e) {
  mysqlPool = null;
}

// Wrapper pool that falls back to in-memory store if MySQL isn't active
const pool = {
  async execute(sql, params) {
    if (mysqlPool) {
      try {
        return await mysqlPool.execute(sql, params);
      } catch (err) {
        // If DB connection fails (e.g. MySQL server not running locally), fallback to in-memory DB
        return await memoryDb.executeQuery(sql, params);
      }
    } else {
      return await memoryDb.executeQuery(sql, params);
    }
  },
  async query(sql, params) {
    return this.execute(sql, params);
  },
  async getConnection() {
    if (mysqlPool) {
      try {
        const conn = await mysqlPool.getConnection();
        return conn;
      } catch (err) {
        // Fallback transaction object
      }
    }
    return {
      async execute(sql, params) {
        return pool.execute(sql, params);
      },
      async query(sql, params) {
        return pool.execute(sql, params);
      },
      async beginTransaction() {},
      async commit() {},
      async rollback() {},
      release() {}
    };
  }
};

module.exports = pool;
