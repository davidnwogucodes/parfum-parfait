import { NextResponse } from 'next/server';

const JSONBIN_API_KEY = '$2a$10$c0bLQOqmsEryYQo08I55qOkwPLpAqQguVwG..Q95rNnYWPcLQukAK';
const JSONBIN_BIN_ID = '69b7cb91b7ec241ddc71d73e';

let lastRecordCache = null;
let lastRecordCacheAt = 0;

async function fetchJsonbinLatest({ timeoutMs = 7000, retries = 2 } = {}) {
  const url = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { 'X-Master-Key': JSONBIN_API_KEY },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`JSONBin responded with ${res.status}`);
      const data = await res.json();
      const record = data?.record ?? {};
      lastRecordCache = record;
      lastRecordCacheAt = Date.now();
      return { record, stale: false };
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    } finally {
      clearTimeout(t);
    }
  }
}

export async function GET() {
  try {
    const { record } = await fetchJsonbinLatest();
    const products = Array.isArray(record.products) ? record.products : [];
    const manual = products.filter((p) => p?.bestSeller === true);
    return NextResponse.json(
      { products: manual },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err) {
    console.error('Failed to compute best sellers:', err);
    if (lastRecordCache) {
      const products = Array.isArray(lastRecordCache.products) ? lastRecordCache.products : [];
      const manual = products.filter((p) => p?.bestSeller === true);
      return NextResponse.json(
        { products: manual, stale: true, staleAgeMs: Date.now() - lastRecordCacheAt },
        { headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Data-Stale': '1' } }
      );
    }
    // Don't break the homepage if JSONBin is temporarily unreachable.
    return NextResponse.json(
      { products: [], stale: true },
      { headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Data-Stale': '1' } }
    );
  }
}

