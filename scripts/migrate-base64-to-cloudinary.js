const { Pool } = require('pg');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function uploadToCloudinary(base64DataUrl, publicId) {
  return new Promise((resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const crypto = require('crypto');
    const sigStr = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash('sha1').update(sigStr).digest('hex');

    const body = JSON.stringify({
      file: base64DataUrl,
      public_id: publicId,
      api_key: API_KEY,
      timestamp,
      signature,
    });

    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD_NAME}/image/upload`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.secure_url) resolve(parsed.secure_url);
          else reject(new Error(JSON.stringify(parsed)));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  const res = await pool.query('SELECT id, name, images FROM products ORDER BY id');
  let fixed = 0, skipped = 0, errors = 0;

  for (const row of res.rows) {
    const imgs = row.images || [];
    if (!imgs.some(img => img && img.startsWith('data:'))) { skipped++; continue; }

    const newImgs = [];
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      if (!img || !img.startsWith('data:')) { newImgs.push(img); continue; }
      const publicId = `products/${String(row.id)}_img${i}_${Date.now()}`;
      try {
        process.stdout.write(`  Uploading ${row.name.substring(0,30)}... img ${i+1}/${imgs.length} `);
        const url = await uploadToCloudinary(img, publicId);
        newImgs.push(url);
        process.stdout.write('✓\n');
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        console.error(`\n  ERROR uploading ${publicId}: ${e.message}`);
        newImgs.push(img); // keep original on error
        errors++;
      }
    }

    await pool.query('UPDATE products SET images = $1 WHERE id = $2', [JSON.stringify(newImgs), row.id]);
    fixed++;
    console.log(`✅ Updated product ${row.id} (${row.name.substring(0,40)})`);
  }

  console.log(`\n=== DONE ===`);
  console.log(`Products fixed: ${fixed}`);
  console.log(`Products skipped (already URLs): ${skipped}`);
  console.log(`Upload errors: ${errors}`);
  await pool.end();
}

run().catch(e => { console.error(e); pool.end(); });
