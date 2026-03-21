/**
 * Filter a list of items to a time period.
 * @param {Array} items
 * @param {string} dateField - field containing ISO date string
 * @param {'today'|'week'|'month'|'all'} period
 */
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
 * Calculate revenue, expenses, and profit for a given period.
 * Orders use `total` or `amount` (string from checkout form).
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
  const totalExpenses = periodExpenses.reduce(
    (sum, e) => sum + parseFloat(e.amount || 0),
    0
  );
  const profit = revenue - totalExpenses;

  return {
    revenue: +revenue.toFixed(2),
    expenses: +totalExpenses.toFixed(2),
    profit: +profit.toFixed(2),
    orderCount: periodOrders.length,
    expenseCount: periodExpenses.length,
    margin: revenue > 0 ? +((profit / revenue) * 100).toFixed(1) : 0,
    status: profit >= 0 ? 'profit' : 'loss',
  };
}

/** Inventory snapshot. */
export function getInventoryStatus(products) {
  const outOfStock = products.filter((p) => p.stock === 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5);
  const totalStockValue = products.reduce(
    (sum, p) => sum + p.price * (p.stock || 0),
    0
  );

  return {
    totalProducts: products.length,
    inStock: products.filter((p) => p.stock > 0).length,
    outOfStock: outOfStock.length,
    lowStock: lowStock.length,
    totalStockValue: +totalStockValue.toFixed(2),
    lowStockItems: lowStock.map((p) => ({ name: p.name, brand: p.brand, stock: p.stock, price: p.price })),
    outOfStockItems: outOfStock.map((p) => ({ name: p.name, brand: p.brand })),
    allItems: products.map((p) => ({ name: p.name, brand: p.brand, stock: p.stock, price: p.price })),
  };
}

/** Expenses grouped by category. */
export function expensesByCategory(expenses) {
  const map = {};
  for (const e of expenses) {
    const cat = e.category || 'other';
    map[cat] = +((map[cat] || 0) + parseFloat(e.amount || 0)).toFixed(2);
  }
  return map;
}
