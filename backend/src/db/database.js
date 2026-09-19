/**
 * PostgreSQL via node-postgres (pg).
 * Use a free Neon DB: https://neon.tech  (or any Postgres URL)
 * Set DATABASE_URL in backend/.env
 */
const { Pool } = require('pg');

let pool = null;

/** Convert `?` placeholders to Postgres `$1, $2, ...` */
function toPg(sql, params = []) {
  let i = 0;
  const text = sql.replace(/\?/g, () => `$${++i}`);
  return { text, values: params };
}

async function initDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is missing. Create a free Neon Postgres DB and add DATABASE_URL to backend/.env — see README.txt'
    );
  }

  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost')
      ? false
      : { rejectUnauthorized: false },
  });

  // Verify connection
  await pool.query('SELECT 1');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      is_public BOOLEAN DEFAULT FALSE,
      share_token TEXT UNIQUE,
      owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      pixabay_id INTEGER,
      url TEXT NOT NULL,
      preview_url TEXT,
      title TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      photographer TEXT DEFAULT '',
      page_url TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS collaborators (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'editor',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(collection_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(from_user_id, to_user_id),
      CHECK (from_user_id <> to_user_id),
      CHECK (status IN ('pending', 'accepted', 'rejected'))
    );
  `);

  console.log('Connected to PostgreSQL');
  return pool;
}

async function queryAll(sql, params = []) {
  const { text, values } = toPg(sql, params);
  const result = await pool.query(text, values);
  return result.rows;
}

async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  const { text, values } = toPg(sql, params);
  await pool.query(text, values);
}

module.exports = {
  initDatabase,
  queryAll,
  queryOne,
  run,
};
