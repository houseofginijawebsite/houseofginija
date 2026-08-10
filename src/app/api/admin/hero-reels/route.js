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

export async function GET() {
  try {
    const res = await pool.query('SELECT * FROM hero_reels ORDER BY sort_order ASC, id ASC;');
    return NextResponse.json({ reels: res.rows });
  } catch (error) {
    console.error('Fetch hero reels error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let video_url = '';
    let title = 'Hero Reel';
    let sort_order = 0;

    // Get highest sort_order
    const maxRes = await pool.query('SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM hero_reels;');
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
          // Upload video to Cloudinary
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                resource_type: 'video',
                folder: 'houseofginija_hero_reels',
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            uploadStream.write(buffer);
            uploadStream.end();
          });
          video_url = uploadResult.secure_url;
        } else {
          // Fallback if Cloudinary config is missing
          const mimeType = file.type || 'video/mp4';
          video_url = `data:${mimeType};base64,${buffer.toString('base64')}`;
        }
      } else {
        video_url = formData.get('video_url') || '';
      }
    } else {
      const body = await request.json();
      video_url = body.video_url || '';
      if (body.title) title = body.title;
      if (body.sort_order !== undefined) sort_order = body.sort_order;
    }

    if (!video_url) {
      return NextResponse.json({ error: 'Video URL or file is required' }, { status: 400 });
    }

    const insertRes = await pool.query(
      'INSERT INTO hero_reels (video_url, title, sort_order) VALUES ($1, $2, $3) RETURNING *;',
      [video_url, title, sort_order]
    );

    return NextResponse.json({ success: true, reel: insertRes.rows[0] });
  } catch (error) {
    console.error('Create hero reel error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { reels } = await request.json();
    if (!Array.isArray(reels)) {
      return NextResponse.json({ error: 'Invalid reels array' }, { status: 400 });
    }

    for (let i = 0; i < reels.length; i++) {
      const reel = reels[i];
      await pool.query(
        'UPDATE hero_reels SET sort_order = $1, title = COALESCE($2, title) WHERE id = $3;',
        [i + 1, reel.title, reel.id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update hero reels order error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Reel ID is required' }, { status: 400 });
    }

    await pool.query('DELETE FROM hero_reels WHERE id = $1;', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete hero reel error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
