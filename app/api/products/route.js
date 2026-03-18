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
    const products = record?.products ?? record ?? [];

    return NextResponse.json(
      { products },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err) {
    console.error('Failed to fetch products:', err);
    if (lastRecordCache) {
      const products = lastRecordCache?.products ?? lastRecordCache ?? [];
      return NextResponse.json(
        { products, stale: true, staleAgeMs: Date.now() - lastRecordCacheAt },
        { headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Data-Stale': '1' } }
      );
    }
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 502 });
  }
}

// Order submission — store orders alongside products in JSONBin
export async function POST(request) {
  try {
    const orderData = await request.json();

    // 1) Get the latest record
    const { record: currentRecord } = await fetchJsonbinLatest({ timeoutMs: 9000, retries: 2 });

    // 2) Append the new order to an "orders" array on the record
    const existingOrders = Array.isArray(currentRecord.orders)
      ? currentRecord.orders
      : [];

    const updatedRecord = {
      ...currentRecord,
      orders: [...existingOrders, orderData],
    };

    // 3) Write the updated record back to the bin
    const updateRes = await fetch(
      `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY,
        },
        body: JSON.stringify(updatedRecord),
      }
    );

    if (!updateRes.ok) {
      throw new Error(`JSONBin (write) responded with ${updateRes.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Order submission failed:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
