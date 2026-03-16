import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { isAdminAuthenticated } from '@/lib/adminAuth';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

export async function POST(request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return NextResponse.json(
        { error: 'Cloudinary is not configured on the server.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const folder = typeof body.folder === 'string' ? body.folder : 'parfum-parfait';

    const timestamp = Math.floor(Date.now() / 1000);

    // Cloudinary signature: SHA1 of sorted params joined with '&' + API_SECRET
    // Only include params you actually send to Cloudinary.
    const toSign = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    return NextResponse.json({
      cloudName: CLOUD_NAME,
      apiKey: API_KEY,
      timestamp,
      folder,
      signature,
    });
  } catch (err) {
    console.error('Cloudinary signature failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

