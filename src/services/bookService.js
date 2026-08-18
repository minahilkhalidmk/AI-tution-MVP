const db = require('../config/db');

/**
 * Book Service — Page-by-Page Relational Book Ingestion & Storage
 * Handles page-level textbook processing and zero-trust accessibility scoping.
 */
const bookService = {
  /**
   * Ingests textbook metadata and page-by-page content into MySQL relational tables.
   * @param {Object} payload - { title, author, subject, grade, sourceType, ownerId, pages }
   * @returns {Object} Created book object with total page count.
   */
  async ingestBook({ title, author = 'Unknown', subject, grade = null, sourceType, ownerId, pages = [] }) {
    if (!['institution', 'parent'].includes(sourceType)) {
      throw new Error("Invalid sourceType. Must be either 'institution' or 'parent'.");
    }

    const totalPages = pages.length;

    // 1. Insert book metadata record
    const [result] = await db.execute(
      `INSERT INTO books (title, author, subject, grade, source_type, owner_id, total_pages, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [title, author, subject, grade, sourceType, ownerId, totalPages]
    );

    const bookId = result.insertId;

    // 2. Insert page-by-page text records into book_pages table
    for (let i = 0; i < pages.length; i++) {
      const pageNum = i + 1;
      const pageText = typeof pages[i] === 'string' ? pages[i] : (pages[i].page_text || '');

      await db.execute(
        `INSERT INTO book_pages (book_id, page_number, page_text, source_type, owner_id, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [bookId, pageNum, pageText, sourceType, ownerId]
      );
    }

    return {
      id: bookId,
      title,
      author,
      subject,
      grade,
      source_type: sourceType,
      owner_id: ownerId,
      total_pages: totalPages
    };
  },

  /**
   * Fetches textbook page content in range [startPage, endPage] with Zero-Trust ownership check.
   */
  async getPageTextRange({ bookId, startPage, endPage, user }) {
    // 1. Fetch book metadata
    const [bookRows] = await db.execute('SELECT * FROM books WHERE id = ?', [bookId]);

    if (!bookRows || bookRows.length === 0) {
      const err = new Error(`Book with ID ${bookId} not found.`);
      err.statusCode = 404;
      err.code = 'BOOK_NOT_FOUND';
      throw err;
    }

    const book = bookRows[0];

    // 2. Zero-Trust Scoping Check: Path A (Institution) vs Path B (Parent)
    if (user.role !== 'Super_Admin') {
      if (book.source_type === 'institution') {
        // Must belong to user's institution
        if (user.institution_id && user.institution_id !== book.owner_id) {
          const err = new Error('Access denied. Book belongs to another institution.');
          err.statusCode = 403;
          err.code = 'FORBIDDEN_RESOURCE';
          throw err;
        }
      } else if (book.source_type === 'parent') {
        // Must belong to user (if parent) or linked parent (if student)
        const isParentOwner = user.role === 'parent' && user.id === book.owner_id;
        let isLinkedStudent = false;

        if (user.role === 'student') {
          const [linkRows] = await db.execute(
            'SELECT id FROM parent_student_links WHERE parent_id = ? AND student_id = ?',
            [book.owner_id, user.id]
          );
          isLinkedStudent = linkRows && linkRows.length > 0;
        }

        if (!isParentOwner && !isLinkedStudent) {
          const err = new Error('Access denied. Custom textbook is not provisioned for your account.');
          err.statusCode = 403;
          err.code = 'FORBIDDEN_RESOURCE';
          throw err;
        }
      }
    }

    // 3. Fetch page-by-page text range from book_pages
    const [pageRows] = await db.execute(
      `SELECT page_number, page_text
       FROM book_pages
       WHERE book_id = ? AND page_number BETWEEN ? AND ?
       ORDER BY page_number ASC`,
      [bookId, startPage, endPage]
    );

    return {
      book,
      pages: pageRows || []
    };
  }
};

module.exports = bookService;
