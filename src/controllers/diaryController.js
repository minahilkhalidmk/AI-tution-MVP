const db = require('../config/db');
const aiQuizService = require('../services/aiQuizService');

/**
 * Diary Controller — Student Syllabus & Test Entry Management
 * Handles test scheduling and triggers automated AI quiz generation from book pages.
 */
const diaryController = {
  /**
   * POST /api/v1/diary
   * Creates a student diary test entry and triggers automated AI quiz generation.
   */
  async createDiaryEntry(req, res, next) {
    try {
      const studentId = req.user.id;
      const { title, test_date, book_id, syllabus_start_page, syllabus_end_page } = req.body;

      const bookId = Number(book_id);
      const startPage = Number(syllabus_start_page);
      const endPage = Number(syllabus_end_page);

      // 1. Insert diary entry into database
      const [result] = await db.execute(
        `INSERT INTO diary_entries (student_id, title, test_date, book_id, syllabus_start_page, syllabus_end_page, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [studentId, title, test_date, bookId, startPage, endPage]
      );

      const diaryId = result.insertId;

      // 2. Trigger automated AI Quiz Generation from specified book page range
      const generatedQuiz = await aiQuizService.generateQuizFromPages({
        diaryId,
        bookId,
        startPage,
        endPage,
        studentId,
        user: req.user
      });

      // 3. Populate res.locals for Audit Logging
      res.locals.auditAction = 'CREATE_DIARY_ENTRY';
      res.locals.auditTarget = '/api/v1/diary';
      res.locals.auditDelta = {
        diary_id: diaryId,
        student_id: studentId,
        title,
        test_date,
        book_id: bookId,
        syllabus_range: `${startPage}-${endPage}`,
        generated_quiz_id: generatedQuiz.quiz_id
      };

      return res.status(201).json({
        message: 'Diary entry created and AI quiz generated successfully.',
        data: {
          diary_entry: {
            id: diaryId,
            student_id: studentId,
            title,
            test_date,
            book_id: bookId,
            syllabus_start_page: startPage,
            syllabus_end_page: endPage,
            status: 'quiz_generated',
            created_at: new Date().toISOString()
          },
          generated_quiz: generatedQuiz
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/diary
   * Retrieves scheduled diary entries for authenticated student (or linked parent).
   */
  async getDiaryEntries(req, res, next) {
    try {
      let targetStudentId = req.user.id;

      // If user is parent, allow optional ?student_id query param with link verification
      if (req.user.role === 'parent' && req.query.student_id) {
        const requestedStudentId = Number(req.query.student_id);
        const [linkRows] = await db.execute(
          'SELECT id FROM parent_student_links WHERE parent_id = ? AND student_id = ?',
          [req.user.id, requestedStudentId]
        );

        if (!linkRows || linkRows.length === 0) {
          return res.status(403).json({
            error: {
              code: 'FORBIDDEN_RESOURCE',
              message: 'Access denied. Target student is not linked to your parent account.',
              details: []
            }
          });
        }

        targetStudentId = requestedStudentId;
      }

      const [entries] = await db.execute(
        `SELECT d.id, d.student_id, d.title, d.test_date, d.book_id, b.title AS book_title,
                d.syllabus_start_page, d.syllabus_end_page, d.status, d.created_at
         FROM diary_entries d
         JOIN books b ON d.book_id = b.id
         WHERE d.student_id = ?
         ORDER BY d.test_date ASC`,
        [targetStudentId]
      );

      return res.status(200).json({
        data: {
          diary_entries: entries || []
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = diaryController;
