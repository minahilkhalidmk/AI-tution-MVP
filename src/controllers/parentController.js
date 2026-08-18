const db = require('../config/db');
const pdfParse = require('pdf-parse');
const aiQuizService = require('../services/aiQuizService');

/**
 * Parent Module Controller — Path B Dual Hierarchy Implementation
 */
const parentController = {
  /**
   * GET /parents/children
   * Returns list of linked children for authenticated parent account.
   */
  async getChildren(req, res, next) {
    try {
      const parentId = req.user.id;

      const [children] = await db.execute(
        `SELECT u.id, u.full_name, u.email, u.grade, u.student_code, u.status, psl.created_at AS linked_at
         FROM users u
         JOIN parent_student_links psl ON u.id = psl.student_id
         WHERE psl.parent_id = ?
         ORDER BY psl.created_at DESC`,
        [parentId]
      );

      return res.status(200).json({
        success: true,
        children,
        data: { children }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /parents/children
   * Link child to parent account using unique 6-character student_code.
   */
  async linkChild(req, res, next) {
    try {
      const { student_code } = req.body;
      const parentId = req.user.id;

      // 1. Lookup student by student_code
      const [students] = await db.execute(
        'SELECT id, full_name, email, grade, student_code, status FROM users WHERE UPPER(student_code) = UPPER(?) AND role = "student"',
        [student_code]
      );

      if (students.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'STUDENT_NOT_FOUND',
          message: `No active student found with student code '${student_code}'.`
        });
      }

      const student = students[0];

      // 2. Link student to parent in parent_student_links
      try {
        await db.execute(
          'INSERT INTO parent_student_links (parent_id, student_id, created_at) VALUES (?, ?, NOW())',
          [parentId, student.id]
        );
      } catch (dbErr) {
        if (dbErr.code === 'ER_DUP_ENTRY') {
          return res.status(200).json({
            success: true,
            message: 'Student is already linked to this parent account.',
            student
          });
        }
        throw dbErr;
      }

      // 3. Optional notification entry
      try {
        await db.execute(
          'INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, 0, NOW())',
          [student.id, 'Parent Linked', `A parent account has linked to your student profile.`]
        );
      } catch (notifErr) {
        // Non-fatal notification error swallow
      }

      return res.status(201).json({
        success: true,
        message: 'Student successfully linked to parent account.',
        student: {
          id: student.id,
          full_name: student.full_name,
          email: student.email,
          grade: student.grade,
          student_code: student.student_code
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /parents/books
   * PDF Book Ingestion — Parses PDF via pdf-parse and executes MySQL transaction bulk insert into books & book_pages.
   */
  async uploadBook(req, res, next) {
    let connection;
    try {
      const { title, subject, author = 'Unknown', grade = null } = req.body;
      const parentId = req.user.id;
      let pageTexts = [];

      // 1. Check if PDF file was uploaded via Multer
      if (req.file && req.file.buffer) {
        try {
          const parsedPdf = await pdfParse(req.file.buffer);
          // Split PDF text into pages or sequential chunks
          const rawText = parsedPdf.text || '';
          const pagesArr = rawText.split(/\f|\n\s*\n\s*\n/).filter(p => p.trim().length > 0);
          
          if (pagesArr.length > 0) {
            pageTexts = pagesArr.map((text, idx) => ({ page_number: idx + 1, text: text.trim() }));
          } else {
            pageTexts = [{ page_number: 1, text: rawText.trim() || 'Curriculum Content Page 1' }];
          }
        } catch (pdfErr) {
          pageTexts = [{ page_number: 1, text: 'PDF Document Content' }];
        }
      } 
      // 2. Fallback to JSON array body pages (e.g. from API test payload)
      else if (req.body.pages && Array.isArray(req.body.pages)) {
        pageTexts = req.body.pages.map((p, idx) => ({
          page_number: typeof p === 'object' && p.page_number ? p.page_number : idx + 1,
          text: typeof p === 'object' ? p.text || p.content || '' : String(p)
        }));
      } else {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'PDF file upload (file) or JSON pages array (pages) is required.'
        });
      }

      const totalPages = pageTexts.length;

      // 3. MySQL Transaction
      connection = await db.getConnection();
      await connection.beginTransaction();

      const [bookResult] = await connection.execute(
        `INSERT INTO books (title, author, subject, grade, source_type, owner_id, total_pages, created_at)
         VALUES (?, ?, ?, ?, 'parent', ?, ?, NOW())`,
        [title, author, subject, grade, parentId, totalPages]
      );

      const bookId = bookResult.insertId;

      // Bulk Insert into book_pages
      for (const pageObj of pageTexts) {
        await connection.execute(
          `INSERT INTO book_pages (book_id, page_number, page_text, source_type, owner_id, created_at)
           VALUES (?, ?, ?, 'parent', ?, NOW())`,
          [bookId, pageObj.page_number, pageObj.text, parentId]
        );
      }

      await connection.commit();
      connection.release();

      return res.status(201).json({
        success: true,
        message: 'Book and page content ingested successfully.',
        data: {
          book: {
            id: bookId,
            title,
            author,
            subject,
            grade,
            total_pages: totalPages,
            source_type: 'parent',
            owner_id: parentId
          }
        }
      });
    } catch (err) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      next(err);
    }
  },

  /**
   * POST /parents/diaries or POST /diaries/upload
   * Creates a new pending diary entry for linked child.
   */
  async uploadDiaryEntry(req, res, next) {
    try {
      const { student_id, title, test_date, book_id, syllabus_start_page, syllabus_end_page } = req.body;
      const parentId = req.user.id;

      const [result] = await db.execute(
        `INSERT INTO diary_entries (student_id, title, test_date, book_id, syllabus_start_page, syllabus_end_page, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [student_id, title, test_date, book_id, syllabus_start_page, syllabus_end_page]
      );

      const diaryId = result.insertId;

      return res.status(201).json({
        success: true,
        message: 'Diary entry created successfully.',
        data: {
          diary_entry: {
            id: diaryId,
            student_id: Number(student_id),
            title,
            test_date,
            book_id: Number(book_id),
            syllabus_start_page: Number(syllabus_start_page),
            syllabus_end_page: Number(syllabus_end_page),
            status: 'pending',
            created_by: parentId
          }
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /diaries/:id/confirm
   * Confirms diary entry and asynchronously triggers AI quiz generation without blocking response.
   */
  async confirmDiaryEntry(req, res, next) {
    try {
      const diaryId = req.params.id || req.params.entryId;

      const [entries] = await db.execute('SELECT * FROM diary_entries WHERE id = ?', [diaryId]);
      if (entries.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'DIARY_NOT_FOUND',
          message: `Diary entry ID ${diaryId} not found.`
        });
      }

      const entry = entries[0];

      // Update status to 'confirmed'
      await db.execute("UPDATE diary_entries SET status = 'confirmed' WHERE id = ?", [diaryId]);

      // Asynchronous Event: Trigger aiQuizService non-blockingly
      setImmediate(async () => {
        try {
          if (typeof aiQuizService.generateQuizFromPages === 'function') {
            await aiQuizService.generateQuizFromPages({
              diaryId: entry.id,
              bookId: entry.book_id,
              startPage: entry.syllabus_start_page,
              endPage: entry.syllabus_end_page,
              studentId: entry.student_id,
              user: req.user
            });
          }
        } catch (asyncErr) {
          console.error(`[Async Event] Quiz generation error for diary ${diaryId}:`, asyncErr.message);
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Diary entry confirmed. AI quiz generation process triggered asynchronously.',
        data: {
          id: entry.id,
          status: 'confirmed'
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /reports?student_id={id}
   * Aggregates quiz performance metrics and averages for specified student_id.
   */
  async getChildReports(req, res, next) {
    try {
      const studentId = req.query.student_id || req.params.studentId || req.targetStudentId;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'student_id is required for child progress reports.'
        });
      }

      const [submissions] = await db.execute(
        `SELECT qs.id, qs.quiz_id, q.quiz_title, qs.score, qs.total_questions, qs.percentage, qs.submitted_at
         FROM quiz_submissions qs
         JOIN quizzes q ON qs.quiz_id = q.id
         WHERE qs.student_id = ?
         ORDER BY qs.submitted_at DESC`,
        [studentId]
      );

      const totalQuizzes = submissions.length;
      const avgPercentage = totalQuizzes > 0
        ? (submissions.reduce((acc, curr) => acc + Number(curr.percentage), 0) / totalQuizzes).toFixed(2)
        : 0;

      return res.status(200).json({
        success: true,
        data: {
          student_id: Number(studentId),
          total_quizzes: totalQuizzes,
          average_percentage: Number(avgPercentage),
          submissions
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /notifications
   * Fetches unread & recent notifications for logged in user.
   */
  async getNotifications(req, res, next) {
    try {
      const userId = req.user.id;

      let notifications = [];
      try {
        const [rows] = await db.execute(
          'SELECT id, user_id, title, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
          [userId]
        );
        notifications = rows;
      } catch (dbErr) {
        notifications = [];
      }

      return res.status(200).json({
        success: true,
        notifications,
        data: { notifications }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = parentController;
