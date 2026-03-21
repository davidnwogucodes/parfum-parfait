import { NextResponse } from 'next/server';
import { getBinData, updateBinData } from '@/lib/jsonbin';
import { getProfitLoss, getInventoryStatus, expensesByCategory } from '@/lib/business';
import { askAI } from '@/lib/openrouter';

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
    today: {
      revenue: today.revenue,
      orders: today.orderCount,
      expenses: today.expenses,
      profit: today.profit,
      status: today.status,
    },
    thisMonth: {
      revenue: month.revenue,
      orders: month.orderCount,
      expenses: month.expenses,
      profit: month.profit,
      margin: `${month.margin}%`,
      status: month.status,
    },
    allTime: {
      revenue: allTime.revenue,
      totalOrders: allTime.orderCount,
      totalExpenses: allTime.expenses,
      profit: allTime.profit,
      status: allTime.status,
    },
    inventory: {
      totalProducts: inventory.totalProducts,
      inStock: inventory.inStock,
      outOfStock: inventory.outOfStockItems,
      lowStock: inventory.lowStockItems,
      totalStockValue: inventory.totalStockValue,
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
    expensesByCategory: expensesByCategory(expenses),
    recentExpenses: expenses.slice(-10).reverse().map((e) => ({
      date: e.date,
      amount: e.amount,
      description: e.description,
      category: e.category,
    })),
    recentOrders: orders.slice(-5).reverse().map((o) => ({
      date: o.timestamp,
      customer: o['customer name'],
      items: o.items,
      total: o.total,
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
        id: `exp_${Date.now()}`,
        amount: parseFloat(params.amount),
        description: params.description,
        category: params.category ?? 'other',
        createdAt: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
      };
      return {
        updatedData: { ...data, expenses: [...(data.expenses ?? []), newExpense] },
        message: `Expense logged — $${newExpense.amount} (${newExpense.category})`,
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
    if (!message?.text) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text === '/start') {
      await sendMessage(
        chatId,
        `👋 *Welcome to your Parfum Parfait Business Assistant!*\n\nI'm here to help you run the store. Just talk to me like you would a business partner:\n\n📦 _"Which products are running low?"_\n💰 _"How much did we make this month?"_\n📝 _"Add expense — bought 20 bottles of oud for $350, stock"_\n✏️ _"Change the price of the Chanel one to $95"_\n⭐ _"Make the Rose Elixir a best seller"_\n🌿 _"Add woody accord to the Black Orchid"_\n\nNo commands needed — just tell me what you need.`
      );
      return NextResponse.json({ ok: true });
    }

    // ── Single read from JSONBin ──────────────────────────────────────────────
    let data = await getBinData();

    const history = getHistory(data, chatId);
    const context = buildContext(data);

    // ── Ask AI (with memory) ─────────────────────────────────────────────────
    let rawReply;
    try {
      rawReply = await askAI(text, context, history);
    } catch (aiErr) {
      console.error('AI call failed:', aiErr.message);
      await sendMessage(chatId, `⚠️ I'm having trouble reaching the AI right now — the model is a bit busy. Give it a few seconds and try again!`);
      return NextResponse.json({ ok: true });
    }

    // ── Parse & apply all CRUD actions ───────────────────────────────────────
    const { results, updatedData } = parseAndApplyActions(rawReply, data);
    data = updatedData;

    // ── Save conversation history ─────────────────────────────────────────────
    data = saveToHistory(data, chatId, text, rawReply);

    // ── Single write to JSONBin ───────────────────────────────────────────────
    await updateBinData(data);

    // ── Build final reply ─────────────────────────────────────────────────────
    const cleanReply = rawReply.replace(/<<[A-Z_]+:\{[\s\S]*?\}>>/g, '').trim();

    const successLines = results.filter((r) => !r.error).map((r) => `✅ ${r.message}`);
    const errorLines = results.filter((r) => r.error).map((r) => `⚠️ ${r.message}`);
    const footer = [...successLines, ...errorLines].join('\n');

    const finalReply = footer ? `${cleanReply}\n\n${footer}` : cleanReply;

    await sendMessage(chatId, finalReply);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    // Always return 200 — Telegram retries on non-200 responses indefinitely
    return NextResponse.json({ ok: true });
  }
}
