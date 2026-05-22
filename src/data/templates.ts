export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
  color: string;
  tags: string[];
  demoProducts: Product[];
  primaryColor: string;
  accentColor: string;
  storeCount: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  badge?: string;
}

export const templates: Template[] = [
  {
    id: 'fashion-luxe',
    name: 'Fashion Luxe',
    category: 'Fashion',
    description: 'Elegant fashion store with minimalist design',
    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80',
    color: 'from-rose-400 to-pink-600',
    tags: ['Clothing', 'Accessories', 'Luxury'],
    primaryColor: '#ec4899',
    accentColor: '#f43f5e',
    storeCount: 312,
    demoProducts: [
      { id: 'p1', name: 'Silk Slip Dress', price: 299, image: 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80', category: 'Dresses', badge: 'New' },
      { id: 'p2', name: 'Linen Blazer', price: 189, image: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400&q=80', category: 'Tops' },
      { id: 'p3', name: 'Wide Leg Trousers', price: 149, image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&q=80', category: 'Bottoms', badge: 'Sale' },
      { id: 'p4', name: 'Leather Tote Bag', price: 399, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80', category: 'Bags' },
    ],
  },
  {
    id: 'beauty-glow',
    name: 'Beauty Glow',
    category: 'Beauty',
    description: 'Clean beauty brand with soft aesthetic',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
    color: 'from-pink-300 to-purple-400',
    tags: ['Skincare', 'Makeup', 'Wellness'],
    primaryColor: '#c084fc',
    accentColor: '#f9a8d4',
    storeCount: 187,
    demoProducts: [
      { id: 'p1', name: 'Vitamin C Serum', price: 45, image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80', category: 'Skincare', badge: 'Bestseller' },
      { id: 'p2', name: 'Rose Lip Gloss', price: 18, image: 'https://images.unsplash.com/photo-1586495777744-4e6232bf6111?w=400&q=80', category: 'Makeup' },
      { id: 'p3', name: 'Hydrating Mask', price: 32, image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80', category: 'Skincare', badge: 'New' },
      { id: 'p4', name: 'Body Glow Oil', price: 55, image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&q=80', category: 'Body' },
    ],
  },
  {
    id: 'coffee-artisan',
    name: 'Coffee Artisan',
    category: 'Coffee',
    description: 'Premium artisan coffee shop experience',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    color: 'from-amber-600 to-orange-700',
    tags: ['Coffee', 'Beans', 'Equipment'],
    primaryColor: '#d97706',
    accentColor: '#92400e',
    storeCount: 94,
    demoProducts: [
      { id: 'p1', name: 'Ethiopia Yirgacheffe', price: 22, image: 'https://images.unsplash.com/photo-1559525839-8f275eef5678?w=400&q=80', category: 'Single Origin', badge: 'Limited' },
      { id: 'p2', name: 'Cold Brew Kit', price: 45, image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80', category: 'Equipment' },
      { id: 'p3', name: 'House Blend 250g', price: 18, image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&q=80', category: 'Blends' },
      { id: 'p4', name: 'Ceramic Pour Over', price: 65, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80', category: 'Equipment' },
    ],
  },
  {
    id: 'tech-hub',
    name: 'Tech Hub',
    category: 'Electronics',
    description: 'Modern electronics store with dark theme',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80',
    color: 'from-blue-600 to-indigo-700',
    tags: ['Gadgets', 'Accessories', 'Smart Home'],
    primaryColor: '#3b82f6',
    accentColor: '#6366f1',
    storeCount: 241,
    demoProducts: [
      { id: 'p1', name: 'Wireless Earbuds Pro', price: 129, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80', category: 'Audio', badge: 'Hot' },
      { id: 'p2', name: 'Smart Watch S7', price: 299, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80', category: 'Wearables' },
      { id: 'p3', name: 'Mechanical Keyboard', price: 159, image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&q=80', category: 'PC' },
      { id: 'p4', name: 'Phone Stand Magnetic', price: 39, image: 'https://images.unsplash.com/photo-1601524909162-ae8725290836?w=400&q=80', category: 'Accessories' },
    ],
  },
  {
    id: 'home-living',
    name: 'Home Living',
    category: 'Furniture',
    description: 'Scandinavian furniture and home decor',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
    color: 'from-stone-400 to-neutral-600',
    tags: ['Furniture', 'Decor', 'Lighting'],
    primaryColor: '#78716c',
    accentColor: '#44403c',
    storeCount: 78,
    demoProducts: [
      { id: 'p1', name: 'Oak Dining Table', price: 899, image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80', category: 'Furniture', badge: 'Popular' },
      { id: 'p2', name: 'Linen Cushion Set', price: 79, image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80', category: 'Decor' },
      { id: 'p3', name: 'Pendant Light', price: 145, image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80', category: 'Lighting' },
      { id: 'p4', name: 'Ceramic Vase', price: 55, image: 'https://images.unsplash.com/photo-1578500351865-d6c3706f46bc?w=400&q=80', category: 'Decor' },
    ],
  },
  {
    id: 'food-market',
    name: 'Food Market',
    category: 'Food',
    description: 'Fresh organic food marketplace',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
    color: 'from-green-500 to-emerald-600',
    tags: ['Organic', 'Fresh', 'Grocery'],
    primaryColor: '#10b981',
    accentColor: '#059669',
    storeCount: 156,
    demoProducts: [
      { id: 'p1', name: 'Organic Honey 500g', price: 24, image: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400&q=80', category: 'Pantry', badge: 'Organic' },
      { id: 'p2', name: 'Cold Press Juice', price: 8, image: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=400&q=80', category: 'Drinks' },
      { id: 'p3', name: 'Granola Mix 400g', price: 16, image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80', category: 'Breakfast' },
      { id: 'p4', name: 'Artisan Bread', price: 12, image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?w=400&q=80', category: 'Bakery' },
    ],
  },
];

export const businessCategories = [
  {
    label: 'Fashion', emoji: '👗',
    prompt: 'Contemporary streetwear and curated fashion for the style-conscious generation. We stock limited-edition drops, everyday essentials, and emerging designer pieces — from oversized hoodies to tailored blazers. Every item is hand-picked for quality, fit, and cultural relevance. Free returns, worldwide shipping.',
  },
  {
    label: 'Beauty', emoji: '💄',
    prompt: 'Science-backed skincare and clean beauty essentials for radiant, healthy skin. From gentle daily cleansers and vitamin C serums to SPF moisturizers and overnight masks — every product is dermatologist-tested, cruelty-free, and formulated without parabens or harsh chemicals. Build your perfect routine.',
  },
  {
    label: 'Coffee', emoji: '☕',
    prompt: 'Artisan coffee beans and gourmet snacks delivered fresh to your door. We source directly from farmers across Ethiopia, Colombia, and Sumatra, roast weekly in small batches, and offer subscription boxes with exclusive single-origin blends. Perfect for home baristas and serious coffee enthusiasts.',
  },
  {
    label: 'Electronics', emoji: '💻',
    prompt: 'Premium tech gadgets, wireless audio, and smart home devices for the modern lifestyle. From noise-cancelling headphones and ultra-slim laptops to minimalist desk accessories and IoT home systems — every product is handpicked by our engineers and backed by dedicated customer support.',
  },
  {
    label: 'Furniture', emoji: '🪑',
    prompt: 'Scandinavian-inspired furniture and home accessories crafted to turn any space into a sanctuary. Each piece is made from sustainably sourced oak, natural linen, and hand-fired ceramics — designed for clean lines, lasting quality, and everyday comfort. Made to order, shipped flat-packed with easy assembly.',
  },
  {
    label: 'Food', emoji: '🥗',
    prompt: 'Organic groceries, artisan condiments, and gourmet pantry staples sourced directly from small-batch local producers. We deliver weekly curated boxes of seasonal vegetables, cold-pressed oils, hand-rolled pasta, and single-origin honey — supporting sustainable farming and conscious eating.',
  },
  {
    label: 'Fitness', emoji: '💪',
    prompt: 'High-performance fitness gear, resistance equipment, and recovery tools for athletes and home gym enthusiasts. From competition-grade kettlebells and adjustable dumbbells to foam rollers and compression wear — built for serious training whether you\'re hitting PRs or just starting your wellness journey.',
  },
  {
    label: 'Books', emoji: '📚',
    prompt: 'Independent bookstore specializing in literary fiction, narrative non-fiction, and rare first editions. Every book is hand-selected by our team of avid readers. We offer monthly subscription boxes with personalized picks, exclusive author bookmarks, and signed copies from debut and celebrated writers.',
  },
  {
    label: 'Jewelry', emoji: '💍',
    prompt: 'Handcrafted fine jewelry in solid 18k gold, sterling silver, and ethically sourced natural gemstones. Each piece is designed in our studio and made-to-order by master artisans — no mass production, no shortcuts. Engravable, giftable, and built to become heirloom pieces.',
  },
  {
    label: 'Toys', emoji: '🧸',
    prompt: 'Award-winning educational toys, wooden puzzles, and open-ended play sets for curious kids aged 0–12. Screen-free, sustainably made from non-toxic materials, and designed in collaboration with child development experts. Each toy sparks imagination, builds skills, and grows with your child.',
  },
  {
    label: 'Sports', emoji: '⚽',
    prompt: 'Professional outdoor gear, trail running shoes, and expedition equipment for hikers, climbers, cyclists, and weekend adventurers. Rigorously field-tested in real conditions — from mountain trails to urban runs. We carry both performance-grade and entry-level gear with honest gear guides.',
  },
  {
    label: 'Art', emoji: '🎨',
    prompt: 'Original paintings, limited-edition prints, and digital art from independent artists worldwide. Each piece ships in gallery-quality packaging with a certificate of authenticity. Every purchase goes directly to the artist — no middlemen, no galleries. Commission custom works or discover emerging talent.',
  },
];
