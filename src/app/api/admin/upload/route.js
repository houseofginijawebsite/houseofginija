import { NextResponse } from 'next/server';
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

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read file as Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check Cloudinary configs
    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('WARNING: Cloudinary credentials missing in env. Falling back to Base64 data URI upload.');
      
      const mimeType = file.type || 'image/png';
      const base64Str = `data:${mimeType};base64,${buffer.toString('base64')}`;
      
      return NextResponse.json({
        success: true,
        url: base64Str,
      });
    }

    // Upload buffer stream to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: 'houseofginija_products',
          resource_type: 'image',
          timeout: 60000,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      
      uploadStream.write(buffer);
      uploadStream.end();
    });

    // Return the secure URL from Cloudinary
    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : typeof error === 'object' ? JSON.stringify(error) : String(error);
    return NextResponse.json({ error: `Backend Error: ${errorMessage}` }, { status: 500 });
  }
}
