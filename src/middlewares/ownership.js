const db = require('../config/db');

/**
 * 7-Step Security Pipeline — Zero-IDOR Ownership Middleware
 * Verifies that the requested student_id is linked to the authenticated parent user in parent_student_links.
 */
const assertParentChildLink = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'parent') {
      // If user is not parent (e.g., student accessing their own data), pass if student is accessing their own id
      if (req.user && req.user.role === 'student') {
        const targetStudentId = req.params.studentId || req.params.student_id || req.query.student_id || req.body.student_id;
        if (!targetStudentId || Number(targetStudentId) === Number(req.user.id)) {
          return next();
        }
      }
    }

    const studentId = req.params.studentId || req.params.student_id || req.query.student_id || req.body.student_id;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'student_id is required to verify parent-child relationship.'
      });
    }

    const parentId = req.user.id;

    const [rows] = await db.execute(
      'SELECT 1 FROM parent_student_links WHERE parent_id = ? AND student_id = ? LIMIT 1',
      [parentId, studentId]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED_CHILD_NOT_LINKED',
        message: `Access denied. Student ID ${studentId} is not linked to parent account ID ${parentId}.`
      });
    }

    req.targetStudentId = Number(studentId);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  assertParentChildLink
};
