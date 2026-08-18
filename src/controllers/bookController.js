const db = require('../config/db');
const bookService = require('../services/bookService');

/**
 * Book Controller — Textbook & Curriculum Management
 * Handles multi-part textbook ingestion and zero-trust accessibility queries.
 */
const bookController = {
  /**
   * POST /api/v1/books
   * Ingests textbook metadata and page-by-page content.
   */
  async uploadBook(req, res, next) {
    try {
      const { title, author, subject, grade, pages } = req.body;

      // Determine owner_id and source_type based on user role
      let sourceType = 'institution';
      let ownerId = req.user.institution_id || req.user.id;

      if (req.user.role === 'parent') {
        sourceType = 'parent';
        ownerId = req.user.id;
      }

      const book = await bookService.ingestBook({
        title,
        author,
        subject,
        grade,
        sourceType,
        ownerId,
        pages: Array.isArray(pages) ? pages : []
      });

      res.locals.auditAction = 'UPLOAD_TEXTBOOK';
      res.locals.auditTarget = '/api/v1/books';
      res.locals.auditDelta = {
        book_id: book.id,
        title: book.title,
        source_type: sourceType,
        total_pages: book.total_pages
      };

      return res.status(201).json({
        message: 'Textbook ingested and stored page-by-page successfully.',
        data: {
          book
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/books
   * Lists textbooks accessible to the user based on institutional or parent hierarchy.
   */
  async getAccessibleBooks(req, res, next) {
    try {
      const user = req.user;
      let sql = '';
      let params = [];

      if (user.role === 'Super_Admin') {
        sql = 'SELECT * FROM books ORDER BY id DESC';
      } else if (user.role === 'tutor' || (user.role === 'student' && user.account_type === 'institutional')) {
        sql = 'SELECT * FROM books WHERE source_type = "institution" AND owner_id = ? ORDER BY id DESC';
        params = [user.institution_id || user.id];
      } else if (user.role === 'parent') {
        sql = 'SELECT * FROM books WHERE source_type = "parent" AND owner_id = ? ORDER BY id DESC';
        params = [user.id];
      } else if (user.role === 'student' && user.account_type === 'private') {
        sql = `SELECT b.* FROM books b
               JOIN parent_student_links psl ON b.owner_id = psl.parent_id
               WHERE b.source_type = 'parent' AND psl.student_id = ?
               ORDER BY b.id DESC`;
        params = [user.id];
      } else {
        sql = 'SELECT * FROM books WHERE 1=0';
      }

      const [books] = await db.execute(sql, params);

      return res.status(200).json({
        data: {
          books: books || []
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = bookController;
