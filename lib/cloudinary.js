const CLOUD_NAME = 'dh08iayan';
const BASE_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

/**
 * Build a Cloudinary URL with automatic optimisation.
 * @param {string} publicId  - The Cloudinary public_id stored in the product
 * @param {number} width     - Desired width in pixels (default 400)
 * @returns {string} Full CDN URL
 */
export function getCloudinaryUrl(publicId, width = 400) {
  if (!publicId) return '/placeholder.svg';
  // Allow already-built URLs or local public/ paths.
  if (typeof publicId === 'string' && (publicId.startsWith('http://') || publicId.startsWith('https://') || publicId.startsWith('/'))) {
    return publicId;
  }
  return `${BASE_URL}/w_${width},q_auto,f_auto/${publicId}`;
}
