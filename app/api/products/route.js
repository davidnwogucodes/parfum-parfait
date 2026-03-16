import { NextResponse } from 'next/server';

const JSONBIN_API_KEY = '$2a$10$c0bLQOqmsEryYQo08I55qOkwPLpAqQguVwG..Q95rNnYWPcLQukAK';
const JSONBIN_BIN_ID = '69b7cb91b7ec241ddc71d73e';

export async function GET() {
  try {
    const res = await fetch(
      `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`,
      {
        headers: { 'X-Master-Key': JSONBIN_API_KEY },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      throw new Error(`JSONBin responded with ${res.status}`);
    }

    const data = await res.json();
    const products = data?.record?.products ?? data?.record ?? [];

    return NextResponse.json({ products });
  } catch (err) {
    console.error('Failed to fetch products:', err);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 502 });
  }
}
