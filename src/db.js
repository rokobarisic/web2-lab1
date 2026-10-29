const { Pool } = require("pg");
const crypto = require("crypto");
const config = require("./config");

const pool = new Pool({
  connectionString: config.db.connectionString,
  ssl: config.db.ssl,
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS passes (
      id         UUID PRIMARY KEY,
      name       TEXT NOT NULL,
      document   TEXT NOT NULL,
      issued_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      status     TEXT NOT NULL DEFAULT 'ACTIVE'
                 CHECK (status IN ('ACTIVE', 'CANCELLED'))
    );
  `);
}

async function getStats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active
    FROM passes;
  `);
  return rows[0];
}

async function listPasses() {
  const { rows } = await pool.query(
    `SELECT id, name, document, issued_at, status
     FROM passes
     ORDER BY issued_at DESC;`,
  );
  return rows;
}

async function getPass(id) {
  const { rows } = await pool.query(
    `SELECT id, name, document, issued_at, status
     FROM passes
     WHERE id = $1;`,
    [id],
  );
  return rows[0];
}

async function createPass(name, document) {
  const id = crypto.randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO passes (id, name, document)
     VALUES ($1, $2, $3)
     RETURNING id, name, document, issued_at, status;`,
    [id, name, document],
  );
  return rows[0];
}

async function cancelPass(id) {
  const { rows } = await pool.query(
    `UPDATE passes SET status = 'CANCELLED'
     WHERE id = $1
     RETURNING id, name, document, issued_at, status;`,
    [id],
  );
  return rows[0];
}

async function deletePass(id) {
  const result = await pool.query(`DELETE FROM passes WHERE id = $1;`, [id]);
  return result.rowCount > 0;
}

module.exports = {
  pool,
  initSchema,
  getStats,
  listPasses,
  getPass,
  createPass,
  cancelPass,
  deletePass,
};
