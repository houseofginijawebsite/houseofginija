const path = require('path');
const fs = require('fs');
const projectDir = 'c:/Users/varun/OneDrive/Documents/houseofginija';
const { Pool } = require(path.join(projectDir, 'node_modules/pg'));

const targetUrl = process.env.DATABASE_URL;

const srcDir = path.join(projectDir, 'images', 'hero videos');
const targetDir = path.join(projectDir, 'public', 'videos', 'hero_reels');

async function setupHeroReels() {
  // 1. Ensure target dir exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 2. Read source video files
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.mp4')).sort();
  console.log(`Found ${files.length} video files in ${srcDir}:`);

  const initialReels = [];

  files.forEach((f, idx) => {
    const newName = `reel_${idx + 1}.mp4`;
    const srcPath = path.join(srcDir, f);
    const destPath = path.join(targetDir, newName);
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${f} -> public/videos/hero_reels/${newName}`);
    initialReels.push({
      url: `/videos/hero_reels/${newName}`,
      title: `Hero Reel ${idx + 1}`,
      sort_order: idx + 1
    });
  });

  // 3. Setup database table in CockroachDB
  const pool = new Pool({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });

  try {
    console.log('\n=== CREATING hero_reels TABLE IN COCKROACHDB ===');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hero_reels (
        id INT8 DEFAULT unique_rowid() PRIMARY KEY,
        video_url TEXT NOT NULL,
        title VARCHAR(255),
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check existing count
    const countRes = await pool.query('SELECT COUNT(*) FROM hero_reels;');
    const currentCount = parseInt(countRes.rows[0].count, 10);
    console.log(`Current hero_reels count in DB: ${currentCount}`);

    if (currentCount === 0) {
      console.log('Seeding initial 8 hero reels into database...');
      for (const reel of initialReels) {
        await pool.query(
          'INSERT INTO hero_reels (video_url, title, sort_order) VALUES ($1, $2, $3);',
          [reel.url, reel.title, reel.sort_order]
        );
      }
      console.log('Successfully seeded 8 hero reels!');
    }

    const finalRes = await pool.query('SELECT * FROM hero_reels ORDER BY sort_order ASC;');
    console.log('\nCurrent hero_reels in DB:');
    console.log(finalRes.rows);

  } catch (err) {
    console.error('Database setup error:', err);
  } finally {
    await pool.end();
  }
}

setupHeroReels();
