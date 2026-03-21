import { NextResponse } from 'next/server';
import { getBinData, updateBinData } from '@/lib/jsonbin';
import { getProfitLoss, getInventoryStatus, expensesByCategory, expensesByVendor } from '@/lib/business';
import { askAI } from '@/lib/openrouter';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

/** Max conversation turns to keep in memory per chat (each turn = 1 user + 1 assistant message). */
const MAX_TURNS = 10;

// ─── Telegram helpers ────────────────────────────────────────────────────────

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

/** Download a photo from Telegram and return it as a Buffer. */
async function downloadTelegramPhoto(fileId) {
  const fileRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const fileData = await fileRes.json();
  const filePath = fileData.result?.file_path;
  if (!filePath) throw new Error('Could not get file path from Telegram');

  const imgRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`);
  if (!imgRes.ok) throw new Error('Could not download image from Telegram');

  const arrayBuffer = await imgRes.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), ext: filePath.split('.').pop() ?? 'jpg' };
}

// ─── Business context builder ────────────────────────────────────────────────

function buildContext(data) {
  const products = Array.isArray(data.products) ? data.products : [];
  const expenses = Array.isArray(data.expenses) ? data.expenses : [];
  const orders = Array.isArray(data.orders) ? data.orders : [];

  const today = getProfitLoss(data, 'today');
  const month = getProfitLoss(data, 'month');
  const allTime = getProfitLoss(data, 'all');
  const inventory = getInventoryStatus(products);

  return {
    // Full P&L snapshots
    today,
    thisMonth: month,
    allTime,

    // Expense breakdowns for analysis
    expensesByCategory: expensesByCategory(expenses),
    expensesByVendor: expensesByVendor(expenses),

    // Recent records for context
    recentExpenses: expenses.slice(-15).reverse().map((e) => ({
      date: e.date,
      amount: e.amount,
      description: e.description,
      category: e.category,
      vendor: e.vendor || null,
      paymentMethod: e.paymentMethod || null,
    })),

    recentOrders: orders.slice(-5).reverse().map((o) => ({
      date: o.timestamp,
      customer: o['customer name'],
      items: o.items,
      total: o.total,
    })),

    // Inventory
    inventory: {
      totalProducts: inventory.totalProducts,
      inStock: inventory.inStock,
      outOfStock: inventory.outOfStockItems,
      lowStock: inventory.lowStockItems,
      totalStockValue: inventory.totalStockValue,
      totalWholesaleValue: inventory.totalWholesaleValue,
    },

    // Full product list with IDs so the AI can resolve names to IDs for CRUD actions
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      size: p.size,
      price: p.price,
      wholesalePrice: p.wholesalePrice ?? null,
      stock: p.stock,
      bestSeller: p.bestSeller ?? false,
      accords: Array.isArray(p.accords) ? p.accords.map((a) => a.label) : [],
    })),
  };
}

// ─── Conversation history helpers ────────────────────────────────────────────

function getHistory(data, chatId) {
  const conversations = data.botConversations ?? {};
  return conversations[String(chatId)] ?? [];
}

/** Returns a new data object with the updated conversation history for this chat. */
function saveToHistory(data, chatId, userMessage, rawAiReply) {
  const conversations = data.botConversations ?? {};
  const chatIdStr = String(chatId);
  const history = [...(conversations[chatIdStr] ?? [])];

  history.push({ role: 'user', content: userMessage });
  // Store the clean reply (without action markers) so the AI doesn't re-trigger actions
  history.push({
    role: 'assistant',
    content: rawAiReply.replace(/<<[A-Z_]+:\{[\s\S]*?\}>>/g, '').trim(),
  });

  // Keep only the last MAX_TURNS * 2 messages
  const trimmed = history.slice(-(MAX_TURNS * 2));

  return { ...data, botConversations: { ...conversations, [chatIdStr]: trimmed } };
}

// ─── CRUD action executor ─────────────────────────────────────────────────────

/**
 * Apply a single action to the data object and return { updatedData, message }.
 * Pure function — no async, no JSONBin calls here.
 */
function applyAction(actionName, params, data) {
  const products = [...(data.products ?? [])];
  const findIdx = (id) => products.findIndex((p) => p.id === id);

  switch (actionName) {
    case 'ADD_EXPENSE': {
      const newExpense = {
        id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        amount: parseFloat(params.amount),
        description: params.description,
        category: params.category ?? 'other',
        vendor: params.vendor ?? '',
        paymentMethod: params.paymentMethod ?? '',
        createdAt: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
      };
      return {
        updatedData: { ...data, expenses: [...(data.expenses ?? []), newExpense] },
        message: `Expense logged — ${newExpense.amount.toLocaleString()} (${newExpense.category}${newExpense.vendor ? ` · ${newExpense.vendor}` : ''})`,
      };
    }

    case 'UPDATE_PRICE': {
      const idx = findIdx(params.productId);
      if (idx === -1) return { updatedData: data, message: `Product not found: ${params.productId}`, error: true };
      products[idx] = { ...products[idx], price: parseFloat(params.newPrice), updatedAt: new Date().toISOString() };
      return { updatedData: { ...data, products }, message: `Price updated to $${params.newPrice}` };
    }

    case 'UPDATE_WHOLESALE_PRICE': {
      const idx = findIdx(params.productId);
      if (idx === -1) return { updatedData: data, message: `Product not found: ${params.productId}`, error: true };
      products[idx] = { ...products[idx], wholesalePrice: parseFloat(params.newWholesalePrice), updatedAt: new Date().toISOString() };
      return { updatedData: { ...data, products }, message: `Wholesale price updated to $${params.newWholesalePrice}` };
    }

    case 'UPDATE_STOCK': {
      const idx = findIdx(params.productId);
      if (idx === -1) return { updatedData: data, message: `Product not found: ${params.productId}`, error: true };
      products[idx] = { ...products[idx], stock: parseInt(params.quantity, 10), updatedAt: new Date().toISOString() };
      return { updatedData: { ...data, products }, message: `Stock updated to ${params.quantity} units` };
    }

    case 'TOGGLE_BEST_SELLER': {
      const idx = findIdx(params.productId);
      if (idx === -1) return { updatedData: data, message: `Product not found: ${params.productId}`, error: true };
      const val = params.value === true || params.value === 'true';
      products[idx] = { ...products[idx], bestSeller: val, updatedAt: new Date().toISOString() };
      return { updatedData: { ...data, products }, message: `Best seller ${val ? 'enabled ✨' : 'disabled'}` };
    }

    case 'ADD_ACCORD': {
      const idx = findIdx(params.productId);
      if (idx === -1) return { updatedData: data, message: `Product not found: ${params.productId}`, error: true };
      const accords = [...(products[idx].accords ?? [])];
      const existingIdx = accords.findIndex((a) => a.label === params.label);
      if (existingIdx >= 0) {
        accords[existingIdx] = { label: params.label, strength: params.strength ?? 3 };
      } else {
        accords.push({ label: params.label, strength: params.strength ?? 3 });
      }
      products[idx] = { ...products[idx], accords, updatedAt: new Date().toISOString() };
      return { updatedData: { ...data, products }, message: `Accord "${params.label}" added` };
    }

    case 'REMOVE_ACCORD': {
      const idx = findIdx(params.productId);
      if (idx === -1) return { updatedData: data, message: `Product not found: ${params.productId}`, error: true };
      const accords = (products[idx].accords ?? []).filter((a) => a.label !== params.label);
      products[idx] = { ...products[idx], accords, updatedAt: new Date().toISOString() };
      return { updatedData: { ...data, products }, message: `Accord "${params.label}" removed` };
    }

    case 'UPDATE_DESCRIPTION': {
      const idx = findIdx(params.productId);
      if (idx === -1) return { updatedData: data, message: `Product not found: ${params.productId}`, error: true };
      products[idx] = { ...products[idx], description: params.description, updatedAt: new Date().toISOString() };
      return { updatedData: { ...data, products }, message: 'Description updated' };
    }

    case 'UPDATE_NAME': {
      const idx = findIdx(params.productId);
      if (idx === -1) return { updatedData: data, message: `Product not found: ${params.productId}`, error: true };
      products[idx] = { ...products[idx], name: params.name, updatedAt: new Date().toISOString() };
      return { updatedData: { ...data, products }, message: `Product renamed to "${params.name}"` };
    }

    case 'UPDATE_BRAND': {
      const idx = findIdx(params.productId);
      if (idx === -1) return { updatedData: data, message: `Product not found: ${params.productId}`, error: true };
      products[idx] = { ...products[idx], brand: params.brand, updatedAt: new Date().toISOString() };
      return { updatedData: { ...data, products }, message: `Brand updated to "${params.brand}"` };
    }

    case 'UPDATE_SIZE': {
      const idx = findIdx(params.productId);
      if (idx === -1) return { updatedData: data, message: `Product not found: ${params.productId}`, error: true };
      products[idx] = { ...products[idx], size: params.size, updatedAt: new Date().toISOString() };
      return { updatedData: { ...data, products }, message: `Size updated to "${params.size}"` };
    }

    case 'CREATE_PRODUCT': {
      const newProduct = {
        id: `prod_${Date.now()}`,
        name: params.name,
        brand: params.brand ?? '',
        size: params.size ?? '',
        category: params.category ?? 'retail',
        price: parseFloat(params.price ?? 0),
        wholesalePrice: params.wholesalePrice ? parseFloat(params.wholesalePrice) : null,
        stock: parseInt(params.stock ?? 0, 10),
        image: params.image ?? '',
        accords: Array.isArray(params.accords)
          ? params.accords.map((a) =>
              typeof a === 'string' ? { label: a, strength: 3 } : a
            )
          : [],
        discountRules: [],
        description: params.description ?? '',
        notes: params.notes ?? '',
        bestSeller: params.bestSeller === true || params.bestSeller === 'true',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        updatedData: { ...data, products: [...products, newProduct] },
        message: `✨ New product created: "${newProduct.name}" (ID: ${newProduct.id})`,
      };
    }

    case 'DELETE_PRODUCT': {
      const idx = findIdx(params.productId);
      if (idx === -1) return { updatedData: data, message: `Product not found: ${params.productId}`, error: true };
      const deletedName = products[idx].name;
      products.splice(idx, 1);
      return { updatedData: { ...data, products }, message: `🗑️ "${deletedName}" deleted` };
    }

    case 'UPDATE_IMAGE': {
      const idx = findIdx(params.productId);
      if (idx === -1) return { updatedData: data, message: `Product not found: ${params.productId}`, error: true };
      products[idx] = { ...products[idx], image: params.publicId, updatedAt: new Date().toISOString() };
      return { updatedData: { ...data, products }, message: `Image updated for "${products[idx].name}"` };
    }

    default:
      return { updatedData: data, message: `Unknown action: ${actionName}`, error: true };
  }
}

/**
 * Parse all <<ACTION_NAME:{...}>> markers from the AI reply,
 * apply them sequentially to the data, and return results.
 */
function parseAndApplyActions(rawReply, data) {
  const ACTION_RE = /<<([A-Z_]+):(\{[\s\S]*?\})>>/g;
  const results = [];
  let currentData = data;
  let match;

  while ((match = ACTION_RE.exec(rawReply)) !== null) {
    const [, actionName, paramsJson] = match;
    try {
      const params = JSON.parse(paramsJson);
      const result = applyAction(actionName, params, currentData);
      currentData = result.updatedData;
      results.push({ actionName, message: result.message, error: result.error ?? false });
    } catch (err) {
      results.push({ actionName, message: `Failed to parse action params: ${err.message}`, error: true });
    }
  }

  return { results, updatedData: currentData };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const update = await request.json();
    const message = update.message ?? update.edited_message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;

    // ── /start command ────────────────────────────────────────────────────────
    if (message.text?.trim() === '/start') {
      await sendMessage(
        chatId,
        `👋 *Welcome to your Parfum Parfait Business Assistant!*\n\nI'm here to help you run the store. Just talk to me like you would a business partner:\n\n📦 _"Which products are running low?"_\n💰 _"How much did we make this month?"_\n📝 _"Add expense — bought 20 bottles of oud for $350"_\n✏️ _"Change the price of the Chanel one to $95"_\n⭐ _"Make the Rose Elixir a best seller"_\n🌿 _"Add woody accord to the Black Orchid"_\n🖼️ _Send a photo with the product name as caption to update its image_\n\nNo commands needed — just tell me what you need.`
      );
      return NextResponse.json({ ok: true });
    }

    // ── Photo message handler ─────────────────────────────────────────────────
    if (message.photo) {
      const caption = message.caption?.trim() ?? '';
      await handlePhotoMessage(chatId, message.photo, caption);
      return NextResponse.json({ ok: true });
    }

    // ── Text message handler ──────────────────────────────────────────────────
    if (!message.text) return NextResponse.json({ ok: true });
    const text = message.text.trim();

    let data = await getBinData();
    const history = getHistory(data, chatId);
    const context = buildContext(data);

    let rawReply;
    try {
      rawReply = await askAI(text, context, history);
    } catch (aiErr) {
      console.error('AI call failed:', aiErr.message);
      await sendMessage(chatId, `⚠️ I'm having trouble reaching the AI right now — give it a few seconds and try again!`);
      return NextResponse.json({ ok: true });
    }

    const { results, updatedData } = parseAndApplyActions(rawReply, data);
    data = updatedData;
    data = saveToHistory(data, chatId, text, rawReply);
    await updateBinData(data);

    const cleanReply = rawReply.replace(/<<[A-Z_]+:\{[\s\S]*?\}>>/g, '').trim();
    const successLines = results.filter((r) => !r.error).map((r) => `✅ ${r.message}`);
    const errorLines = results.filter((r) => r.error).map((r) => `⚠️ ${r.message}`);
    const footer = [...successLines, ...errorLines].join('\n');
    await sendMessage(chatId, footer ? `${cleanReply}\n\n${footer}` : cleanReply);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ ok: true });
  }
}

// ─── Photo handler ────────────────────────────────────────────────────────────

async function handlePhotoMessage(chatId, photos, caption) {
  try {
    await sendMessage(chatId, `📸 Got your photo! Uploading to Cloudinary...`);

    // Telegram sends multiple sizes — take the largest (last in array)
    const bestPhoto = photos[photos.length - 1];
    const { buffer, ext } = await downloadTelegramPhoto(bestPhoto.file_id);

    const filename = `tg_${Date.now()}.${ext}`;
    const { publicId, url } = await uploadToCloudinary(buffer, filename);

    // If caption mentions a product name, update that product's image
    const data = await getBinData();
    const products = Array.isArray(data.products) ? data.products : [];

    if (caption) {
      const captionLower = caption.toLowerCase();
      const matchIdx = products.findIndex(
        (p) =>
          captionLower.includes(p.name.toLowerCase()) ||
          captionLower.includes(p.brand?.toLowerCase() ?? '')
      );

      if (matchIdx !== -1) {
        const matched = products[matchIdx];
        products[matchIdx] = { ...matched, image: publicId, updatedAt: new Date().toISOString() };
        await updateBinData({ ...data, products });
        await sendMessage(
          chatId,
          `✅ Image updated for *${matched.name}*!\n\n🔗 ${url}\n\nIt will appear on the website shortly.`
        );
        return;
      }
    }

    // No product matched — give them the Cloudinary ID so they can assign it themselves
    await sendMessage(
      chatId,
      `✅ *Image uploaded successfully!*\n\n` +
      `🔗 ${url}\n\n` +
      `*Cloudinary ID:* \`${publicId}\`\n\n` +
      (caption
        ? `I couldn't match "${caption}" to a product name. Tell me which product this belongs to and I'll update it — e.g. _"set image of Rose Oud to ${publicId}"_`
        : `No caption detected. Tell me which product this image belongs to — e.g. _"this photo is for Rose Oud"_`)
    );
  } catch (err) {
    console.error('Photo upload error:', err);
    await sendMessage(chatId, `⚠️ Something went wrong uploading the photo: ${err.message}`);
  }
}
