const db = require('../config/db');

/**
 * Teacher Module Controller
 * Implements strict Defense-in-Depth architecture:
 * 1. Zero-Trust IDOR Prevention: Always extracts teacher ID directly from JWT (req.user.id).
 * 2. SQL Injection Defense: Uses mysql2/promise parameterized queries exclusively.
 * 3. Scope & Ownership Verification: Performs SQL checks before any state modifications.
 * 4. Audit Logging Support: Populates res.locals.auditDelta for state-changing operations.
 * 5. Error Propagation: Delegates all exceptions to Express global error handler via next(err).
 */
const teacherController = {
  /**
   * GET /api/v1/teachers/dashboard
   * Logic: Fetch summary statistics (total assigned classes, total students, pending ungraded quizzes) for req.user.id.
   */
  async getDashboard(req, res, next) {
    try {
      // IDOR Defense: Extract verified teacher identity from JWT payload
      const teacherId = req.user.id;

      // 1. Total assigned classes query
      const [classRows] = await db.execute(
        'SELECT COUNT(*) AS total_classes FROM classes WHERE teacher_id = ?',
        [teacherId]
      );

      // 2. Total unique students enrolled across teacher's assigned classes
      const [studentRows] = await db.execute(
        `SELECT COUNT(DISTINCT e.student_id) AS total_students 
         FROM enrollments e 
         JOIN classes c ON e.class_id = c.id 
         WHERE c.teacher_id = ?`,
        [teacherId]
      );

      // 3. Pending ungraded quizzes in teacher's assigned classes
      const [quizRows] = await db.execute(
        `SELECT COUNT(*) AS pending_ungraded_quizzes 
         FROM quizzes q 
         JOIN classes c ON q.class_id = c.id 
         WHERE c.teacher_id = ? AND q.status = 'pending'`,
        [teacherId]
      );

      const totalClasses = classRows && classRows[0] ? Number(classRows[0].total_classes) : 0;
      const totalStudents = studentRows && studentRows[0] ? Number(studentRows[0].total_students) : 0;
      const pendingUngradedQuizzes = quizRows && quizRows[0] ? Number(quizRows[0].pending_ungraded_quizzes) : 0;

      return res.status(200).json({
        data: {
          summary: {
            total_classes: totalClasses,
            total_students: totalStudents,
            pending_ungraded_quizzes: pendingUngradedQuizzes
          }
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/teachers/classes
   * Logic: Fetch a list of classes assigned to req.user.id.
   */
  async getClasses(req, res, next) {
    try {
      const teacherId = req.user.id;

      const [classes] = await db.execute(
        `SELECT id, name, subject, grade, created_at 
         FROM classes 
         WHERE teacher_id = ? 
         ORDER BY id ASC`,
        [teacherId]
      );

      return res.status(200).json({
        data: {
          classes: classes || []
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/teachers/students
   * Validation: Optional query parameter ?grade={integer}.
   * Logic: Fetch a list of students enrolled in the teacher's classes. Filter by grade if provided.
   */
  async getStudents(req, res, next) {
    try {
      const teacherId = req.user.id;
      const { grade } = req.query;

      let sql = `
        SELECT DISTINCT u.id, u.full_name, u.email, u.status, u.grade, u.created_at
        FROM users u
        JOIN enrollments e ON u.id = e.student_id
        JOIN classes c ON e.class_id = c.id
        WHERE c.teacher_id = ?
      `;
      const queryParams = [teacherId];

      if (grade !== undefined && grade !== null && grade !== '') {
        sql += ` AND u.grade = ?`;
        queryParams.push(Number(grade));
      }

      sql += ` ORDER BY u.id ASC`;

      const [students] = await db.execute(sql, queryParams);

      return res.status(200).json({
        data: {
          students: students || []
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/teachers/homework-status
   * Logic: Fetch aggregated homework completion statistics (completed vs pending tasks) for classes assigned to req.user.id.
   */
  async getHomeworkStatus(req, res, next) {
    try {
      const teacherId = req.user.id;

      const [rows] = await db.execute(
        `SELECT 
           COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS completed_tasks,
           COUNT(CASE WHEN t.status = 'pending' THEN 1 END) AS pending_tasks,
           COUNT(t.id) AS total_tasks
         FROM tasks t
         JOIN classes c ON t.class_id = c.id
         WHERE c.teacher_id = ?`,
        [teacherId]
      );

      const stats = rows && rows[0] ? rows[0] : { completed_tasks: 0, pending_tasks: 0, total_tasks: 0 };

      return res.status(200).json({
        data: {
          homework_status: {
            completed_tasks: Number(stats.completed_tasks || 0),
            pending_tasks: Number(stats.pending_tasks || 0),
            total_tasks: Number(stats.total_tasks || 0)
          }
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/v1/tasks/:id/grade
   * Validation: id must be integer. Body must contain new_grade (float) and reason (string, max 255 chars).
   * Logic:
   *  - Ownership check: Verify task belongs to a student in the teacher's class. Return 403 Forbidden if not owned.
   *  - Update the grade in the tasks table.
   *  - Save old grade and new grade in res.locals.auditDelta for global Audit Logger middleware.
   */
  async gradeTask(req, res, next) {
    try {
      const teacherId = req.user.id;
      const taskId = Number(req.params.id);
      const { new_grade, reason } = req.body;

      // Ownership Check: Execute parameterized SQL query verifying task belongs to a class assigned to teacherId
      const [taskRows] = await db.execute(
        `SELECT t.id, t.grade AS old_grade, t.student_id, t.class_id, t.title
         FROM tasks t
         JOIN classes c ON t.class_id = c.id
         WHERE t.id = ? AND c.teacher_id = ?`,
        [taskId, teacherId]
      );

      if (!taskRows || taskRows.length === 0) {
        // Check if task exists globally to distinguish between 404 (Not Found) and 403 (Forbidden)
        const [existingTask] = await db.execute('SELECT id FROM tasks WHERE id = ?', [taskId]);

        if (!existingTask || existingTask.length === 0) {
          return res.status(404).json({
            error: {
              code: 'TASK_NOT_FOUND',
              message: `Task with ID ${taskId} was not found in the system.`,
              details: []
            }
          });
        }

        // Target task exists, but does NOT belong to a class assigned to req.user.id -> 403 Forbidden
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN_RESOURCE',
            message: 'Access denied. Target task does not belong to a class assigned to your account.',
            details: []
          }
        });
      }

      const task = taskRows[0];
      const previousGrade = task.old_grade !== null ? Number(task.old_grade) : null;
      const updatedGrade = Number(new_grade);

      // Perform state update in tasks table using parameterized query
      await db.execute(
        'UPDATE tasks SET grade = ?, status = "completed", updated_at = NOW() WHERE id = ?',
        [updatedGrade, taskId]
      );

      // Save state transition in res.locals for global Audit Logger middleware
      res.locals.auditAction = 'GRADE_TASK_OVERRIDE';
      res.locals.auditTarget = `/api/v1/tasks/${taskId}/grade`;
      res.locals.auditDelta = {
        task_id: taskId,
        student_id: task.student_id,
        class_id: task.class_id,
        old_grade: previousGrade,
        new_grade: updatedGrade,
        reason: reason
      };

      return res.status(200).json({
        message: 'Task grade updated successfully.',
        data: {
          task: {
            id: taskId,
            class_id: task.class_id,
            student_id: task.student_id,
            old_grade: previousGrade,
            new_grade: updatedGrade,
            reason: reason,
            updated_at: new Date().toISOString()
          }
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/teachers/assign-quiz
   * Validation: Body must contain class_id (integer) and quiz_title (string).
   * Logic:
   *  - Ownership check: Verify class_id is assigned to req.user.id. Return 403 Forbidden if not owned.
   *  - Insert a new quiz record into the quizzes table.
   *  - Populate res.locals.auditDelta for global Audit Logger middleware.
   */
  async assignQuiz(req, res, next) {
    try {
      const teacherId = req.user.id;
      const { class_id, quiz_title } = req.body;

      // Ownership Check: Verify class_id belongs to teacherId
      const [classRows] = await db.execute(
        'SELECT id, name FROM classes WHERE id = ? AND teacher_id = ?',
        [class_id, teacherId]
      );

      if (!classRows || classRows.length === 0) {
        // Check if class exists globally to distinguish between 404 (Not Found) and 403 (Forbidden)
        const [existingClass] = await db.execute('SELECT id FROM classes WHERE id = ?', [class_id]);

        if (!existingClass || existingClass.length === 0) {
          return res.status(404).json({
            error: {
              code: 'CLASS_NOT_FOUND',
              message: `Class with ID ${class_id} was not found in the system.`,
              details: []
            }
          });
        }

        // Target class exists, but is NOT assigned to req.user.id -> 403 Forbidden
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN_RESOURCE',
            message: 'Access denied. Specified class is not assigned to your account.',
            details: []
          }
        });
      }

      // Execute SQL insertion into quizzes table using parameterized values
      const [result] = await db.execute(
        'INSERT INTO quizzes (class_id, quiz_title, status, created_by) VALUES (?, ?, "pending", ?)',
        [class_id, quiz_title, teacherId]
      );

      const quizId = result.insertId;

      // Save state payload delta in res.locals for global Audit Logger middleware
      res.locals.auditAction = 'ASSIGN_QUIZ';
      res.locals.auditTarget = '/api/v1/teachers/assign-quiz';
      res.locals.auditDelta = {
        quiz_id: quizId,
        class_id: class_id,
        quiz_title: quiz_title,
        created_by: teacherId
      };

      return res.status(201).json({
        message: 'Quiz assigned successfully.',
        data: {
          quiz: {
            id: quizId,
            class_id: class_id,
            quiz_title: quiz_title,
            status: 'pending',
            created_by: teacherId,
            created_at: new Date().toISOString()
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = teacherController;
