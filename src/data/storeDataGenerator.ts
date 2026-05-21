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

export interface StoreData {
  products: DashboardProduct[];
  orders: DashboardOrder[];
  customers: DashboardCustomer[];
  revenueChart: ChartDataPoint[];
  topProducts: TopProduct[];
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

// ── Main generator ───────────────────────────────────────────────────────────

export function generateStoreData(store: Store): StoreData {
  const template = store.template;
  const baseProducts = template?.demoProducts ?? [];

  if (baseProducts.length === 0) return emptyStoreData();

  const totalOrders = store.orders > 0 ? store.orders : 12;
  const totalRevenue = store.revenue > 0 ? store.revenue : baseProducts.reduce((s, p) => s + p.price * 3, 0);

  // Prefer AI-generated products (design.products) for richer data; fall back to template demoProducts
  const designProducts = store.design?.products ?? [];
  const products: DashboardProduct[] = baseProducts.map((p, i) => {
    const rich = designProducts[i];
    return {
      ...p,
      ...(rich ? { name: rich.name, price: rich.price, category: rich.category, badge: rich.badge } : {}),
      stock: STOCK_POOL[i % STOCK_POOL.length],
      sales: Math.max(1, Math.round(totalOrders * SALES_SHARE[i % 4])),
      status: 'Active' as const,
    };
  });

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

  return { products, orders, customers, revenueChart, topProducts };
}

function emptyStoreData(): StoreData {
  return {
    products: [],
    orders: [],
    customers: [],
    revenueChart: CHART_MONTHS.map(month => ({ month, revenue: 0, orders: 0 })),
    topProducts: [],
  };
}
