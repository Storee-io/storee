import type { Store } from '../context/StoreContext';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DashboardProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  badge?: string;
  stock: number;
  sales: number;
  status: 'Active' | 'Draft';
  collectionId?: string;
}

export interface DashboardOrder {
  id: string;
  customer: string;
  avatar: string;
  email: string;
  product: string;
  amount: number;
  status: 'Completed' | 'Processing' | 'Shipped';
  date: string;
  shipping: string;
  address: string;
}

export interface DashboardCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  spent: number;
  avgSpend: number;
  joined: string;
  lastActive: string;
  status: 'VIP' | 'Regular' | 'New';
}

export interface ChartDataPoint {
  month: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
  stock: number;
}

export interface Collection {
  id: string;
  name: string;
  nameHtml?: string;
  emoji: string;
  emojiHtml?: string;
}

export interface StoreData {
  products: DashboardProduct[];
  orders: DashboardOrder[];
  customers: DashboardCustomer[];
  revenueChart: ChartDataPoint[];
  topProducts: TopProduct[];
  collections: Collection[];
}

// ── Seeded deterministic RNG ─────────────────────────────────────────────────

function rng(seed: string, i: number): number {
  let h = 0;
  const s = seed + String(i);
  for (let j = 0; j < s.length; j++) {
    h = Math.imul(31, h) + s.charCodeAt(j) | 0;
  }
  return (h >>> 0) / 4294967295;
}

// ── Static pools ─────────────────────────────────────────────────────────────

const NAMES: [string, string][] = [
  ['Sarah', 'Johnson'], ['Michael', 'Chen'], ['Emma', 'Williams'],
  ['James', 'Brown'], ['Olivia', 'Davis'], ['Liam', 'Wilson'],
  ['Priya', 'Sharma'], ['Reza', 'Pratama'], ['Natalie', 'Green'],
  ['David', 'Kim'], ['Aisha', 'Malik'], ['Carlos', 'Rivera'],
  ['Yuki', 'Tanaka'], ['Sophie', 'Martin'], ['Omar', 'Hassan'],
  ['Mei', 'Zhang'], ['Lucas', 'Anderson'], ['Fatima', 'Ali'],
];

const TIMES = [
  '2 min ago', '15 min ago', '1 hr ago', '3 hrs ago',
  '5 hrs ago', '8 hrs ago', '1 day ago', '2 days ago', '3 days ago',
];

const ORDER_STATUSES = ['Completed', 'Completed', 'Completed', 'Processing', 'Shipped'] as const;

const SHIPPING_METHODS = ['JNE REG', 'J&T Express', 'SiCepat REG', 'Anteraja', 'Standard Shipping', 'Express Shipping', 'Same Day'];

const ADDRESSES = [
  'Jl. Sudirman No. 12, Jakarta Selatan',
  'Jl. Gatot Subroto No. 45, Bandung',
  'Jl. Pemuda No. 8, Surabaya',
  'Jl. Malioboro No. 72, Yogyakarta',
  'Jl. Diponegoro No. 33, Semarang',
  'Jl. Ahmad Yani No. 18, Makassar',
  'Jl. Raya Kuta No. 5, Bali',
  '123 Main St, Singapore',
  '45 Orchard Rd, Singapore',
];

const JOIN_MONTHS = [
  'Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024',
  'May 2024', 'Dec 2023', 'Nov 2023', 'Oct 2023',
];

const PHONE_PREFIXES = ['0811', '0812', '0813', '0821', '0822', '0852', '0853', '0856', '0857', '0858'];

const LAST_ACTIVE = [
  'Just now', '5 min ago', '1 hr ago', '3 hrs ago',
  'Yesterday', '2 days ago', '3 days ago', '5 days ago',
  '1 week ago', '2 weeks ago',
];

const CHART_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
const CHART_WEIGHTS = [0.08, 0.11, 0.10, 0.15, 0.14, 0.20, 0.22];

const STOCK_POOL = [24, 56, 112, 8, 45, 78, 34, 90];
const SALES_SHARE = [0.40, 0.25, 0.20, 0.15];

// Exchange rates: how many local units = 1 USD
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  IDR: 15500,  // Indonesian Rupiah
  SGD: 1.35,   // Singapore Dollar
  MYR: 4.65,   // Malaysian Ringgit
  PHP: 56,     // Philippine Peso
  THB: 36,     // Thai Baht
  VND: 24000,  // Vietnamese Dong
  GBP: 0.79,   // British Pound
  EUR: 0.92,   // Euro
  AUD: 1.53,   // Australian Dollar
  CAD: 1.36,   // Canadian Dollar
  JPY: 150,    // Japanese Yen
  CNY: 7.2,    // Chinese Yuan
};

// Realistic price ranges for common product categories (in USD)
const PRICE_RANGES: Record<string, [number, number]> = {
  Rings: [150, 2000],
  Earrings: [50, 800],
  Necklaces: [100, 1500],
  Bracelets: [50, 1000],
  Hoodies: [40, 150],
  Bottoms: [60, 200],
  Tops: [25, 100],
  Accessories: [15, 200],
  'Supplements': [30, 150],
  'Equipment': [50, 500],
  'Apparel': [30, 150],
  'Lighting': [40, 300],
  'Textiles': [30, 200],
  'Furniture': [100, 500],
  'Decor': [20, 200],
  'Bread': [8, 25],
  'Pastry': [10, 30],
  'Cakes': [8, 20],
  'Charging': [30, 150],
  'Keyboard': [30, 150],
  'Bags': [50, 400],
  'Clothing': [50, 300],
  'Camping': [30, 200],
  'Hiking': [30, 150],
  'Building': [20, 100],
  'Art': [15, 80],
  'Plush': [15, 60],
  'Puzzles': [20, 100],
  'Outerwear': [200, 800],
  'Shoes': [100, 500],
  'Green Tea': [15, 50],
  'Herbal': [12, 40],
  'Matcha': [30, 100],
  'Books': [10, 60],
  'Default': [10, 500],
};

function normalizePrice(price: number, category?: string, currencyCode?: string): number {
  const rate = EXCHANGE_RATES[currencyCode || 'USD'] || 1;
  const threshold = 10000 * rate;  // Adjust threshold based on currency

  // If price is already reasonable for its currency, keep it
  if (price < threshold) return price;

  const usdRange = PRICE_RANGES[category || 'Default'] || PRICE_RANGES.Default;
  const [usdMin, usdMax] = usdRange;

  // Convert USD range to local currency
  const localMin = Math.round(usdMin * rate);
  const localMax = Math.round(usdMax * rate);

  // Normalize to realistic range in local currency
  if (price > threshold) {
    return Math.floor(localMin + Math.random() * (localMax - localMin));
  }

  return price;
}

// ── Main generator ───────────────────────────────────────────────────────────

export function generateStoreData(store: Store): StoreData {
  // Option C: design.products is the single source of truth.
  // template.demoProducts kept as fallback for stores created before Option C.
  const designProducts = store.design?.products ?? [];
  const templateProducts = store.template?.demoProducts ?? [];
  const baseProducts = designProducts.length > 0 ? designProducts : templateProducts;

  if (baseProducts.length === 0) return emptyStoreData();

  const currencyCode = store.currency?.code ?? 'USD';

  const products: DashboardProduct[] = baseProducts.map((p, i) => {
    // For draft stores, don't count sales; for published stores, use actual order count
    const orderCount = store.status === 'Published' ? (store.orders > 0 ? store.orders : 12) : 0;
    return {
      id: p.id,
      name: p.name,
      price: normalizePrice(p.price, p.category, currencyCode),
      image: p.image,
      category: p.category,
      badge: (p as { badge?: string }).badge,
      stock: STOCK_POOL[i % STOCK_POOL.length],
      sales: Math.max(1, Math.round(orderCount * SALES_SHARE[i % 4])),
      status: 'Active' as const,
    };
  });

  // Only generate orders, customers, and revenue for published stores
  if (store.status !== 'Published') {
    const revenueChart: ChartDataPoint[] = CHART_MONTHS.map(month => ({
      month,
      revenue: 0,
      orders: 0,
    }));
    const collections: Collection[] = [
      { id: 'col-1', name: 'Featured', emoji: '⭐' },
      { id: 'col-2', name: 'Best Sellers', emoji: '🔥' },
      { id: 'col-3', name: 'New Arrivals', emoji: '✨' },
    ];
    return { products, orders: [], customers: [], revenueChart, topProducts: [], collections };
  }

  const totalOrders = store.orders > 0 ? store.orders : 12;
  const totalRevenue = store.revenue > 0 ? store.revenue : products.reduce((s, p) => s + p.price * 3, 0);

  // Orders
  const orderCount = Math.min(totalOrders, 20);
  const orders: DashboardOrder[] = Array.from({ length: orderCount }, (_, i) => {
    const [first, last] = NAMES[Math.floor(rng(store.id, i) * NAMES.length)];
    const product = products[Math.floor(rng(store.id, i + 100) * products.length)];
    const status = ORDER_STATUSES[Math.floor(rng(store.id, i + 200) * ORDER_STATUSES.length)];
    const date = TIMES[Math.floor(rng(store.id, i + 300) * TIMES.length)];
    return {
      id: `#ORD-${1000 + orderCount - i}`,
      customer: `${first} ${last}`,
      avatar: `${first[0]}${last[0]}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@email.com`,
      product: product.name,
      amount: product.price,
      status,
      date,
      shipping: SHIPPING_METHODS[Math.floor(rng(store.id, i + 400) * SHIPPING_METHODS.length)],
      address: ADDRESSES[Math.floor(rng(store.id, i + 500) * ADDRESSES.length)],
    };
  });

  // Customers (aggregated from orders, unique by name)
  const custMap = new Map<string, { orders: number; spent: number }>();
  orders.forEach(o => {
    const c = custMap.get(o.customer);
    if (c) { c.orders++; c.spent += o.amount; }
    else custMap.set(o.customer, { orders: 1, spent: o.amount });
  });

  let ci = 0;
  const customers: DashboardCustomer[] = Array.from(custMap.entries()).map(([name, data]) => {
    const idx = ci++;
    const [first, last = 'user'] = name.toLowerCase().split(' ');
    const joined     = JOIN_MONTHS[Math.floor(rng(store.id, idx + 500) * JOIN_MONTHS.length)];
    const lastActive = LAST_ACTIVE[Math.floor(rng(store.id, idx + 600) * LAST_ACTIVE.length)];
    const prefix     = PHONE_PREFIXES[Math.floor(rng(store.id, idx + 700) * PHONE_PREFIXES.length)];
    // Generate 8 deterministic digits after the prefix
    const digits     = Array.from({ length: 8 }, (_, k) =>
      Math.floor(rng(store.id, idx * 100 + k + 800) * 10)
    ).join('');
    const phone      = `${prefix}-${digits.slice(0, 4)}-${digits.slice(4)}`;
    const avgSpend   = data.orders > 0 ? Math.round(data.spent / data.orders) : 0;
    const status: DashboardCustomer['status'] =
      data.spent > 500 ? 'VIP' : data.orders > 2 ? 'Regular' : 'New';
    return {
      id: `C${String(idx + 1).padStart(3, '0')}`,
      name,
      email: `${first}.${last}@email.com`,
      phone,
      orders: data.orders,
      spent: data.spent,
      avgSpend,
      joined,
      lastActive,
      status,
    };
  });

  // Revenue chart
  const revenueChart: ChartDataPoint[] = CHART_MONTHS.map((month, i) => ({
    month,
    revenue: Math.round(totalRevenue * CHART_WEIGHTS[i]),
    orders: Math.max(1, Math.round(totalOrders * CHART_WEIGHTS[i])),
  }));

  // Top products by sales
  const topProducts: TopProduct[] = [...products]
    .sort((a, b) => b.sales - a.sales)
    .map(p => ({
      name: p.name,
      sales: p.sales,
      revenue: p.sales * p.price,
      stock: p.stock,
    }));

  const collections: Collection[] = [
    { id: 'col-1', name: 'Featured', emoji: '⭐' },
    { id: 'col-2', name: 'Best Sellers', emoji: '🔥' },
    { id: 'col-3', name: 'New Arrivals', emoji: '✨' },
  ];

  return { products, orders, customers, revenueChart, topProducts, collections };
}

function emptyStoreData(): StoreData {
  return {
    products: [],
    orders: [],
    customers: [],
    revenueChart: CHART_MONTHS.map(month => ({ month, revenue: 0, orders: 0 })),
    topProducts: [],
    collections: [],
  };
}
