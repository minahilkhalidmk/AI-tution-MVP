const db = require('../config/db');

/**
 * Quiz Module Controller
 * Implements server-side grading, zero-trust IDOR defense, and detailed score analysis.
 */
const quizController = {
  /**
   * POST /api/v1/quizzes/:id/submit
   * Evaluates student submitted answers against the database ground truth.
   */
  async submitAndEvaluateQuiz(req, res, next) {
    try {
      // Zero-Trust IDOR Protection: Extract verified student identity from JWT payload
      const studentId = req.user.id;
      const quizId = parseInt(req.params.id, 10);
      const { answers } = req.body;

      // 1. Ownership & Enrollment Verification
      const [quizRows] = await db.execute(
        `SELECT q.id, q.class_id, q.quiz_title
         FROM quizzes q
         JOIN enrollments e ON q.class_id = e.class_id
         WHERE q.id = ? AND e.student_id = ?`,
        [quizId, studentId]
      );

      if (!quizRows || quizRows.length === 0) {
        // Check if quiz exists globally to distinguish between 404 and 403
        const [globalQuiz] = await db.execute('SELECT id FROM quizzes WHERE id = ?', [quizId]);

        if (!globalQuiz || globalQuiz.length === 0) {
          return res.status(404).json({
            error: {
              code: 'QUIZ_NOT_FOUND',
              message: `Quiz with ID ${quizId} was not found in the system.`,
              details: []
            }
          });
        }

        return res.status(403).json({
          error: {
            code: 'FORBIDDEN_RESOURCE',
            message: 'Access denied. You are not enrolled in the class assigned to this quiz.',
            details: []
          }
        });
      }

      // 2. Fetch Ground Truth Questions from Database
      const [dbQuestions] = await db.execute(
        `SELECT id, question_text, correct_option, explanation
         FROM questions
         WHERE quiz_id = ?
         ORDER BY id ASC`,
        [quizId]
      );

      if (!dbQuestions || dbQuestions.length === 0) {
        return res.status(404).json({
          error: {
            code: 'QUESTIONS_NOT_FOUND',
            message: `No questions found for quiz ID ${quizId}.`,
            details: []
          }
        });
      }

      // Map student submitted answers by question_id for O(1) lookup
      const studentAnswerMap = new Map();
      if (Array.isArray(answers)) {
        for (const ans of answers) {
          if (ans && ans.question_id) {
            studentAnswerMap.set(Number(ans.question_id), String(ans.selected_option).trim().toUpperCase());
          }
        }
      }

      // 3. Perform Server-Side Secure Evaluation Loop
      let correctAnswersCount = 0;
      const breakdown = [];

      for (const question of dbQuestions) {
        const questionId = question.id;
        const correctOption = String(question.correct_option).trim().toUpperCase();
        const userSelected = studentAnswerMap.get(questionId) || null;
        const isCorrect = userSelected !== null && userSelected === correctOption;

        if (isCorrect) {
          correctAnswersCount++;
        }

        breakdown.push({
          question_id: questionId,
          user_selected: userSelected,
          correct_option: correctOption,
          is_correct: isCorrect,
          explanation: question.explanation || 'No explanation provided for this question.'
        });
      }

      const totalQuestions = dbQuestions.length;
      const percentage = parseFloat(((correctAnswersCount / totalQuestions) * 100).toFixed(1));

      // 4. Record Final Submission in Database
      await db.execute(
        `INSERT INTO quiz_submissions (quiz_id, student_id, score, total_questions, percentage, submitted_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [quizId, studentId, correctAnswersCount, totalQuestions, percentage]
      );

      // Update quiz status to completed
      await db.execute(
        'UPDATE quizzes SET status = "completed", updated_at = NOW() WHERE id = ?',
        [quizId]
      );

      // 5. Populate res.locals for Audit Logging
      res.locals.auditAction = 'SUBMIT_AND_EVALUATE_QUIZ';
      res.locals.auditTarget = `/api/v1/quizzes/${quizId}/submit`;
      res.locals.auditDelta = {
        quiz_id: quizId,
        student_id: studentId,
        correct_answers_count: correctAnswersCount,
        total_questions: totalQuestions,
        percentage: percentage
      };

      // 6. Return Structured Evaluation JSON Response
      return res.status(200).json({
        success: true,
        data: {
          quiz_id: quizId,
          total_questions: totalQuestions,
          correct_answers_count: correctAnswersCount,
          percentage: percentage,
          breakdown: breakdown
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = quizController;
