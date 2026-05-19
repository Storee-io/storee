export const revenueData = [
  { month: 'Jan', revenue: 4200, orders: 38 },
  { month: 'Feb', revenue: 5800, orders: 52 },
  { month: 'Mar', revenue: 4900, orders: 44 },
  { month: 'Apr', revenue: 7200, orders: 67 },
  { month: 'May', revenue: 6100, orders: 55 },
  { month: 'Jun', revenue: 8900, orders: 82 },
  { month: 'Jul', revenue: 9400, orders: 91 },
];

export const recentOrders = [
  { id: '#ORD-1042', customer: 'Sarah Johnson', product: 'Silk Slip Dress', amount: 299, status: 'Completed', date: '2 min ago', avatar: 'SJ' },
  { id: '#ORD-1041', customer: 'Michael Chen', product: 'Cold Brew Kit', amount: 45, status: 'Processing', date: '15 min ago', avatar: 'MC' },
  { id: '#ORD-1040', customer: 'Emma Williams', product: 'Vitamin C Serum', amount: 45, status: 'Completed', date: '1 hr ago', avatar: 'EW' },
  { id: '#ORD-1039', customer: 'James Brown', product: 'Wireless Earbuds Pro', amount: 129, status: 'Shipped', date: '3 hrs ago', avatar: 'JB' },
  { id: '#ORD-1038', customer: 'Olivia Davis', product: 'Oak Dining Table', amount: 899, status: 'Completed', date: '5 hrs ago', avatar: 'OD' },
  { id: '#ORD-1037', customer: 'Liam Wilson', product: 'House Blend 250g', amount: 18, status: 'Processing', date: '6 hrs ago', avatar: 'LW' },
];

export const topProducts = [
  { name: 'Silk Slip Dress', sales: 142, revenue: 42358, stock: 24 },
  { name: 'Wireless Earbuds Pro', sales: 98, revenue: 12642, stock: 56 },
  { name: 'Vitamin C Serum', sales: 201, revenue: 9045, stock: 112 },
  { name: 'Oak Dining Table', sales: 31, revenue: 27869, stock: 8 },
  { name: 'Ethiopia Coffee', sales: 178, revenue: 3916, stock: 89 },
];

export const customers = [
  { id: 'C001', name: 'Sarah Johnson', email: 'sarah.j@email.com', orders: 12, spent: 2840, joined: 'Jan 2024', status: 'VIP' },
  { id: 'C002', name: 'Michael Chen', email: 'mchen@email.com', orders: 7, spent: 945, joined: 'Feb 2024', status: 'Regular' },
  { id: 'C003', name: 'Emma Williams', email: 'emma.w@email.com', orders: 19, spent: 3210, joined: 'Nov 2023', status: 'VIP' },
  { id: 'C004', name: 'James Brown', email: 'jbrown@email.com', orders: 3, spent: 387, joined: 'Apr 2024', status: 'New' },
  { id: 'C005', name: 'Olivia Davis', email: 'olivia.d@email.com', orders: 8, spent: 1780, joined: 'Dec 2023', status: 'Regular' },
];

export const promotions = [
  { id: 'PROMO001', code: 'SUMMER20', discount: '20%', type: 'Percentage', uses: 142, limit: 500, expires: 'Jun 30, 2026', status: 'Active' },
  { id: 'PROMO002', code: 'FIRST10', discount: '$10', type: 'Fixed', uses: 89, limit: 200, expires: 'Dec 31, 2026', status: 'Active' },
  { id: 'PROMO003', code: 'VIP30', discount: '30%', type: 'Percentage', uses: 23, limit: 50, expires: 'May 31, 2026', status: 'Active' },
  { id: 'PROMO004', code: 'FLASH50', discount: '50%', type: 'Percentage', uses: 500, limit: 500, expires: 'Apr 15, 2026', status: 'Expired' },
];

export const demoStores = [
  { id: 'store-1', name: 'Luxe Fashion', domain: 'luxe-fashion.storee.io', status: 'Published', revenue: 12840, orders: 142, category: 'Fashion' },
  { id: 'store-2', name: 'Coffee Artisan', domain: 'coffee-artisan.storee.io', status: 'Published', revenue: 5420, orders: 89, category: 'Coffee' },
  { id: 'store-3', name: 'Beauty Glow', domain: 'beauty-glow.storee.io', status: 'Draft', revenue: 0, orders: 0, category: 'Beauty' },
];

export const testimonials = [
  {
    name: 'Rina Maharani',
    role: 'Fashion Entrepreneur',
    company: 'Rina Atelier',
    avatar: 'RM',
    photo: 'https://randomuser.me/api/portraits/women/44.jpg',
    rating: 5,
    text: 'Storee completely transformed how I sell online. I typed my brand concept and within minutes had a beautiful store ready to publish. My sales grew 3x in the first month!',
    color: 'from-pink-500 to-rose-500',
  },
  {
    name: 'Budi Santoso',
    role: 'Coffee Business Owner',
    company: 'Kopi Nusantara',
    avatar: 'BS',
    photo: 'https://randomuser.me/api/portraits/men/43.jpg',
    rating: 5,
    text: 'I was skeptical about AI-generated stores, but Storee blew my mind. The generated store looked professional and the dashboard is so intuitive. Best investment I made.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    name: 'Sari Dewi',
    role: 'Beauty Brand Founder',
    company: 'Glow Lab',
    avatar: 'SD',
    photo: 'https://randomuser.me/api/portraits/women/55.jpg',
    rating: 5,
    text: 'From zero to published store in 10 minutes. Storee handles everything — design, products, checkout. I just focus on growing my brand. Absolutely incredible product!',
    color: 'from-purple-500 to-pink-500',
  },
  {
    name: 'Ahmad Fauzi',
    role: 'Electronics Retailer',
    company: 'TechZone ID',
    avatar: 'AF',
    photo: 'https://randomuser.me/api/portraits/men/32.jpg',
    rating: 5,
    text: 'The multi-store feature is a game changer. I manage 3 different stores from one dashboard. The analytics are detailed and help me make better business decisions.',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    name: 'Dewi Kusuma',
    role: 'Home Decor Seller',
    company: 'Casa Indah',
    avatar: 'DK',
    photo: 'https://randomuser.me/api/portraits/women/65.jpg',
    rating: 5,
    text: 'Switching from Shopify saved me $80/month and Storee is actually easier to use. The AI understood exactly what aesthetic I wanted for my store. 10/10!',
    color: 'from-green-500 to-teal-500',
  },
];

export const faqs = [
  {
    q: 'How does the AI Store Builder work?',
    a: 'Simply type a description of your business — like "Create a minimalist fashion store for women\'s clothing in Jakarta targeting 20-35 year olds." Our AI analyzes your prompt and generates a complete store including design, layout, sample products, logo, and banner — all in under a minute.',
  },
  {
    q: 'Do I need design or coding skills?',
    a: 'Absolutely not. Storee is designed for everyone. Whether you\'re a first-time entrepreneur or an experienced business owner, you can create a professional online store without any technical knowledge. Everything is point-and-click or AI-generated.',
  },
  {
    q: 'Can I customize my store after it\'s generated?',
    a: 'Yes! After generation, you have full control. Customize colors, fonts, layout, add/edit products, set shipping rates, configure payment methods, and more — all from your intuitive dashboard.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'Storee supports all major payment methods including credit/debit cards (Visa, Mastercard), bank transfers, digital wallets (GoPay, OVO, Dana, ShopeePay), and QRIS. International stores can also use PayPal and Stripe.',
  },
  {
    q: 'Can I have multiple stores in one account?',
    a: 'Yes! Storee supports multi-store management. Create and manage multiple stores from a single dashboard, each with its own products, orders, customers, and analytics. Perfect for entrepreneurs with multiple brands.',
  },
  {
    q: 'Is my store mobile-friendly?',
    a: 'Every store generated by Storee is fully responsive and optimized for mobile devices. We prioritize mobile experience since over 70% of online shoppers browse on their phones.',
  },
  {
    q: 'How much does Storee cost?',
    a: 'Storee offers flexible plans starting from free (with Storee branding) to professional plans. Our Starter plan starts at $19/month with custom domain support, unlimited products, and all core features. No hidden fees.',
  },
  {
    q: 'Can I connect my own domain?',
    a: 'Yes, on paid plans you can connect your own custom domain (e.g., yourbrand.com). Your store will automatically get SSL certificate for secure shopping.',
  },
];
