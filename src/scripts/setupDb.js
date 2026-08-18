const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  try {
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT, 10) || 3306;
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';

    console.log(`Connecting to MySQL server at ${host}:${port} as user '${user}'...`);

    // Connect to MySQL server without selecting a specific database first
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });

    console.log('Connected successfully!');

    // Read and run schema.sql
    console.log('Creating database and schema...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await connection.query(schemaSql);
    console.log('✔ Schema initialized.');

    // Read and run seed.sql
    console.log('Seeding initial data...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await connection.query(seedSql);
    console.log('✔ Seed data populated.');

    await connection.end();
    console.log('\n========================================');
    console.log('🎉 Database setup completed successfully!');
    console.log('========================================\n');
  } catch (err) {
    console.error('\n❌ Database setup failed:');
    console.error(err.message);
    process.exit(1);
  }
}

setupDatabase();
