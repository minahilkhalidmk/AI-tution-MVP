const mysql = require('mysql2/promise');

async function testPasswords() {
  const passwordsToTest = ['', 'root', 'mochi123@!', 'admin', '1234', '123456', 'password'];
  console.log('Testing connection to local MySQL server at localhost:3306...\n');

  for (const pass of passwordsToTest) {
    try {
      const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: pass
      });
      console.log(`=======================================================`);
      console.log(`✅ SUCCESS! Connected to MySQL with root password: "${pass}"`);
      console.log(`=======================================================`);
      await conn.end();
      return pass;
    } catch (err) {
      console.log(`❌ Tried password "${pass}": ${err.message}`);
    }
  }
  console.log('\nNone of the common default passwords matched your local MySQL root user.');
}

testPasswords();
