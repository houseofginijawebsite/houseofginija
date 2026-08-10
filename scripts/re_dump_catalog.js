const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const { PRODUCT_SELECT_FIELDS, PRODUCT_COLLECTION_JOINS, mapProductData } = require('../src/lib/catalogMetadata');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const result = await pool.query(`
    SELECT ${PRODUCT_SELECT_FIELDS}
    FROM products p
    ${PRODUCT_COLLECTION_JOINS}
    ORDER BY p.id ASC
  `);

  const list = result.rows.map(r => mapProductData(r, { isAdmin: true })).filter(Boolean);
  console.log('Total products count in DB:', list.length);

  fs.writeFileSync('scripts/products_raw.json', JSON.stringify(list, null, 2));
  console.log('Saved raw products to scripts/products_raw.json');

  await pool.end();
}

run().catch(e => { console.error(e); pool.end(); });
