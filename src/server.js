require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 AI Tuition Admin API Backend running on port ${PORT}`);
  console.log(`🛡️  Security Pipeline Active: Rate Limiter -> Auth -> RBAC -> Validation -> Mysql2 Pool -> Audit Logger`);
  console.log(`=======================================================`);
});
