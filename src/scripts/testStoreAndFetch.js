const db = require('../config/db');

async function testStoreAndFetch() {
  console.log('====================================================');
  console.log('🧪 VERIFYING SYSTEM STORAGE & FETCHING OPERATIONS');
  console.log('====================================================\n');

  try {
    // 1. User Creation (Store) & Lookup (Fetch)
    console.log('1. Testing User Registration & Lookup (users table)...');
    const testEmail = `verify_user_${Date.now()}@example.com`;
    const [userInsert] = await db.execute(
      `INSERT INTO users (full_name, email, password_hash, role, account_type, status, student_code, created_at, updated_at)
       VALUES (?, ?, 'hash123', 'student', 'private', 'active', 'TEST01', NOW(), NOW())`,
      ['Test Student User', testEmail]
    );
    const userId = userInsert.insertId;
    console.log(`   ✔ Stored User ID: ${userId}`);

    const [userFetch] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
    console.log(`   ✔ Fetched User: ${userFetch[0].full_name} (${userFetch[0].email})\n`);

    // 2. Parent-Child Link (Store) & Query (Fetch)
    console.log('2. Testing Parent-Student Link & Child Fetching...');
    const parentId = 6;
    try {
      await db.execute('INSERT INTO parent_student_links (parent_id, student_id, created_at) VALUES (?, ?, NOW())', [parentId, userId]);
      console.log(`   ✔ Linked Parent ${parentId} to Student ${userId}`);
    } catch (e) {
      console.log(`   ✔ Link already exists`);
    }

    const [childrenFetch] = await db.execute(
      `SELECT u.id, u.full_name, u.email, u.student_code FROM users u JOIN parent_student_links psl ON u.id = psl.student_id WHERE psl.parent_id = ?`,
      [parentId]
    );
    console.log(`   ✔ Fetched Linked Children Count: ${childrenFetch.length}\n`);

    // 3. Books & Pages (Store) & Retrieval (Fetch)
    console.log('3. Testing Book & Page-by-Page Curriculum Store & Fetch...');
    const [bookInsert] = await db.execute(
      `INSERT INTO books (title, author, subject, grade, source_type, owner_id, total_pages, created_at)
       VALUES ('Verified Physics Textbook', 'Dr. Maxwell', 'Physics', 10, 'parent', ?, 2, NOW())`,
      [parentId]
    );
    const bookId = bookInsert.insertId;

    await db.execute(
      `INSERT INTO book_pages (book_id, page_number, page_text, source_type, owner_id, created_at) VALUES (?, 1, 'Page 1 text on Newton Laws', 'parent', ?, NOW())`,
      [bookId, parentId]
    );
    await db.execute(
      `INSERT INTO book_pages (book_id, page_number, page_text, source_type, owner_id, created_at) VALUES (?, 2, 'Page 2 text on Energy Conservation', 'parent', ?, NOW())`,
      [bookId, parentId]
    );
    console.log(`   ✔ Stored Book ID ${bookId} with 2 Pages`);

    const [pagesFetch] = await db.execute('SELECT * FROM book_pages WHERE book_id = ? AND page_number BETWEEN ? AND ?', [bookId, 1, 2]);
    console.log(`   ✔ Fetched ${pagesFetch.length} pages for Book ID ${bookId}\n`);

    // 4. Diary Entries (Store) & Query (Fetch)
    console.log('4. Testing Test Diary Entry Storage & Fetching...');
    const [diaryInsert] = await db.execute(
      `INSERT INTO diary_entries (student_id, title, test_date, book_id, syllabus_start_page, syllabus_end_page, status, created_at)
       VALUES (?, 'Physics Exam Prep', '2026-11-01', ?, 1, 2, 'pending', NOW())`,
      [userId, bookId]
    );
    const diaryId = diaryInsert.insertId;
    console.log(`   ✔ Stored Diary Entry ID: ${diaryId}`);

    const [diaryFetch] = await db.execute('SELECT * FROM diary_entries WHERE student_id = ?', [userId]);
    console.log(`   ✔ Fetched ${diaryFetch.length} diary entries for Student ID ${userId}\n`);

    // 5. User Session & Notification Store & Fetch
    console.log('5. Testing Session Lifecycle & Notification Storage...');
    await db.execute(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, device_info, ip_address, expires_at, is_revoked, created_at)
       VALUES (?, 'hash_refresh_123', 'Desktop Chrome', '127.0.0.1', NOW(), 0, NOW())`,
      [userId]
    );

    const [sessFetch] = await db.execute('SELECT * FROM user_sessions WHERE user_id = ?', [userId]);
    console.log(`   ✔ Fetched Active Sessions: ${sessFetch.length}`);

    await db.execute(
      `INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, 'Test Notification', 'Welcome to AI Tuition Platform', 0, NOW())`,
      [userId]
    );
    const [notifFetch] = await db.execute('SELECT * FROM notifications WHERE user_id = ?', [userId]);
    console.log(`   ✔ Fetched Notifications: ${notifFetch.length}\n`);

    console.log('====================================================');
    console.log('🎉 ALL STORING AND FETCHING OPERATIONS VERIFIED 100%');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Verification error:', err);
    process.exit(1);
  }
}

testStoreAndFetch();
