const { Pool, Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

const targetDb = process.env.DB_NAME || 'jdshop';

// Helper function to ensure target database exists
const ensureDatabaseExists = async () => {
  const adminClient = new Client({
    ...dbConfig,
    database: 'postgres',
  });

  try {
    await adminClient.connect();
    const res = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDb]
    );
    if (res.rowCount === 0) {
      console.log(`Database "${targetDb}" does not exist. Creating...`);
      await adminClient.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`Database "${targetDb}" created successfully!`);
    }
  } catch (err) {
    console.error('Error verifying/creating database:', err.message);
  } finally {
    await adminClient.end();
  }
};

const pool = new Pool({
  ...dbConfig,
  database: targetDb,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

const query = (text, params) => pool.query(text, params);

module.exports = {
  pool,
  query,
  ensureDatabaseExists,
};
