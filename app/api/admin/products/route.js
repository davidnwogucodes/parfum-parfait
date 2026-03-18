import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/adminAuth';

const JSONBIN_API_KEY = '$2a$10$c0bLQOqmsEryYQo08I55qOkwPLpAqQguVwG..Q95rNnYWPcLQukAK';
const JSONBIN_BIN_ID = '69b7cb91b7ec241ddc71d73e';

async function saveRecord(record) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_API_KEY,
    },
    body: JSON.stringify(record),
  });

  if (!res.ok) {
    throw new Error(`JSONBin (write) responded with ${res.status}`);
  }
}

async function getCurrentRecord() {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
    headers: { 'X-Master-Key': JSONBIN_API_KEY },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`JSONBin (read) responded with ${res.status}`);
  }

  const json = await res.json();
  return json?.record ?? {};
}

export async function GET(request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const record = await getCurrentRecord();
    const products = Array.isArray(record.products) ? record.products : [];
    return NextResponse.json({ products });
  } catch (err) {
    console.error('Admin GET products failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const record = await getCurrentRecord();
    const products = Array.isArray(record.products) ? record.products : [];

    const now = new Date().toISOString();

    const product = {
      id: body.id || `prod_${Date.now()}`,
      name: body.name,
      brand: body.brand || '',
      size: body.size || '',
      category: body.category || 'retail',
      price: Number(body.price) || 0,
      wholesalePrice: body.wholesalePrice ? Number(body.wholesalePrice) : null,
      stock: body.stock != null ? Number(body.stock) : 0,
      image: body.image || '',
      discountRules: Array.isArray(body.discountRules) ? body.discountRules : [],
      accords: Array.isArray(body.accords) ? body.accords : [],
      description: body.description || '',
      notes: body.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    const updatedRecord = {
      ...record,
      products: [...products, product],
    };

    await saveRecord(updatedRecord);

    return NextResponse.json({ success: true, product });
  } catch (err) {
    console.error('Admin POST product failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = body?.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing product id' }, { status: 400 });
    }

    const record = await getCurrentRecord();
    const products = Array.isArray(record.products) ? record.products : [];

    const idStr = String(id);
    const idx = products.findIndex((p) => String(p?.id) === idStr);
    if (idx === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const existing = products[idx] || {};

    const updated = {
      ...existing,
      ...body,
      // normalize
      price: Number(body.price ?? existing.price) || 0,
      wholesalePrice:
        body.wholesalePrice === null || body.wholesalePrice === ''
          ? null
          : Number(body.wholesalePrice ?? existing.wholesalePrice),
      stock:
        body.stock == null || body.stock === ''
          ? Number(existing.stock) || 0
          : Number(body.stock),
      discountRules: Array.isArray(body.discountRules) ? body.discountRules : existing.discountRules || [],
      accords: Array.isArray(body.accords) ? body.accords : existing.accords || [],
      updatedAt: now,
    };

    const nextProducts = products.slice();
    nextProducts[idx] = updated;

    await saveRecord({ ...record, products: nextProducts });

    return NextResponse.json({ success: true, product: updated });
  } catch (err) {
    console.error('Admin PUT product failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing product id' }, { status: 400 });
    }

    const record = await getCurrentRecord();
    const products = Array.isArray(record.products) ? record.products : [];

    const idStr = String(id);
    const nextProducts = products.filter((p) => String(p?.id) !== idStr);
    if (nextProducts.length === products.length) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await saveRecord({ ...record, products: nextProducts });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin DELETE product failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

