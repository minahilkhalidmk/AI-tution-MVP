-- AI Tuition Platform Schema (Dual-Hierarchy Educational Model & Defense-in-Depth Pipeline)

CREATE DATABASE IF NOT EXISTS `ai_tuition_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ai_tuition_db`;

-- 1. Institutions Table (Path A: Institutional Authority)
CREATE TABLE IF NOT EXISTS `institutions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `address` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users Table (Supports Dual-Hierarchy Roles: Super_Admin, Support_Admin, AI_Manager, tutor, parent, student)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('Super_Admin', 'Support_Admin', 'AI_Manager', 'tutor', 'parent', 'student') NOT NULL DEFAULT 'student',
  `account_type` ENUM('institutional', 'private') NOT NULL DEFAULT 'institutional',
  `institution_id` INT DEFAULT NULL,
  `status` ENUM('active', 'suspended', 'banned') NOT NULL DEFAULT 'active',
  `student_code` VARCHAR(10) UNIQUE DEFAULT NULL,
  `grade` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE SET NULL,
  INDEX `idx_email` (`email`),
  INDEX `idx_role` (`role`),
  INDEX `idx_institution_id` (`institution_id`),
  INDEX `idx_student_code` (`student_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2b. User Sessions Table (Token Lifecycle & Session Management)
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `refresh_token_hash` VARCHAR(255) NOT NULL,
  `device_info` VARCHAR(255) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `is_revoked` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_user_sessions_lookup` (`user_id`, `is_revoked`),
  INDEX `idx_refresh_hash` (`refresh_token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2c. Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_notif_user` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Parent-Student Links Table (Path B: Private / Independent Hierarchy)
CREATE TABLE IF NOT EXISTS `parent_student_links` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `parent_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `relationship_type` VARCHAR(50) DEFAULT 'parent',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`parent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_parent_student` (`parent_id`, `student_id`),
  INDEX `idx_parent_id` (`parent_id`),
  INDEX `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Classes Table
CREATE TABLE IF NOT EXISTS `classes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT DEFAULT NULL,
  `teacher_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(100) NOT NULL,
  `grade` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_class_institution_id` (`institution_id`),
  INDEX `idx_class_teacher_id` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Enrollments Table
CREATE TABLE IF NOT EXISTS `enrollments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `enrolled_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_class_student` (`class_id`, `student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Books Table (Curriculum & Custom Textbooks Metadata)
CREATE TABLE IF NOT EXISTS `books` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `author` VARCHAR(255) DEFAULT 'Unknown',
  `subject` VARCHAR(100) NOT NULL,
  `grade` INT DEFAULT NULL,
  `source_type` ENUM('institution', 'parent') NOT NULL,
  `owner_id` INT NOT NULL,
  `total_pages` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_books_source` (`source_type`, `owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Book Pages Table (MySQL Page-by-Page Relational Text Storage)
CREATE TABLE IF NOT EXISTS `book_pages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `book_id` INT NOT NULL,
  `page_number` INT NOT NULL,
  `page_text` LONGTEXT NOT NULL,
  `source_type` ENUM('institution', 'parent') NOT NULL,
  `owner_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_book_page` (`book_id`, `page_number`),
  INDEX `idx_page_lookup` (`book_id`, `page_number`),
  INDEX `idx_page_owner` (`source_type`, `owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Diary Entries Table (Student Test & Syllabus References)
CREATE TABLE IF NOT EXISTS `diary_entries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `test_date` DATE NOT NULL,
  `book_id` INT NOT NULL,
  `syllabus_start_page` INT NOT NULL,
  `syllabus_end_page` INT NOT NULL,
  `status` ENUM('pending', 'quiz_generated', 'completed') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  INDEX `idx_diary_student` (`student_id`),
  INDEX `idx_diary_book` (`book_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Quizzes Table
CREATE TABLE IF NOT EXISTS `quizzes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` INT DEFAULT NULL,
  `diary_id` INT DEFAULT NULL,
  `quiz_title` VARCHAR(255) NOT NULL,
  `status` ENUM('pending', 'completed', 'ungraded') NOT NULL DEFAULT 'pending',
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`diary_id`) REFERENCES `diary_entries` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Questions Table (Includes JSON Options & Explanation)
CREATE TABLE IF NOT EXISTS `questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `quiz_id` INT NOT NULL,
  `diary_id` INT DEFAULT NULL,
  `question_text` TEXT NOT NULL,
  `options_json` JSON NOT NULL,
  `correct_option` VARCHAR(10) NOT NULL,
  `explanation` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`diary_id`) REFERENCES `diary_entries` (`id`) ON DELETE SET NULL,
  INDEX `idx_questions_quiz` (`quiz_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Quiz Submissions Table (All-in-One Evaluation & Breakdown Storage)
CREATE TABLE IF NOT EXISTS `quiz_submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `quiz_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `score` INT NOT NULL DEFAULT 0,
  `total_questions` INT NOT NULL DEFAULT 0,
  `percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `breakdown_json` JSON DEFAULT NULL,
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_sub_quiz` (`quiz_id`),
  INDEX `idx_sub_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Tasks Table
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` INT DEFAULT NULL,
  `student_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `status` ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
  `grade` DECIMAL(5,2) DEFAULT NULL,
  `due_date` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Academic Audit Logs Table
CREATE TABLE IF NOT EXISTS `academic_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actor_id` INT NOT NULL,
  `action_type` VARCHAR(100) NOT NULL,
  `target_student_id` INT NOT NULL,
  `details_json` JSON DEFAULT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`),
  FOREIGN KEY (`target_student_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. AI Usage Logs Table
CREATE TABLE IF NOT EXISTS `ai_usage_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `tokens_consumed` INT NOT NULL DEFAULT 0,
  `query_cost` DECIMAL(10, 6) NOT NULL DEFAULT 0.000000,
  `model_name` VARCHAR(100) NOT NULL DEFAULT 'gemini-3.5-flash',
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Immutable System Audit Logs Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT NOT NULL,
  `action_type` VARCHAR(100) NOT NULL,
  `target_resource` VARCHAR(255) NOT NULL,
  `payload_delta` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. AI Prompts Table
CREATE TABLE IF NOT EXISTS `ai_prompts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `system_prompt` TEXT NOT NULL,
  `learning_guardrails` TEXT NOT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `updated_by` INT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Flagged Moderations Table
CREATE TABLE IF NOT EXISTS `flagged_moderations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `input_content` TEXT NOT NULL,
  `output_content` TEXT NOT NULL,
  `violation_category` VARCHAR(100) NOT NULL,
  `review_status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `flagged_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

