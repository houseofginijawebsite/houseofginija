import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'cyygtyfb';
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

async function ensureFounderReelsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS founder_reels (
      id SERIAL PRIMARY KEY,
      video_url TEXT NOT NULL,
      title VARCHAR(255) DEFAULT 'Founder Reel',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const countRes = await pool.query('SELECT COUNT(*) as count FROM founder_reels;');
  const count = parseInt(countRes.rows[0].count, 10);

  if (count === 0) {
    await pool.query(`
      INSERT INTO founder_reels (video_url, title, sort_order) VALUES
      ('/videos/hero_reels/reel_1.mp4', 'Founder Reel 1', 1),
      ('/videos/hero_reels/reel_2.mp4', 'Founder Reel 2', 2),
      ('/videos/hero_reels/reel_3.mp4', 'Founder Reel 3', 3);
    `);
  }
}

export async function GET() {
  try {
    await ensureFounderReelsTable();
    const res = await pool.query('SELECT * FROM founder_reels ORDER BY sort_order ASC, id ASC LIMIT 3;');
    return NextResponse.json({ reels: res.rows });
  } catch (error) {
    console.error('Fetch founder reels error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureFounderReelsTable();

    // Check count constraint (strictly max 3 reels)
    const countRes = await pool.query('SELECT COUNT(*) as count FROM founder_reels;');
    const currentCount = parseInt(countRes.rows[0].count, 10);
    if (currentCount >= 3) {
      return NextResponse.json({ error: 'Maximum 3 reels allowed' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';
    let video_url = '';
    let title = 'Founder Reel';
    let sort_order = 0;

    const maxRes = await pool.query('SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM founder_reels;');
    sort_order = parseInt(maxRes.rows[0].max_sort, 10) + 1;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      const customTitle = formData.get('title');
      if (customTitle) title = customTitle;

      if (file && typeof file === 'object') {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (cloudName && apiKey && apiSecret) {
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                resource_type: 'video',
                folder: 'houseofginija_founder_reels',
              },
              (err, result) => {
                if (err) reject(err);
                else resolve(result);
              }
            );
            uploadStream.end(buffer);
          });
          video_url = uploadResult.secure_url;
        } else {
          return NextResponse.json({ error: 'Cloudinary configuration is missing.' }, { status: 500 });
        }
      }
    } else {
      const body = await request.json();
      video_url = body.video_url || '';
      if (body.title) title = body.title;
    }

    if (!video_url) {
      return NextResponse.json({ error: 'Video URL or file is required.' }, { status: 400 });
    }

    const insertRes = await pool.query(
      'INSERT INTO founder_reels (video_url, title, sort_order) VALUES ($1, $2, $3) RETURNING *;',
      [video_url, title, sort_order]
    );

    return NextResponse.json({ reel: insertRes.rows[0] });
  } catch (error) {
    console.error('Add founder reel error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await ensureFounderReelsTable();
    const body = await request.json();
    const { reels } = body;

    if (!Array.isArray(reels)) {
      return NextResponse.json({ error: 'Reels array required.' }, { status: 400 });
    }

    for (let i = 0; i < reels.length; i++) {
      const r = reels[i];
      await pool.query(
        'UPDATE founder_reels SET sort_order = $1, title = COALESCE($2, title) WHERE id = $3;',
        [i + 1, r.title, r.id]
      );
    }

    const updatedRes = await pool.query('SELECT * FROM founder_reels ORDER BY sort_order ASC, id ASC LIMIT 3;');
    return NextResponse.json({ reels: updatedRes.rows });
  } catch (error) {
    console.error('Update founder reels error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await ensureFounderReelsTable();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Reel ID required.' }, { status: 400 });
    }

    await pool.query('DELETE FROM founder_reels WHERE id = $1;', [id]);
    return NextResponse.json({ message: 'Founder reel deleted successfully.' });
  } catch (error) {
    console.error('Delete founder reel error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
