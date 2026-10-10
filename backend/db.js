const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS pricing (
        id SERIAL PRIMARY KEY,
        material TEXT UNIQUE NOT NULL,
        price_per_kg NUMERIC NOT NULL,
        price_per_unit NUMERIC NOT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        customer_name TEXT,
        email TEXT,
        phone TEXT,
        category TEXT,
        description TEXT,
        weight NUMERIC,
        units INTEGER,
        estimated_cost NUMERIC,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT,
        message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const countRes = await client.query('SELECT COUNT(*) FROM pricing');
    if (parseInt(countRes.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO pricing (material, price_per_kg, price_per_unit) VALUES
          ('Mild Steel', 85, 150),
          ('Stainless Steel', 220, 350),
          ('Aluminum', 180, 280),
          ('Wrought Iron', 120, 200)
      `);
    }

    console.log('✅ Database initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };