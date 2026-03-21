import crypto from 'crypto';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = 'parfum-parfait';

/**
 * Upload an image buffer to Cloudinary using a signed upload.
 * @param {Buffer} imageBuffer
 * @param {string} filename - used as the public_id
 * @returns {Promise<{ publicId: string, url: string }>}
 */
export async function uploadToCloudinary(imageBuffer, filename) {
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${FOLDER}/${filename}`;

  const toSign = `folder=${FOLDER}&public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');

  // Build multipart form
  const form = new FormData();
  form.append('file', new Blob([imageBuffer]), filename);
  form.append('api_key', API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('folder', FOLDER);
  form.append('public_id', publicId);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }

  const data = await res.json();
  return { publicId: data.public_id, url: data.secure_url };
}
