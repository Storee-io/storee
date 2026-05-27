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
  // ── JEWELRY / LUXURY ──────────────────────────────────────────────────────
  {
    id: 'velour-gems',
    name: 'Velour Gems',
    category: 'Jewelry',
    description: 'Luxury fine jewelry with cream editorial aesthetic',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80',
    color: 'from-yellow-600 to-amber-800',
    tags: ['Jewelry', 'Luxury', 'Fine Gems'],
    primaryColor: '#b8860b',
    accentColor: '#8b6914',
    storeCount: 248,
    demoProducts: [
      { id: 'p1', name: 'Diamond Solitaire Ring', price: 1850, image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80', category: 'Rings', badge: "Editor's Pick" },
      { id: 'p2', name: 'Pearl Drop Earrings', price: 420, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&q=80', category: 'Earrings' },
      { id: 'p3', name: 'Gold Chain Necklace', price: 680, image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80', category: 'Necklaces', badge: 'Bestseller' },
      { id: 'p4', name: 'Gemstone Bracelet', price: 390, image: 'https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=400&q=80', category: 'Bracelets' },
    ],
  },

  // ── STREETWEAR / DARK BOLD ────────────────────────────────────────────────
  {
    id: 'neon-beast',
    name: 'Neon Beast',
    category: 'Streetwear',
    description: 'Dark high-energy streetwear with neon accents',
    image: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=800&q=80',
    color: 'from-purple-600 to-pink-700',
    tags: ['Streetwear', 'Hype', 'Urban'],
    primaryColor: '#a855f7',
    accentColor: '#ec4899',
    storeCount: 503,
    demoProducts: [
      { id: 'p1', name: 'Oversized Hoodie Drop', price: 89, image: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80', category: 'Hoodies', badge: 'Hot' },
      { id: 'p2', name: 'Cargo Pants Vol.3', price: 119, image: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4bae?w=400&q=80', category: 'Bottoms' },
      { id: 'p3', name: 'Graphic Tee SS24', price: 45, image: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&q=80', category: 'Tops', badge: 'Limited' },
      { id: 'p4', name: 'Beanie Neon Tag', price: 35, image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&q=80', category: 'Accessories' },
    ],
  },

  // ── SKINCARE / ORGANIC ────────────────────────────────────────────────────
  {
    id: 'botanica-skin',
    name: 'Botanica',
    category: 'Skincare',
    description: 'Clean organic skincare with warm botanical identity',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',
    color: 'from-green-600 to-emerald-800',
    tags: ['Skincare', 'Organic', 'Natural'],
    primaryColor: '#5a7a52',
    accentColor: '#3d5c35',
    storeCount: 317,
    demoProducts: [
      { id: 'p1', name: 'Green Tea Face Mist', price: 38, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80', category: 'Toner', badge: 'Bestseller' },
      { id: 'p2', name: 'Rosehip Facial Oil', price: 62, image: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=400&q=80', category: 'Serum' },
      { id: 'p3', name: 'Oat Milk Cleanser', price: 29, image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80', category: 'Cleanser', badge: 'New' },
      { id: 'p4', name: 'Clay Detox Mask', price: 44, image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80', category: 'Mask' },
    ],
  },

  // ── FITNESS / BOLD DARK ───────────────────────────────────────────────────
  {
    id: 'forte-fitness',
    name: 'FORTE',
    category: 'Fitness',
    description: 'High-intensity gym equipment and supplements brand',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    color: 'from-red-600 to-orange-700',
    tags: ['Gym', 'Supplements', 'Equipment'],
    primaryColor: '#ef4444',
    accentColor: '#f97316',
    storeCount: 429,
    demoProducts: [
      { id: 'p1', name: 'Whey Protein Pro 2kg', price: 79, image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&q=80', category: 'Supplements', badge: 'Bestseller' },
      { id: 'p2', name: 'Adjustable Dumbbells', price: 249, image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80', category: 'Equipment' },
      { id: 'p3', name: 'Compression Tights', price: 65, image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&q=80', category: 'Apparel', badge: 'New' },
      { id: 'p4', name: 'Resistance Band Set', price: 39, image: 'https://images.unsplash.com/photo-1598289431512-b97b0917afbe?w=400&q=80', category: 'Equipment' },
    ],
  },

  // ── HOME DECOR / MINIMAL ──────────────────────────────────────────────────
  {
    id: 'luminary-home',
    name: 'Luminary',
    category: 'Home & Living',
    description: 'Minimal Scandinavian home decor and lighting',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
    color: 'from-stone-400 to-zinc-600',
    tags: ['Decor', 'Lighting', 'Furniture'],
    primaryColor: '#92816c',
    accentColor: '#6b5c4a',
    storeCount: 182,
    demoProducts: [
      { id: 'p1', name: 'Arc Floor Lamp', price: 245, image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80', category: 'Lighting', badge: 'Popular' },
      { id: 'p2', name: 'Linen Throw Blanket', price: 89, image: 'https://images.unsplash.com/photo-1600369671738-aba5b8fe00e5?w=400&q=80', category: 'Textiles' },
      { id: 'p3', name: 'Walnut Shelf 80cm', price: 179, image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80', category: 'Furniture' },
      { id: 'p4', name: 'Travertine Tray', price: 68, image: 'https://images.unsplash.com/photo-1578500351865-d6c3706f46bc?w=400&q=80', category: 'Decor', badge: 'New' },
    ],
  },

  // ── ARTISAN BAKERY ────────────────────────────────────────────────────────
  {
    id: 'bake-club',
    name: 'Bake Club',
    category: 'Food & Bakery',
    description: 'Warm artisan bakery with rustic cozy character',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    color: 'from-orange-400 to-amber-600',
    tags: ['Bakery', 'Artisan', 'Café'],
    primaryColor: '#d2691e',
    accentColor: '#a0522d',
    storeCount: 139,
    demoProducts: [
      { id: 'p1', name: 'Sourdough Country Loaf', price: 14, image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?w=400&q=80', category: 'Bread', badge: 'Daily Bake' },
      { id: 'p2', name: 'Cinnamon Babka', price: 22, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80', category: 'Pastry' },
      { id: 'p3', name: 'Croissant Box of 6', price: 18, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80', category: 'Pastry', badge: 'Popular' },
      { id: 'p4', name: 'Lemon Tart', price: 9, image: 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=400&q=80', category: 'Cakes' },
    ],
  },

  // ── TECH / APP-LIKE ───────────────────────────────────────────────────────
  {
    id: 'pixel-desk',
    name: 'Pixel Desk',
    category: 'Tech Accessories',
    description: 'Minimal tech accessories with app-inspired dark UI',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80',
    color: 'from-blue-500 to-indigo-700',
    tags: ['Tech', 'Gadgets', 'Desk Setup'],
    primaryColor: '#3b82f6',
    accentColor: '#6366f1',
    storeCount: 376,
    demoProducts: [
      { id: 'p1', name: 'MagSafe Desk Stand', price: 69, image: 'https://images.unsplash.com/photo-1601524909162-ae8725290836?w=400&q=80', category: 'Charging', badge: 'Hot' },
      { id: 'p2', name: 'Keycap Set Pastel', price: 45, image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&q=80', category: 'Keyboard' },
      { id: 'p3', name: 'Monitor Light Bar', price: 89, image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80', category: 'Lighting' },
      { id: 'p4', name: 'USB-C Hub 8-in-1', price: 55, image: 'https://images.unsplash.com/photo-1593642634315-48f5414c3ad9?w=400&q=80', category: 'Accessories', badge: 'New' },
    ],
  },

  // ── OUTDOOR / ADVENTURE ───────────────────────────────────────────────────
  {
    id: 'wanderlust-gear',
    name: 'Wanderlust Gear',
    category: 'Outdoor & Adventure',
    description: 'Rugged outdoor and hiking gear for explorers',
    image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800&q=80',
    color: 'from-green-700 to-stone-800',
    tags: ['Hiking', 'Camping', 'Adventure'],
    primaryColor: '#4a7c59',
    accentColor: '#2d5a3d',
    storeCount: 214,
    demoProducts: [
      { id: 'p1', name: 'Trail Backpack 45L', price: 189, image: 'https://images.unsplash.com/photo-1622260614153-03223fb72052?w=400&q=80', category: 'Bags', badge: 'Bestseller' },
      { id: 'p2', name: 'Merino Wool Base Layer', price: 95, image: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&q=80', category: 'Clothing' },
      { id: 'p3', name: 'Titanium Cook Set', price: 79, image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&q=80', category: 'Camping' },
      { id: 'p4', name: 'Trekking Pole Set', price: 65, image: 'https://images.unsplash.com/photo-1464278533981-50106e6176b1?w=400&q=80', category: 'Hiking', badge: 'Sale' },
    ],
  },

  // ── KIDS / PLAYFUL ────────────────────────────────────────────────────────
  {
    id: 'petite-maison',
    name: 'Petite Maison',
    category: 'Kids & Toys',
    description: 'Colorful educational toys with playful energy',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    color: 'from-yellow-400 to-orange-400',
    tags: ['Toys', 'Educational', 'Kids'],
    primaryColor: '#f59e0b',
    accentColor: '#f97316',
    storeCount: 291,
    demoProducts: [
      { id: 'p1', name: 'Wooden Blocks Set 30pcs', price: 38, image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&q=80', category: 'Building', badge: 'Bestseller' },
      { id: 'p2', name: 'Watercolor Paint Kit', price: 22, image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80', category: 'Art' },
      { id: 'p3', name: 'Plush Bunny 40cm', price: 29, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', category: 'Plush', badge: 'New' },
      { id: 'p4', name: 'Montessori Puzzle Set', price: 45, image: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&q=80', category: 'Puzzles' },
    ],
  },

  // ── DARK FASHION / EDITORIAL ──────────────────────────────────────────────
  {
    id: 'noir-atelier',
    name: 'Noir Atelier',
    category: 'Fashion',
    description: 'Dark cinematic fashion with ZARA-inspired fullscreen layout',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80',
    color: 'from-zinc-700 to-slate-900',
    tags: ['Fashion', 'Editorial', 'Dark'],
    primaryColor: '#e5e5e5',
    accentColor: '#a3a3a3',
    storeCount: 467,
    demoProducts: [
      { id: 'p1', name: 'Double Wool Coat', price: 490, image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400&q=80', category: 'Outerwear', badge: "Editor's Pick" },
      { id: 'p2', name: 'Wide Leg Trousers', price: 210, image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&q=80', category: 'Bottoms' },
      { id: 'p3', name: 'Satin Blouse', price: 175, image: 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80', category: 'Tops', badge: 'New' },
      { id: 'p4', name: 'Leather Ankle Boots', price: 340, image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80', category: 'Shoes' },
    ],
  },

  // ── CAFÉ / TEA / SOFT WARM ────────────────────────────────────────────────
  {
    id: 'sip-bloom',
    name: 'Sip & Bloom',
    category: 'Café & Tea',
    description: 'Soft warm tea & café brand with cozy centered layout',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80',
    color: 'from-rose-300 to-pink-400',
    tags: ['Tea', 'Café', 'Wellness'],
    primaryColor: '#c2856e',
    accentColor: '#a06050',
    storeCount: 158,
    demoProducts: [
      { id: 'p1', name: 'Jasmine Pearl Green Tea', price: 24, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80', category: 'Green Tea', badge: 'Bestseller' },
      { id: 'p2', name: 'Hibiscus Bloom Blend', price: 19, image: 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=400&q=80', category: 'Herbal' },
      { id: 'p3', name: 'Matcha Ceremony Kit', price: 55, image: 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=400&q=80', category: 'Matcha', badge: 'New' },
      { id: 'p4', name: 'Ceramic Tea Set', price: 78, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', category: 'Accessories' },
    ],
  },

  // ── BOOKS / STATIONERY ────────────────────────────────────────────────────
  {
    id: 'page-turner',
    name: 'PageTurner',
    category: 'Books & Stationery',
    description: 'Curated bookstore with clean minimal editorial layout',
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
    color: 'from-slate-500 to-gray-700',
    tags: ['Books', 'Stationery', 'Editorial'],
    primaryColor: '#4a5568',
    accentColor: '#2d3748',
    storeCount: 112,
    demoProducts: [
      { id: 'p1', name: 'Atomic Habits', price: 18, image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80', category: 'Self-Help', badge: 'Bestseller' },
      { id: 'p2', name: 'Linen Hardcover Journal', price: 32, image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80', category: 'Stationery' },
      { id: 'p3', name: 'The Design of Everyday Things', price: 22, image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80', category: 'Design' },
      { id: 'p4', name: 'Brass Bookmark Set', price: 15, image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80', category: 'Accessories', badge: 'New' },
    ],
  },

  // ── PET SUPPLIES ──────────────────────────────────────────────────────────
  {
    id: 'pawsome',
    name: 'Pawsome',
    category: 'Pet Supplies',
    description: 'Fun and colorful pet store with playful masonry layout',
    image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&q=80',
    color: 'from-teal-400 to-cyan-600',
    tags: ['Dogs', 'Cats', 'Pet Care'],
    primaryColor: '#0891b2',
    accentColor: '#0e7490',
    storeCount: 203,
    demoProducts: [
      { id: 'p1', name: 'Grain-Free Dog Food 5kg', price: 48, image: 'https://images.unsplash.com/photo-1589924691995-400dc9eee119?w=400&q=80', category: 'Food', badge: 'Popular' },
      { id: 'p2', name: 'Catnip Toy Bundle', price: 18, image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&q=80', category: 'Toys' },
      { id: 'p3', name: 'Ortho Pet Bed L', price: 85, image: 'https://images.unsplash.com/photo-1601758003122-53c40e686a19?w=400&q=80', category: 'Beds', badge: 'New' },
      { id: 'p4', name: 'Stainless Bowl Set', price: 29, image: 'https://images.unsplash.com/photo-1548767797-d8c844163c4a?w=400&q=80', category: 'Feeding' },
    ],
  },

  // ── ORGANIC FOOD / FARM ───────────────────────────────────────────────────
  {
    id: 'harvest-table',
    name: 'Harvest Table',
    category: 'Organic Food',
    description: 'Farm-fresh organic food with warm earthy identity',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
    color: 'from-lime-600 to-green-700',
    tags: ['Organic', 'Farm Fresh', 'Healthy'],
    primaryColor: '#6b8c3d',
    accentColor: '#4a6428',
    storeCount: 176,
    demoProducts: [
      { id: 'p1', name: 'Raw Forest Honey 500g', price: 26, image: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400&q=80', category: 'Pantry', badge: 'Organic' },
      { id: 'p2', name: 'Cold Press Juice 6-Pack', price: 42, image: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=400&q=80', category: 'Drinks' },
      { id: 'p3', name: 'Granola & Seed Mix', price: 18, image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80', category: 'Breakfast', badge: 'New' },
      { id: 'p4', name: 'Heirloom Spice Set', price: 34, image: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=400&q=80', category: 'Spices' },
    ],
  },

  // ── BEAUTY / MAKEUP ───────────────────────────────────────────────────────
  {
    id: 'glow-lab',
    name: 'Glow Lab',
    category: 'Beauty',
    description: 'Bold makeup brand with Instagram-aesthetic stacked layout',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
    color: 'from-pink-400 to-rose-600',
    tags: ['Makeup', 'Beauty', 'Glow'],
    primaryColor: '#e11d7a',
    accentColor: '#be185d',
    storeCount: 388,
    demoProducts: [
      { id: 'p1', name: 'Dewy Skin Foundation', price: 42, image: 'https://images.unsplash.com/photo-1586495777744-4e6232bf6111?w=400&q=80', category: 'Face', badge: 'Bestseller' },
      { id: 'p2', name: 'Glitter Eyeshadow Palette', price: 55, image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&q=80', category: 'Eyes' },
      { id: 'p3', name: 'Plump Lip Gloss', price: 22, image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80', category: 'Lips', badge: 'New' },
      { id: 'p4', name: 'Setting Spray 100ml', price: 28, image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&q=80', category: 'Face' },
    ],
  },

  // ── COFFEE ────────────────────────────────────────────────────────────────
  {
    id: 'black-roast',
    name: 'Black Roast Co.',
    category: 'Coffee',
    description: 'Premium specialty coffee with dark editorial aesthetic',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    color: 'from-amber-700 to-stone-900',
    tags: ['Coffee', 'Specialty', 'Artisan'],
    primaryColor: '#c47a2b',
    accentColor: '#92540a',
    storeCount: 261,
    demoProducts: [
      { id: 'p1', name: 'Ethiopia Natural 250g', price: 24, image: 'https://images.unsplash.com/photo-1559525839-8f275eef5678?w=400&q=80', category: 'Single Origin', badge: 'Limited' },
      { id: 'p2', name: 'Espresso Blend Dark', price: 19, image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&q=80', category: 'Blends' },
      { id: 'p3', name: 'Fellow Stagg Kettle', price: 179, image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80', category: 'Equipment', badge: 'Popular' },
      { id: 'p4', name: 'Cold Brew Concentrate', price: 32, image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80', category: 'Ready-to-Drink' },
    ],
  },
];

export const businessCategories = [
  { label: 'Fashion', emoji: '👗', prompt: 'Create a modern fashion store for trendy clothing and accessories' },
  { label: 'Beauty', emoji: '💄', prompt: 'Build a clean beauty brand store for skincare and cosmetics products' },
  { label: 'Coffee', emoji: '☕', prompt: 'Create an artisan coffee shop store for premium beans and equipment' },
  { label: 'Electronics', emoji: '💻', prompt: 'Build a tech store for gadgets, accessories and smart home products' },
  { label: 'Furniture', emoji: '🪑', prompt: 'Create a Scandinavian furniture and home decor store' },
  { label: 'Food', emoji: '🥗', prompt: 'Build an organic food marketplace with fresh and healthy products' },
  { label: 'Fitness', emoji: '💪', prompt: 'Create a fitness and sports equipment store for active lifestyles' },
  { label: 'Books', emoji: '📚', prompt: 'Build an online bookstore with curated collections and bestsellers' },
  { label: 'Jewelry', emoji: '💍', prompt: 'Create a luxury jewelry store with fine accessories and gems' },
  { label: 'Toys', emoji: '🧸', prompt: 'Build a fun kids toy store with educational and play products' },
  { label: 'Sports', emoji: '⚽', prompt: 'Create a sports equipment and outdoor gear store' },
  { label: 'Art', emoji: '🎨', prompt: 'Build an online art gallery and prints store' },
  { label: 'Pets', emoji: '🐾', prompt: 'Create a pet supplies store for dogs, cats and other animals' },
  { label: 'Streetwear', emoji: '🧢', prompt: 'Build a hype streetwear brand with bold urban aesthetic' },
  { label: 'Outdoor', emoji: '🏕️', prompt: 'Create an outdoor adventure and hiking gear store' },
  { label: 'Café & Tea', emoji: '🍵', prompt: 'Build a cozy tea and café brand with warm aesthetic' },
];
