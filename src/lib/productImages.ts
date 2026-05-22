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
  // Generic fallback — works for any unrecognised category
  default: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
    'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80',
    'https://images.unsplash.com/photo-1559525839-8f275eef5678?w=400&q=80',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
    'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400&q=80',
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
  ],
};

// Keyword → pool key mapping
const KEYWORD_MAP: [string[], string][] = [
  [['fashion', 'cloth', 'apparel', 'wear', 'dress', 'shirt', 'pants', 'shoe', 'bag', 'outfit', 'style', 'boutique', 'streetwear'], 'fashion'],
  [['beauty', 'skincare', 'cosmetic', 'makeup', 'glow', 'serum', 'lipstick', 'moisturizer', 'perfume', 'fragrance'], 'beauty'],
  [['coffee', 'cafe', 'brew', 'espresso', 'latte', 'tea', 'beverage', 'drink', 'barista'], 'coffee'],
  [['electronic', 'tech', 'gadget', 'device', 'computer', 'phone', 'laptop', 'tablet', 'headphone', 'earphone', 'watch', 'smart'], 'electronics'],
  [['furniture', 'sofa', 'chair', 'table', 'decor', 'lamp', 'rug', 'cushion', 'shelf', 'interior', 'home', 'living'], 'furniture'],
  [['food', 'grocery', 'organic', 'snack', 'meal', 'fruit', 'vegetable', 'bread', 'juice', 'honey', 'spice', 'sauce'], 'food'],
  [['fitness', 'gym', 'workout', 'exercise', 'sport', 'yoga', 'dumbbell', 'protein', 'supplement', 'athletic', 'outdoor'], 'fitness'],
  [['jewelry', 'jewel', 'ring', 'necklace', 'bracelet', 'earring', 'gem', 'diamond', 'gold', 'silver', 'luxury'], 'jewelry'],
  [['book', 'novel', 'read', 'stationery', 'pen', 'notebook', 'journal'], 'books'],
  [['toy', 'kids', 'children', 'play', 'game', 'toddler', 'baby', 'puzzle'], 'toys'],
];

function resolvePool(category: string, productName: string): string[] {
  const text = `${category} ${productName}`.toLowerCase();
  for (const [keywords, pool] of KEYWORD_MAP) {
    if (keywords.some(kw => text.includes(kw))) return POOLS[pool];
  }
  return POOLS.default;
}

/**
 * Returns a stable Unsplash CDN image URL for a product.
 * Same product name always maps to the same image index within its pool.
 */
export function getProductImage(productName: string, category: string): string {
  const pool = resolvePool(category, productName);
  // Deterministic index from product name hash
  const idx = productName
    .split('')
    .reduce((acc, c) => ((acc * 31 + c.charCodeAt(0)) & 0xffff), 0) % pool.length;
  return pool[idx];
}
