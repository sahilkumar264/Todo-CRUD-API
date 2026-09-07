const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL
    )
  `);

  const result = await pool.query("SELECT COUNT(*) FROM tasks");

  if (Number(result.rows[0].count) === 0) {
    await pool.query(
      "INSERT INTO tasks (title, done) VALUES ($1, $2), ($3, $4), ($5, $6)",
      [
        "Learn Express", false,
        "Build CRUD API", false,
        "Document API with Swagger", false
      ]
    );
  }
}

module.exports = { initializeDatabase, pool };
