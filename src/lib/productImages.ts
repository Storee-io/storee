/**
 * Curated pool of direct Unsplash CDN photo URLs grouped by product category.
 * These are stable `images.unsplash.com/photo-*` URLs — no redirect, no API key,
 * always load. Used by Option-C buildStoreConfig() to assign product images.
 */

const POOLS: Record<string, string[]> = {
  fashion: [
    'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80',
    'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400&q=80',
    'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&q=80',
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80',
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&q=80',
    'https://images.unsplash.com/photo-1571513722275-4b41940f54b8?w=400&q=80',
  ],
  beauty: [
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80',
    'https://images.unsplash.com/photo-1586495777744-4e6232bf6111?w=400&q=80',
    'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80',
    'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&q=80',
    'https://images.unsplash.com/photo-1512207736890-6ffed8a84e8d?w=400&q=80',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80',
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80',
    'https://images.unsplash.com/photo-1631730359585-38a4935cbec3?w=400&q=80',
  ],
  coffee: [
    'https://images.unsplash.com/photo-1559525839-8f275eef5678?w=400&q=80',
    'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80',
    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80',
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&q=80',
    'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=400&q=80',
    'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400&q=80',
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80',
    'https://images.unsplash.com/photo-1572119865084-43c285814d63?w=400&q=80',
    'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&q=80',
  ],
  tea: [
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
    'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=400&q=80',
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80',
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&q=80',
    'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400&q=80',
    'https://images.unsplash.com/photo-1523920290228-4f321a939b4c?w=400&q=80',
    'https://images.unsplash.com/photo-1597481499750-3e6b22637536?w=400&q=80',
    'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&q=80',
  ],
  electronics: [
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
    'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&q=80',
    'https://images.unsplash.com/photo-1601524909162-ae8725290836?w=400&q=80',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&q=80',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
    'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=400&q=80',
  ],
  furniture: [
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80',
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80',
    'https://images.unsplash.com/photo-1578500351865-d6c3706f46bc?w=400&q=80',
    'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80',
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&q=80',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80',
    'https://images.unsplash.com/photo-1532372576444-dda954194ad0?w=400&q=80',
  ],
  food: [
    'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400&q=80',
    'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=400&q=80',
    'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80',
    'https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?w=400&q=80',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
  ],
  fitness: [
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
    'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&q=80',
    'https://images.unsplash.com/photo-1540496905036-5937c10647cc?w=400&q=80',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
    'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400&q=80',
    'https://images.unsplash.com/photo-1544216717-3bbf52512659?w=400&q=80',
    'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80',
  ],
  jewelry: [
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80',
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80',
    'https://images.unsplash.com/photo-1573408301185-9519f94816fc?w=400&q=80',
    'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=400&q=80',
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80',
    'https://images.unsplash.com/photo-1630350065789-4c20e2a88ab0?w=400&q=80',
    'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=400&q=80',
    'https://images.unsplash.com/photo-1561828995-aa79a2db86dd?w=400&q=80',
  ],
  books: [
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80',
    'https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=400&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80',
    'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&q=80',
    'https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=400&q=80',
  ],
  toys: [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&q=80',
    'https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=400&q=80',
    'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&q=80',
    'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&q=80',
    'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&q=80',
    'https://images.unsplash.com/photo-1608889335941-32ac5f2041b9?w=400&q=80',
    'https://images.unsplash.com/photo-1530325553241-4f6e7690cf36?w=400&q=80',
  ],
  pets: [
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80',
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&q=80',
    'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&q=80',
    'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=400&q=80',
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
    'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&q=80',
    'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&q=80',
    'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=400&q=80',
  ],
  art: [
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80',
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
    'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80',
    'https://images.unsplash.com/photo-1527576539890-dfa815648363?w=400&q=80',
  ],
  gaming: [
    'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80',
    'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&q=80',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80',
    'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&q=80',
    'https://images.unsplash.com/photo-1586182987320-4f376d39d787?w=400&q=80',
    'https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=400&q=80',
  ],
  // Neutral lifestyle/product fallback — never shows watches or jewelry
  default: [
    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80',
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&q=80',
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
    'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=400&q=80',
  ],
};

// Keyword → pool key mapping (ordered from most-specific to most-generic)
const KEYWORD_MAP: [string[], string][] = [
  // ── Coffee (very broad — catches all specialty coffee sub-categories) ──────
  [['coffee', 'cafe', 'espresso', 'latte', 'cappuccino', 'americano',
    'brew', 'brewer', 'brewing', 'barista', 'roast', 'roasted', 'roaster',
    'bean', 'beans', 'arabica', 'robusta', 'liberica',
    'single-origin', 'single origin', 'origin', 'yirgacheffe', 'ethiopia',
    'colombia', 'kenya', 'sumatra', 'guatemala', 'peru', 'brazil',
    'washed', 'natural process', 'honey process', 'wet-hulled',
    'grinder', 'grind', 'pour over', 'pourover', 'french press',
    'aeropress', 'moka', 'chemex', 'v60', 'hario', 'comandante',
    'cold brew', 'cold drip', 'specialty', 'third wave',
    'filter coffee', 'drip coffee', 'extraction', 'cupping',
    'decaf', 'blend', 'lot', 'harvest', 'altitude', 'microlot'], 'coffee'],

  // ── Tea ───────────────────────────────────────────────────────────────────
  [['tea', 'matcha', 'oolong', 'chamomile', 'herbal', 'green tea',
    'black tea', 'chai', 'kombucha', 'infusion', 'tisane', 'steep'], 'tea'],

  // ── Fashion ───────────────────────────────────────────────────────────────
  [['fashion', 'cloth', 'clothing', 'apparel', 'wear', 'wearable',
    'dress', 'shirt', 'pants', 'trouser', 'jacket', 'coat', 'hoodie',
    'sneaker', 'shoe', 'boot', 'sandal', 'bag', 'handbag', 'tote',
    'outfit', 'style', 'boutique', 'streetwear', 'denim', 'knit',
    'linen', 'silk', 'cotton tee', 'blouse', 'skirt', 'cardigan'], 'fashion'],

  // ── Beauty / Skincare ─────────────────────────────────────────────────────
  [['beauty', 'skincare', 'skin care', 'cosmetic', 'makeup', 'glow',
    'serum', 'lipstick', 'moisturizer', 'moisturiser', 'perfume',
    'fragrance', 'toner', 'cleanser', 'sunscreen', 'spf', 'retinol',
    'vitamin c', 'hyaluronic', 'collagen', 'mask', 'exfoliant',
    'eye cream', 'foundation', 'blush', 'concealer', 'primer'], 'beauty'],

  // ── Electronics / Tech ───────────────────────────────────────────────────
  [['electronic', 'tech', 'gadget', 'device', 'computer', 'laptop',
    'phone', 'tablet', 'headphone', 'earphone', 'earbud', 'speaker',
    'smartwatch', 'watch', 'wearable', 'drone', 'camera', 'keyboard',
    'mouse', 'monitor', 'charger', 'cable', 'usb', 'wireless',
    'bluetooth', 'wifi', 'router', 'smart home', 'iot', 'vr', 'ar'], 'electronics'],

  // ── Furniture / Home Decor ────────────────────────────────────────────────
  [['furniture', 'sofa', 'couch', 'chair', 'table', 'desk', 'bed',
    'mattress', 'decor', 'decoration', 'lamp', 'rug', 'cushion',
    'shelf', 'shelving', 'cabinet', 'drawer', 'wardrobe', 'interior',
    'home', 'living room', 'bedroom', 'kitchen', 'bathroom',
    'candle', 'vase', 'plant pot', 'mirror', 'frame', 'pillow'], 'furniture'],

  // ── Food / Grocery ───────────────────────────────────────────────────────
  [['food', 'grocery', 'organic', 'snack', 'meal', 'fruit',
    'vegetable', 'bread', 'juice', 'honey', 'spice', 'sauce',
    'condiment', 'pasta', 'rice', 'grain', 'cereal', 'chocolate',
    'candy', 'cookie', 'bakery', 'cheese', 'dairy', 'meat',
    'seafood', 'sushi', 'noodle', 'soup', 'sauce', 'seasoning'], 'food'],

  // ── Fitness / Sports ─────────────────────────────────────────────────────
  [['fitness', 'gym', 'workout', 'exercise', 'sport', 'yoga',
    'pilates', 'dumbbell', 'barbell', 'protein', 'supplement',
    'athletic', 'outdoor', 'running', 'cycling', 'swim',
    'martial art', 'boxing', 'resistance band', 'foam roller',
    'kettlebell', 'weight', 'cardio', 'hiit', 'crossfit'], 'fitness'],

  // ── Jewelry / Accessories ─────────────────────────────────────────────────
  [['jewelry', 'jewellery', 'jewel', 'ring', 'necklace', 'bracelet',
    'earring', 'pendant', 'charm', 'gem', 'gemstone', 'diamond',
    'gold', 'silver', 'platinum', 'pearl', 'crystal', 'luxury accessory',
    'cufflink', 'brooch', 'anklet', 'tiara', 'locket'], 'jewelry'],

  // ── Books / Stationery ───────────────────────────────────────────────────
  [['book', 'novel', 'read', 'reading', 'stationery', 'pen',
    'pencil', 'notebook', 'journal', 'planner', 'diary', 'paper',
    'card', 'print', 'poster', 'zine', 'magazine', 'comic'], 'books'],

  // ── Toys / Kids ──────────────────────────────────────────────────────────
  [['toy', 'kids', 'children', 'child', 'play', 'game', 'toddler',
    'baby', 'puzzle', 'lego', 'plush', 'stuffed', 'doll', 'action figure',
    'board game', 'card game', 'educational', 'learning'], 'toys'],

  // ── Pets ──────────────────────────────────────────────────────────────────
  [['pet', 'dog', 'cat', 'puppy', 'kitten', 'bird', 'fish',
    'hamster', 'rabbit', 'animal', 'paw', 'leash', 'collar',
    'pet food', 'treat', 'grooming', 'vet', 'aquarium'], 'pets'],

  // ── Art / Craft ───────────────────────────────────────────────────────────
  [['art', 'craft', 'paint', 'drawing', 'illustration', 'print',
    'canvas', 'sculpture', 'ceramic', 'pottery', 'handmade',
    'artisan', 'handcraft', 'origami', 'knitting', 'crochet',
    'embroidery', 'woodwork', 'leather', 'calligraphy'], 'art'],

  // ── Gaming ────────────────────────────────────────────────────────────────
  [['gaming', 'gamer', 'game', 'console', 'controller', 'joystick',
    'esport', 'e-sport', 'pc gaming', 'rgb', 'streamer',
    'playstation', 'xbox', 'nintendo', 'steam', 'mmo', 'fps'], 'gaming'],
];

function resolvePool(category: string, productName: string, storeCategory = ''): string[] {
  // Combine all context into one searchable string (lower case)
  const text = `${storeCategory} ${category} ${productName}`.toLowerCase();

  for (const [keywords, pool] of KEYWORD_MAP) {
    if (keywords.some(kw => text.includes(kw))) return POOLS[pool];
  }
  return POOLS.default;
}

/**
 * Returns a stable Unsplash CDN image URL for a product.
 * Same product name always maps to the same image index within its pool.
 *
 * @param productName  individual product name from Claude
 * @param category     product-level category from Claude
 * @param storeCategory store-level category (e.g. "Coffee", "Jewelry") — used as extra context
 */
export function getProductImage(productName: string, category: string, storeCategory = ''): string {
  const pool = resolvePool(category, productName, storeCategory);
  // Deterministic index from product name hash
  const idx = productName
    .split('')
    .reduce((acc, c) => ((acc * 31 + c.charCodeAt(0)) & 0xffff), 0) % pool.length;
  return pool[idx];
}
