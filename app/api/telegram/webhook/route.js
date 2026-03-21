import { NextResponse } from 'next/server';
import { getBinData, updateBinData } from '@/lib/jsonbin';
import { getProfitLoss, getInventoryStatus, expensesByCategory, expensesByVendor } from '@/lib/business';
import { askAI, resolveWithAI } from '@/lib/openrouter';
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

    // Pending capability proposals awaiting owner approval
    pendingCapabilities: (Array.isArray(data.pendingCapabilities) ? data.pendingCapabilities : []).map((c) => ({
      name: c.name,
      description: c.description,
    })),
  };
}

// ─── Conversation history helpers ────────────────────────────────────────────

function getHistory(data, chatId) {
  const conversations = data.botConversations ?? {};
  return conversations[String(chatId)]?.history ?? [];
}

function getPendingImage(data, chatId) {
  const conversations = data.botConversations ?? {};
  return conversations[String(chatId)]?.pendingImage ?? null;
}

function savePendingImage(data, chatId, pendingImage) {
  const conversations = data.botConversations ?? {};
  const chatIdStr = String(chatId);
  const existing = conversations[chatIdStr] ?? {};
  return { ...data, botConversations: { ...conversations, [chatIdStr]: { ...existing, pendingImage } } };
}

function clearPendingImage(data, chatId) {
  return savePendingImage(data, chatId, null);
}

/** Returns a new data object with the updated conversation history for this chat. */
function saveToHistory(data, chatId, userMessage, rawAiReply) {
  const conversations = data.botConversations ?? {};
  const chatIdStr = String(chatId);
  const existing = conversations[chatIdStr] ?? {};
  const history = [...(existing.history ?? [])];

  history.push({ role: 'user', content: userMessage });
  // Store clean reply (without action markers) so the AI doesn't re-trigger actions
  history.push({
    role: 'assistant',
    content: rawAiReply.replace(/<<[A-Z_]+:\{[\s\S]*?\}>>/g, '').trim(),
  });

  // Keep only the last MAX_TURNS * 2 messages
  const trimmed = history.slice(-(MAX_TURNS * 2));

  return { ...data, botConversations: { ...conversations, [chatIdStr]: { ...existing, history: trimmed } } };
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

    // ─── Self-evolution actions ───────────────────────────────────────────────

    case 'CREATE_ACTION': {
      const existingCustom = Array.isArray(data.customActions) ? data.customActions : [];
      if (existingCustom.find((a) => a.name === params.name)) {
        return { updatedData: data, message: `Custom action "${params.name}" already exists`, error: true };
      }
      const newAction = {
        name: params.name,
        description: params.description,
        when: params.when,
        params: params.params ?? {},
        handlerHint: params.handlerHint,
        dataKey: params.dataKey,
        createdAt: new Date().toISOString(),
      };
      return {
        updatedData: { ...data, customActions: [...existingCustom, newAction] },
        message: `🧠 New capability unlocked: "${params.name}" — ${params.description}`,
      };
    }

    case 'PROPOSE_CAPABILITY': {
      const existingPending = Array.isArray(data.pendingCapabilities) ? data.pendingCapabilities : [];
      const proposal = { ...params, proposedAt: new Date().toISOString() };
      return {
        updatedData: { ...data, pendingCapabilities: [...existingPending, proposal] },
        message: `💡 Proposed new capability: "${params.name}". Reply "yes, add it" to activate.`,
      };
    }

    case 'APPROVE_CAPABILITY': {
      const pendingCaps = Array.isArray(data.pendingCapabilities) ? data.pendingCapabilities : [];
      const customCaps = Array.isArray(data.customActions) ? data.customActions : [];
      const capIdx = pendingCaps.findIndex((c) => c.name === params.name);
      if (capIdx === -1) return { updatedData: data, message: `No pending capability named "${params.name}"`, error: true };
      const approved = { ...pendingCaps[capIdx], approvedAt: new Date().toISOString() };
      const newPending = pendingCaps.filter((_, i) => i !== capIdx);
      return {
        updatedData: { ...data, customActions: [...customCaps, approved], pendingCapabilities: newPending },
        message: `✅ "${params.name}" activated! I can now handle this going forward.`,
      };
    }

    default:
      // Signal that this action is unknown — parseAndApplyActions will attempt dynamic resolution
      return { updatedData: data, message: `Unknown action: ${actionName}`, unknown: true };
  }
}

/**
 * Dynamically resolve an unknown action using the stored custom action schema.
 * Calls the AI with a focused prompt to produce the updated data key.
 */
async function resolveUnknownAction(actionName, params, data, customActions) {
  const schema = (customActions ?? []).find((a) => a.name === actionName);
  if (!schema) {
    return { updatedData: data, message: `No handler found for "${actionName}" — define it with CREATE_ACTION first`, error: true };
  }

  const dataKey = schema.dataKey;
  const currentValue = Array.isArray(data[dataKey]) ? data[dataKey] : (data[dataKey] ?? []);

  const resolverPrompt =
    `You are a JSON data operator for a perfume store system.\n` +
    `Action: ${actionName}\n` +
    `Description: ${schema.description}\n` +
    `Handler instructions: ${schema.handlerHint}\n` +
    `Parameters provided: ${JSON.stringify(params)}\n` +
    `Current value of data["${dataKey}"]: ${JSON.stringify(currentValue)}\n\n` +
    `Apply the action and return ONLY the new JSON value for data["${dataKey}"]. ` +
    `No explanations. No markdown fences. Raw JSON only.`;

  try {
    const raw = await resolveWithAI(resolverPrompt);
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const newValue = JSON.parse(cleaned);
    return {
      updatedData: { ...data, [dataKey]: newValue },
      message: `${actionName} executed via dynamic handler`,
    };
  } catch (err) {
    console.error(`Dynamic resolver error for ${actionName}:`, err.message);
    return { updatedData: data, message: `Dynamic handler failed for "${actionName}": ${err.message}`, error: true };
  }
}

/**
 * Parse all <<ACTION_NAME:{...}>> markers from the AI reply,
 * apply them sequentially to the data, and return results.
 */
async function parseAndApplyActions(rawReply, data, customActions = []) {
  const ACTION_RE = /<<([A-Z_]+):(\{[\s\S]*?\})>>/g;
  const results = [];
  let currentData = data;
  let match;

  while ((match = ACTION_RE.exec(rawReply)) !== null) {
    const [, actionName, paramsJson] = match;
    try {
      const params = JSON.parse(paramsJson);
      const result = applyAction(actionName, params, currentData);
      if (result.unknown) {
        // Unknown built-in — attempt dynamic resolution via custom action schema
        const dynResult = await resolveUnknownAction(actionName, params, currentData, customActions);
        currentData = dynResult.updatedData;
        results.push({ actionName, message: dynResult.message, error: dynResult.error ?? false });
      } else {
        currentData = result.updatedData;
        results.push({ actionName, message: result.message, error: result.error ?? false });
      }
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
    const customActions = Array.isArray(data.customActions) ? data.customActions : [];

    // If a photo was recently uploaded, inject that context into the user's message
    const pendingImage = getPendingImage(data, chatId);
    let enrichedText = text;
    if (pendingImage) {
      enrichedText =
        `[A photo was just uploaded to Cloudinary before this message. ` +
        `Cloudinary publicId: "${pendingImage.publicId}", URL: ${pendingImage.url}. ` +
        `The owner's message below likely refers to this image — use it for CREATE_PRODUCT (set image field to the publicId) or UPDATE_IMAGE as appropriate.]\n\n` +
        text;
      // Clear pending image so it's only used once
      data = clearPendingImage(data, chatId);
    }

    let rawReply;
    try {
      rawReply = await askAI(enrichedText, context, history, customActions);
    } catch (aiErr) {
      console.error('AI call failed:', aiErr.message);
      await sendMessage(chatId, `⚠️ I'm having trouble reaching the AI right now — give it a few seconds and try again!`);
      return NextResponse.json({ ok: true });
    }

    const { results, updatedData } = await parseAndApplyActions(rawReply, data, customActions);
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

    // Load data to check for product match and save pending image
    let data = await getBinData();
    const products = Array.isArray(data.products) ? data.products : [];

    // If caption mentions a product name, auto-update that product's image
    if (caption) {
      const captionLower = caption.toLowerCase();
      const matchIdx = products.findIndex(
        (p) =>
          captionLower.includes(p.name.toLowerCase()) ||
          captionLower.includes((p.brand ?? '').toLowerCase())
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

    // No product matched — store as pending image so next text message can use it
    data = savePendingImage(data, chatId, { publicId, url });
    await updateBinData(data);

    await sendMessage(
      chatId,
      `✅ *Image uploaded!*\n\n🔗 ${url}\n\n` +
      (caption
        ? `I couldn't match _"${caption}"_ to an existing product. Just tell me — is this for a new product or an existing one? Give me the name, price, stock and any other details and I'll sort it out.`
        : `Now just tell me what product this is for — name, price, stock, anything you know. I'll create or update it right away.`)
    );
  } catch (err) {
    console.error('Photo upload error:', err);
    await sendMessage(chatId, `⚠️ Something went wrong uploading the photo: ${err.message}`);
  }
}
