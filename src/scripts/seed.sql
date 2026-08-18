-- Seed initial administrative users, AI prompts, usage logs, and safety flags

USE `ai_tuition_db`;

-- Passwords below are hashed using bcrypt with salt 10 for 'Admin123!'
-- HASH: $2a$10$Q78S1vG.hI/ZfV6/bA9j2.eH9c6mY2L7O5X1y3Z5a7B9c1D3E5F7G

INSERT INTO `users` (`id`, `full_name`, `email`, `password_hash`, `role`, `status`, `grade`) VALUES
(1, 'Super Admin User', 'superadmin@aituition.app', '$2a$10$Q78S1vG.hI/ZfV6/bA9j2.eH9c6mY2L7O5X1y3Z5a7B9c1D3E5F7G', 'Super_Admin', 'active', NULL),
(2, 'Support Admin User', 'supportadmin@aituition.app', '$2a$10$Q78S1vG.hI/ZfV6/bA9j2.eH9c6mY2L7O5X1y3Z5a7B9c1D3E5F7G', 'Super_Admin', 'active', NULL),
(3, 'AI Manager User', 'aimanager@aituition.app', '$2a$10$Q78S1vG.hI/ZfV6/bA9j2.eH9c6mY2L7O5X1y3Z5a7B9c1D3E5F7G', 'Super_Admin', 'active', NULL),
(4, 'Sample Student Ali Khan', 'student@example.com', '$2a$10$Q78S1vG.hI/ZfV6/bA9j2.eH9c6mY2L7O5X1y3Z5a7B9c1D3E5F7G', 'student', 'active', 10),
(5, 'Sample Tutor Sara Ahmed', 'tutor@example.com', '$2a$10$Q78S1vG.hI/ZfV6/bA9j2.eH9c6mY2L7O5X1y3Z5a7B9c1D3E5F7G', 'tutor', 'active', NULL),
(6, 'Sample Parent Bilal Shah', 'parent@example.com', '$2a$10$Q78S1vG.hI/ZfV6/bA9j2.eH9c6mY2L7O5X1y3Z5a7B9c1D3E5F7G', 'parent', 'active', NULL)
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `grade` = VALUES(`grade`);

-- Seed AI Prompts
INSERT INTO `ai_prompts` (`id`, `title`, `system_prompt`, `learning_guardrails`, `version`, `updated_by`) VALUES
(1, 'Math & Science Tutor Prompt', 'You are an empathetic, highly structured AI tutor for Mathematics and Physics. Guide students step by step.', 'Never solve homework directly. Use Socratic questioning techniques.', 1, 3)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- Seed AI Usage Logs
INSERT INTO `ai_usage_logs` (`user_id`, `tokens_consumed`, `query_cost`, `model_name`) VALUES
(4, 1500, 0.003000, 'gemini-3.5-flash'),
(4, 3200, 0.006400, 'gemini-3.5-flash'),
(5, 4800, 0.009600, 'gemini-3.5-flash');

-- Seed Flagged Moderations
INSERT INTO `flagged_moderations` (`user_id`, `input_content`, `output_content`, `violation_category`, `review_status`) VALUES
(4, 'Can you write an entire assignment essay for me to submit directly?', 'I can help outline your essay and structure arguments, but cannot write it for direct submission.', 'Academic Integrity', 'pending');

-- Seed Classes assigned to Tutor (user_id = 5)
INSERT INTO `classes` (`id`, `teacher_id`, `name`, `subject`, `grade`) VALUES
(1, 5, 'Algebra I - Grade 10', 'Mathematics', 10),
(2, 5, 'Physics Fundamentals', 'Physics', 10)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Seed Enrollments (student 4 enrolled in class 1 and 2)
INSERT INTO `enrollments` (`id`, `class_id`, `student_id`) VALUES
(1, 1, 4),
(2, 2, 4)
ON DUPLICATE KEY UPDATE `class_id` = VALUES(`class_id`);

-- Seed Tasks (homework)
INSERT INTO `tasks` (`id`, `class_id`, `student_id`, `title`, `status`, `grade`) VALUES
(1, 1, 4, 'Quadratic Equations Practice', 'pending', NULL),
(2, 2, 4, 'Newton Laws Lab Report', 'completed', 85.00)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- Seed Quizzes
INSERT INTO `quizzes` (`id`, `class_id`, `quiz_title`, `status`, `created_by`) VALUES
(1, 1, 'Algebra Quiz 1', 'pending', 5)
ON DUPLICATE KEY UPDATE `quiz_title` = VALUES(`quiz_title`);
