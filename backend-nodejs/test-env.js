const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('All env vars related to DB:', Object.keys(process.env).filter(key => key.includes('DATABASE')));
console.log('Working directory:', process.cwd());
console.log('__dirname:', __dirname);
