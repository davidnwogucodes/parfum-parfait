/**
 * Business logic — P&L, inventory, and expense analysis.
 *
 * Expense categories:
 *   stock       — purchasing perfume/raw product inventory
 *   packaging   — bottles, boxes, card prints, labels, bags
 *   transport   — bringing goods in (agent fees, pickup costs)
 *   logistics   — outbound delivery to customers
 *   salaries    — staff wages, freelancer payments
 *   marketing   — ads, promotions, influencers
 *   utilities   — electricity, internet, water
 *   overhead    — rent, office supplies, subscriptions
 *   other       — anything that doesn't fit above
 *
 * COGS categories (directly tied to producing/acquiring goods sold):
 *   stock, packaging, transport
 *
 * Operating expense categories (running the business):
 *   logistics, salaries, marketing, utilities, overhead, other
 */

const COGS_CATEGORIES = new Set(['stock', 'packaging', 'transport']);

/** Filter items to a time period. */
function filterByPeriod(items, dateField, period) {
  if (period === 'all') return items;
  const now = new Date();
  return items.filter((item) => {
    const d = new Date(item[dateField]);
    if (isNaN(d)) return false;
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week') return d >= new Date(now - 7 * 86_400_000);
    if (period === 'month')
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
}

/**
 * Full P&L statement for a given period.
 *
 * Revenue
 *   - COGS (stock + packaging + transport)
 * = Gross Profit
 *   - Operating Expenses (logistics + salaries + marketing + utilities + overhead + other)
 * = Net Profit / Loss
 */
export function getProfitLoss(data, period = 'all') {
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const expenses = Array.isArray(data.expenses) ? data.expenses : [];

  const periodOrders = filterByPeriod(orders, 'timestamp', period);
  const periodExpenses = filterByPeriod(expenses, 'createdAt', period);

  const revenue = periodOrders.reduce(
    (sum, o) => sum + parseFloat(o.total || o.amount || 0),
    0
  );

  // Split expenses into COGS vs operating
  const cogsExpenses = periodExpenses.filter((e) => COGS_CATEGORIES.has(e.category));
  const opExpenses = periodExpenses.filter((e) => !COGS_CATEGORIES.has(e.category));

  const totalCOGS = cogsExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalOpEx = opExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalExpenses = totalCOGS + totalOpEx;

  const grossProfit = revenue - totalCOGS;
  const netProfit = grossProfit - totalOpEx;

  const grossMargin = revenue > 0 ? +((grossProfit / revenue) * 100).toFixed(1) : 0;
  const netMargin = revenue > 0 ? +((netProfit / revenue) * 100).toFixed(1) : 0;

  return {
    period,
    revenue: +revenue.toFixed(2),
    cogs: +totalCOGS.toFixed(2),
    grossProfit: +grossProfit.toFixed(2),
    grossMargin: `${grossMargin}%`,
    operatingExpenses: +totalOpEx.toFixed(2),
    netProfit: +netProfit.toFixed(2),
    netMargin: `${netMargin}%`,
    totalExpenses: +totalExpenses.toFixed(2),
    orderCount: periodOrders.length,
    expenseCount: periodExpenses.length,
    status: netProfit >= 0 ? 'profit' : 'loss',
  };
}

/** Break expenses down by category with totals. */
export function expensesByCategory(expenses) {
  const map = {};
  for (const e of expenses) {
    const cat = e.category || 'other';
    map[cat] = +((map[cat] || 0) + parseFloat(e.amount || 0)).toFixed(2);
  }
  return map;
}

/** Break expenses down by vendor — useful to see who's being paid most. */
export function expensesByVendor(expenses) {
  const map = {};
  for (const e of expenses) {
    if (!e.vendor) continue;
    const v = e.vendor;
    map[v] = +((map[v] || 0) + parseFloat(e.amount || 0)).toFixed(2);
  }
  return map;
}

/** Inventory snapshot. */
export function getInventoryStatus(products) {
  const outOfStock = products.filter((p) => p.stock === 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5);
  const totalStockValue = products.reduce(
    (sum, p) => sum + p.price * (p.stock || 0),
    0
  );
  const totalWholesaleValue = products.reduce(
    (sum, p) => sum + (p.wholesalePrice || 0) * (p.stock || 0),
    0
  );

  return {
    totalProducts: products.length,
    inStock: products.filter((p) => p.stock > 0).length,
    outOfStock: outOfStock.length,
    lowStock: lowStock.length,
    totalStockValue: +totalStockValue.toFixed(2),
    totalWholesaleValue: +totalWholesaleValue.toFixed(2),
    lowStockItems: lowStock.map((p) => ({ name: p.name, brand: p.brand, stock: p.stock, price: p.price })),
    outOfStockItems: outOfStock.map((p) => ({ name: p.name, brand: p.brand })),
    allItems: products.map((p) => ({ name: p.name, brand: p.brand, stock: p.stock, price: p.price })),
  };
}
