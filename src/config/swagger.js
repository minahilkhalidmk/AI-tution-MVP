const swaggerUi = require('swagger-ui-express');

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'AI Tuition Backend — REST API & Admin Security Pipeline',
    version: '1.0.0',
    description: 'Interactive Swagger UI Documentation. Supports JWT Bearer Token authorization.'
  },
  servers: [
    {
      url: process.env.SERVER_URL || '/',
      description: 'Active Application Server (Render / Local)'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT Token from /auth/login (without "Bearer " prefix in Swagger authorization box)'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register new user with role selection & student code generation',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  full_name: { type: 'string', example: 'Ali Khan' },
                  email: { type: 'string', example: 'student@example.com' },
                  password: { type: 'string', example: 'SecurePass123!' },
                  role: { type: 'string', enum: ['Super_Admin', 'Support_Admin', 'AI_Manager', 'tutor', 'parent', 'student'], example: 'student' },
                  account_type: { type: 'string', enum: ['institutional', 'private'], example: 'private' }
                },
                required: ['full_name', 'email', 'password']
              }
            }
          }
        },
        responses: { 201: { description: 'User registered successfully' }, 409: { description: 'Email already exists' } }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Login to receive JWT Access Token + Refresh Token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'parent@example.com' },
                  password: { type: 'string', example: 'SecurePass123!' },
                  device_info: { type: 'string', example: 'iOS App v1.0' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          200: { description: 'Successful authentication returning JWT access token & HttpOnly refresh token cookie' },
          401: { description: 'Invalid email or password' },
          423: { description: 'Account suspended or banned' }
        }
      }
    },
    '/auth/refresh': {
      post: {
        summary: 'Get new access token using refresh token cookie or body payload',
        tags: ['Authentication'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { refresh_token: { type: 'string' } }
              }
            }
          }
        },
        responses: { 200: { description: 'Token pair refreshed' }, 401: { description: 'Invalid or revoked refresh token' } }
      }
    },
    '/auth/logout': {
      post: {
        summary: 'Revoke access & refresh token session',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Session revoked and cookies cleared' } }
      }
    },
    '/auth/forgot-password': {
      post: {
        summary: 'Send password reset OTP / instructions',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { email: { type: 'string', example: 'parent@example.com' } },
                required: ['email']
              }
            }
          }
        },
        responses: { 200: { description: 'Reset instructions dispatched' } }
      }
    },
    '/auth/reset-password': {
      post: {
        summary: 'Reset password with reset token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  new_password: { type: 'string', example: 'NewSecurePass123!' }
                },
                required: ['token', 'new_password']
              }
            }
          }
        },
        responses: { 200: { description: 'Password reset successful' } }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get current user profile & roles',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Current user profile details' } }
      }
    },
    '/parents/children': {
      get: {
        summary: 'List linked children for parent account',
        tags: ['Parent Module'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Array of linked student summaries' } }
      },
      post: {
        summary: 'Link child account using 6-character student code',
        tags: ['Parent Module'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { student_code: { type: 'string', example: 'A8X2K9' } },
                required: ['student_code']
              }
            }
          }
        },
        responses: { 201: { description: 'Child linked successfully' }, 404: { description: 'Student code not found' } }
      }
    },
    '/parents/books': {
      post: {
        summary: 'Ingest PDF/Custom textbook into books & book_pages (Multipart PDF file upload)',
        tags: ['Parent Module'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' },
                  title: { type: 'string', example: 'Chemistry Guide' },
                  subject: { type: 'string', example: 'Chemistry' },
                  author: { type: 'string', example: 'Dr. Smith' },
                  grade: { type: 'integer', example: 10 }
                },
                required: ['title', 'subject']
              }
            }
          }
        },
        responses: { 201: { description: 'Book & pages ingested into MySQL database' } }
      }
    },
    '/diaries/upload': {
      post: {
        summary: 'Create pending diary entry for linked child',
        tags: ['Parent Module'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  student_id: { type: 'integer', example: 4 },
                  title: { type: 'string', example: 'Math Midterm Chapter 3' },
                  test_date: { type: 'string', example: '2026-10-01' },
                  book_id: { type: 'integer', example: 1 },
                  syllabus_start_page: { type: 'integer', example: 1 },
                  syllabus_end_page: { type: 'integer', example: 5 }
                },
                required: ['student_id', 'title', 'test_date', 'book_id', 'syllabus_start_page', 'syllabus_end_page']
              }
            }
          }
        },
        responses: { 201: { description: 'Pending diary entry created' }, 403: { description: 'Unlinked child (Zero-IDOR defense)' } }
      }
    },
    '/diaries/{id}/confirm': {
      put: {
        summary: 'Confirm diary entry & trigger non-blocking async AI quiz generation',
        tags: ['Parent Module'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Diary confirmed and async AI quiz process dispatched' } }
      }
    },
    '/reports': {
      get: {
        summary: 'Get progress report and performance aggregates for child',
        tags: ['Parent Module'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'student_id', in: 'query', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Child quiz scores, averages, and analytics' }, 403: { description: 'Unlinked child' } }
      }
    },
    '/notifications': {
      get: {
        summary: 'Get notifications for authenticated parent',
        tags: ['Parent Module'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of user notifications' } }
      }
    },
    '/admin/dashboard/stats': {
      get: {
        summary: 'Get platform analytics KPIs',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Total users, active sessions, pending flags, 24h AI tokens' },
          401: { description: 'Unauthorized / Missing Bearer token' }
        }
      }
    },
    '/admin/users': {
      get: {
        summary: 'List paginated users with search & role filter',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Users list' } }
      },
      post: {
        summary: 'Provision new user account',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  full_name: { type: 'string', example: 'Support Agent' },
                  email: { type: 'string', example: 'support2@aituition.app' },
                  password: { type: 'string', example: 'Admin123!' },
                  role: { type: 'string', example: 'Super_Admin' }
                },
                required: ['full_name', 'email', 'password', 'role']
              }
            }
          }
        },
        responses: { 201: { description: 'User created successfully' } }
      }
    },
    '/admin/users/{id}': {
      put: {
        summary: 'Update user profile details',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  full_name: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'User profile updated' } }
      }
    },
    '/admin/users/{id}/status': {
      patch: {
        summary: 'Mutate account status (active, suspended, banned)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['active', 'suspended', 'banned'] }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Account status updated' } }
      }
    },
    '/admin/users/{id}/sessions': {
      get: {
        summary: 'List user active login sessions',
        tags: ['Sessions'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Session list' } }
      },
      delete: {
        summary: 'Revoke all sessions for target user',
        tags: ['Sessions'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Sessions revoked' } }
      }
    },
    '/admin/ai/prompts': {
      get: {
        summary: 'Get active system prompts and guardrails',
        tags: ['AI Prompt & Guardrails'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'System prompts' } }
      },
      put: {
        summary: 'Update system prompt and guardrails',
        tags: ['AI Prompt & Guardrails'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  system_prompt: { type: 'string' },
                  learning_guardrails: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Prompt updated with version increment' } }
      }
    },
    '/admin/ai/usage': {
      get: {
        summary: 'Get aggregated AI token consumption stats',
        tags: ['AI Prompt & Guardrails'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Tokens and query costs' } }
      }
    },
    '/admin/moderation/flagged': {
      get: {
        summary: 'Review AI generations flagged by safety filters',
        tags: ['Moderation'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'status', in: 'query', schema: { type: 'string', default: 'pending' } }],
        responses: { 200: { description: 'Flagged moderation items' } }
      }
    },
    '/admin/audit-logs': {
      get: {
        summary: 'Retrieve immutable compliance audit logs',
        tags: ['Audit Logs'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Audit log entries' } }
      }
    },
    '/admin/reports/export': {
      get: {
        summary: 'Export analytics dataset to CSV file',
        tags: ['Reports'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'CSV file download' } }
      }
    },
    '/api/v1/teachers/dashboard': {
      get: {
        summary: 'Get teacher dashboard summary statistics',
        tags: ['Teacher Module'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Total classes, total students, pending ungraded quizzes' } }
      }
    },
    '/api/v1/teachers/classes': {
      get: {
        summary: 'Get assigned classes list for teacher',
        tags: ['Teacher Module'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of assigned classes' } }
      }
    },
    '/api/v1/teachers/students': {
      get: {
        summary: 'Get students enrolled in teacher classes with optional grade filter',
        tags: ['Teacher Module'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'grade', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 12 } }],
        responses: { 200: { description: 'List of enrolled students' } }
      }
    },
    '/api/v1/teachers/homework-status': {
      get: {
        summary: 'Get aggregated homework completion status',
        tags: ['Teacher Module'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Completed vs pending tasks count' } }
      }
    },
    '/api/v1/teachers/assign-quiz': {
      post: {
        summary: 'Assign a new quiz to an assigned class',
        tags: ['Teacher Module'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  class_id: { type: 'integer', example: 1 },
                  quiz_title: { type: 'string', example: 'Polynomial Division Quiz' }
                },
                required: ['class_id', 'quiz_title']
              }
            }
          }
        },
        responses: { 201: { description: 'Quiz created successfully' }, 403: { description: 'Unowned class' } }
      }
    },
    '/api/v1/tasks/{id}/grade': {
      put: {
        summary: 'Grade or update a student task',
        tags: ['Teacher Module'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  new_grade: { type: 'number', format: 'float', example: 92.5 },
                  reason: { type: 'string', example: 'Excellent performance on math proof' }
                },
                required: ['new_grade', 'reason']
              }
            }
          }
        },
        responses: { 200: { description: 'Grade updated' }, 403: { description: 'Task does not belong to teacher class' } }
      }
    },
    '/students/dashboard': {
      get: {
        summary: 'Get student dashboard stats (today tasks, streak, progress)',
        tags: ['Student Module'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Tasks, streak, and progress metrics' } }
      }
    },
    '/homework': {
      get: {
        summary: 'List all homework assignments for student',
        tags: ['Student Module'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of homework assignments' } }
      }
    },
    '/homework/{id}/tasks': {
      get: {
        summary: 'Get tasks for specific homework assignment',
        tags: ['Student Module'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'List of tasks' }, 403: { description: 'Not enrolled' } }
      }
    },
    '/tasks/current': {
      get: {
        summary: 'Get current active task for student',
        tags: ['Student Module'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Current active task' } }
      }
    },
    '/tasks/{id}/attempt': {
      post: {
        summary: 'Submit answer for task verification',
        tags: ['Student Module'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { answer: { type: 'string', example: 'Step 1: x = (-b +/- sqrt(b^2-4ac))/2a' } },
                required: ['answer']
              }
            }
          }
        },
        responses: { 200: { description: 'Task attempt submitted' }, 403: { description: 'Task not assigned to student' } }
      }
    },
    '/chat/sessions': {
      post: {
        summary: 'Start AI tutor chat session',
        tags: ['Student Module'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { topic: { type: 'string', example: 'Algebra Homework Assistance' } }
              }
            }
          }
        },
        responses: { 201: { description: 'Chat session created' } }
      }
    },
    '/chat/sessions/{id}/messages': {
      post: {
        summary: 'Send message to AI tutor in session',
        tags: ['Student Module'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { message: { type: 'string', example: 'How do I take the derivative of x^2?' } },
                required: ['message']
              }
            }
          }
        },
        responses: { 200: { description: 'AI tutor response generated' } }
      }
    },
    '/quizzes': {
      get: {
        summary: 'List available quizzes for student',
        tags: ['Student Module'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of available quizzes' } }
      }
    },
    '/quizzes/{id}/submit': {
      post: {
        summary: 'Submit quiz answers for evaluation',
        tags: ['Student Module'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { answers: { type: 'array', items: { type: 'object' } } },
                required: ['answers']
              }
            }
          }
        },
        responses: { 200: { description: 'Quiz submitted' } }
      }
    }
  }
};

module.exports = { swaggerUi, swaggerSpec };
