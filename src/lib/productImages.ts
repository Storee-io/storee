/**
 * Curated pool of direct Unsplash CDN photo URLs grouped by product category.
 * These are stable `images.unsplash.com/photo-*` URLs — no redirect, no API key,
 * always load. Used by Option-C buildStoreConfig() to assign product images.
 */

const POOLS: Record<string, string[]> = {
  // ── Fashion / Apparel ────────────────────────────────────────────────────
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

  // ── Beauty / Skincare ─────────────────────────────────────────────────────
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

  // ── Coffee ────────────────────────────────────────────────────────────────
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

  // ── Tea ───────────────────────────────────────────────────────────────────
  tea: [
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
    'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=400&q=80',
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&q=80',
    'https://images.unsplash.com/photo-1523920290228-4f321a939b4c?w=400&q=80',
    'https://images.unsplash.com/photo-1597481499750-3e6b22637536?w=400&q=80',
    'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&q=80',
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80',
    'https://images.unsplash.com/photo-1490885578174-acda8905c2c6?w=400&q=80',
  ],

  // ── Electronics / Tech ───────────────────────────────────────────────────
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

  // ── Lighting — lamps, pendants, chandeliers ───────────────────────────────
  lighting: [
    'https://images.unsplash.com/photo-1513506003901-1e6a35f9e5f9?w=400&q=80',
    'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=400&q=80',
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80',
    'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=400&q=80',
    'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=400&q=80',
    'https://images.unsplash.com/photo-1565183997392-2f6f122e5912?w=400&q=80',
    'https://images.unsplash.com/photo-1558618047-f4e60cba3de1?w=400&q=80',
    'https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=400&q=80',
  ],

  // ── Textiles — blankets, throws, pillows, rugs ────────────────────────────
  textiles: [
    'https://images.unsplash.com/photo-1584185122522-b6227ee21b9d?w=400&q=80',
    'https://images.unsplash.com/photo-1631049552240-59c37f38802b?w=400&q=80',
    'https://images.unsplash.com/photo-1567225557594-88d73e55f2cb?w=400&q=80',
    'https://images.unsplash.com/photo-1578898887932-dce23a595ad4?w=400&q=80',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&q=80',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&q=80',
  ],

  // ── Seating — sofas, chairs, armchairs, stools ───────────────────────────
  seating: [
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
    'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&q=80',
    'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&q=80',
    'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&q=80',
    'https://images.unsplash.com/photo-1550254478-ead40cc54513?w=400&q=80',
    'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400&q=80',
  ],

  // ── Storage — shelves, cabinets, bookcases ────────────────────────────────
  storage: [
    'https://images.unsplash.com/photo-1532372576444-dda954194ad0?w=400&q=80',
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&q=80',
    'https://images.unsplash.com/photo-1578500351865-d6c3706f46bc?w=400&q=80',
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&q=80',
    'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=400&q=80',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=400&q=80',
    'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=400&q=80',
    'https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=400&q=80',
  ],

  // ── Tables — dining, coffee, desk tables ─────────────────────────────────
  tables: [
    'https://images.unsplash.com/photo-1549187774-b4e9b0445b41?w=400&q=80',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
    'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400&q=80',
    'https://images.unsplash.com/photo-1561060404-61df4e7d3c11?w=400&q=80',
    'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=400&q=80',
    'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400&q=80',
    'https://images.unsplash.com/photo-1551298370-9d3d53740c72?w=400&q=80',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80',
  ],

  // ── Home Decor — candles, vases, wall art, plants ────────────────────────
  decor: [
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80',
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80',
    'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&q=80',
    'https://images.unsplash.com/photo-1520209759809-a9bcb6cb3241?w=400&q=80',
    'https://images.unsplash.com/photo-1602714318985-8c7ff7b29f80?w=400&q=80',
    'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&q=80',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80',
    'https://images.unsplash.com/photo-1463320726281-696a485928c7?w=400&q=80',
  ],

  // ── General Furniture — room scenes, interior (fallback for home stores) ──
  furniture: [
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80',
    'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80',
    'https://images.unsplash.com/photo-1532372576444-dda954194ad0?w=400&q=80',
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&q=80',
    'https://images.unsplash.com/photo-1578500351865-d6c3706f46bc?w=400&q=80',
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80',
  ],

  // ── Food / Grocery ────────────────────────────────────────────────────────
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

  // ── Fitness / Sports ─────────────────────────────────────────────────────
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

  // ── Jewelry / Accessories ─────────────────────────────────────────────────
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

  // ── Books / Stationery ────────────────────────────────────────────────────
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

  // ── Toys / Kids ───────────────────────────────────────────────────────────
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

  // ── Pets ──────────────────────────────────────────────────────────────────
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

  // ── Art / Craft ───────────────────────────────────────────────────────────
  art: [
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80',
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&q=80',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
    'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80',
    'https://images.unsplash.com/photo-1527576539890-dfa815648363?w=400&q=80',
    'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=400&q=80',
  ],

  // ── Gaming ────────────────────────────────────────────────────────────────
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

  // ── Neutral fallback — shopping/retail lifestyle, no specific category ────
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

// ── Keyword → pool key (most-specific first) ─────────────────────────────────
const KEYWORD_MAP: [string[], string][] = [

  // ── Lighting — checked BEFORE generic furniture ───────────────────────────
  [['light', 'lighting', 'lamp', 'pendant', 'chandelier', 'lantern',
    'sconce', 'spotlight', 'downlight', 'floor lamp', 'table lamp',
    'desk lamp', 'wall light', 'ceiling light', 'bulb', 'led',
    'neon', 'luminary', 'luminaire', 'fixture'], 'lighting'],

  // ── Textiles / Soft furnishings — checked BEFORE generic furniture ────────
  [['textile', 'fabric', 'blanket', 'throw', 'quilt', 'duvet',
    'pillow', 'cushion', 'rug', 'carpet', 'mat', 'curtain',
    'drape', 'linen', 'wool', 'cotton', 'cashmere', 'velvet',
    'bedding', 'bed sheet', 'comforter', 'towel', 'knit',
    'woven', 'tapestry', 'upholstery'], 'textiles'],

  // ── Seating — checked BEFORE generic furniture ────────────────────────────
  [['sofa', 'couch', 'chair', 'armchair', 'stool', 'bench',
    'recliner', 'lounge', 'sectional', 'loveseat', 'ottoman',
    'pouf', 'seat', 'seating', 'dining chair', 'office chair',
    'bar stool', 'chaise', 'wingback'], 'seating'],

  // ── Storage / Shelving — checked BEFORE generic furniture ─────────────────
  [['shelf', 'shelve', 'shelving', 'bookshelf', 'bookcase', 'cabinet',
    'drawer', 'wardrobe', 'closet', 'rack', 'organizer', 'storage',
    'sideboard', 'credenza', 'dresser', 'chest', 'trunk',
    'floating shelf', 'wall shelf', 'display case'], 'storage'],

  // ── Tables ────────────────────────────────────────────────────────────────
  [['table', 'dining table', 'coffee table', 'side table', 'end table',
    'console table', 'desk', 'nightstand', 'bedside', 'work table',
    'countertop', 'kitchen island', 'bar'], 'tables'],

  // ── Home Decor / Plants / Accessories ────────────────────────────────────
  [['decor', 'decoration', 'candle', 'vase', 'pot', 'planter',
    'plant', 'succulent', 'indoor plant', 'flower', 'frame',
    'mirror', 'clock', 'sculpture', 'figurine', 'ceramic',
    'porcelain', 'tray', 'basket', 'wall art', 'print', 'poster'], 'decor'],

  // ── General furniture fallback ────────────────────────────────────────────
  [['furniture', 'interior', 'home', 'living room', 'bedroom',
    'kitchen', 'bathroom', 'office', 'scandinavian', 'minimalist',
    'modern home', 'nordic', 'oak', 'walnut', 'pine', 'ash wood',
    'solid wood', 'plywood', 'mdf', 'rattan', 'wicker'], 'furniture'],

  // ── Coffee (very broad) ───────────────────────────────────────────────────
  [['coffee', 'cafe', 'espresso', 'latte', 'cappuccino', 'americano',
    'brew', 'brewer', 'brewing', 'barista', 'roast', 'roasted', 'roaster',
    'bean', 'beans', 'arabica', 'robusta', 'single-origin', 'single origin',
    'origin', 'yirgacheffe', 'ethiopia', 'colombia', 'kenya', 'sumatra',
    'guatemala', 'washed', 'natural process', 'honey process',
    'grinder', 'grind', 'pour over', 'pourover', 'french press',
    'aeropress', 'moka', 'chemex', 'v60', 'hario', 'comandante',
    'cold brew', 'specialty', 'filter coffee', 'drip coffee',
    'extraction', 'cupping', 'decaf', 'microlot'], 'coffee'],

  // ── Tea ───────────────────────────────────────────────────────────────────
  [['tea', 'matcha', 'oolong', 'chamomile', 'herbal', 'green tea',
    'black tea', 'chai', 'kombucha', 'infusion', 'tisane', 'steep',
    'teapot', 'teacup', 'loose leaf'], 'tea'],

  // ── Fashion ───────────────────────────────────────────────────────────────
  [['fashion', 'cloth', 'clothing', 'apparel', 'wear', 'dress',
    'shirt', 't-shirt', 'tee', 'pants', 'trouser', 'jeans', 'denim',
    'jacket', 'coat', 'hoodie', 'sweater', 'sneaker', 'shoe', 'boot',
    'bag', 'handbag', 'tote', 'backpack', 'outfit', 'style',
    'boutique', 'streetwear', 'blouse', 'skirt', 'cardigan',
    'sweatshirt', 'tracksuit', 'sportswear'], 'fashion'],

  // ── Beauty / Skincare ─────────────────────────────────────────────────────
  [['beauty', 'skincare', 'skin care', 'cosmetic', 'makeup', 'glow',
    'serum', 'lipstick', 'moisturizer', 'perfume', 'fragrance',
    'toner', 'cleanser', 'sunscreen', 'spf', 'retinol',
    'hyaluronic', 'collagen', 'mask', 'exfoliant', 'essence',
    'foundation', 'blush', 'concealer', 'primer', 'eyeshadow'], 'beauty'],

  // ── Electronics / Tech ───────────────────────────────────────────────────
  [['electronic', 'tech', 'gadget', 'device', 'computer', 'laptop',
    'phone', 'tablet', 'headphone', 'earphone', 'earbud', 'speaker',
    'smartwatch', 'watch', 'drone', 'camera', 'keyboard', 'mouse',
    'monitor', 'charger', 'cable', 'usb', 'wireless', 'bluetooth',
    'wifi', 'router', 'smart home', 'vr', 'ar', 'gaming pc'], 'electronics'],

  // ── Food / Grocery ───────────────────────────────────────────────────────
  [['food', 'grocery', 'organic', 'snack', 'meal', 'fruit',
    'vegetable', 'bread', 'juice', 'honey', 'spice', 'sauce',
    'condiment', 'pasta', 'rice', 'grain', 'cereal', 'chocolate',
    'candy', 'cookie', 'bakery', 'cheese', 'dairy', 'meat',
    'seafood', 'seasoning', 'oil', 'vinegar', 'jam', 'preserve'], 'food'],

  // ── Fitness / Sports ─────────────────────────────────────────────────────
  [['fitness', 'gym', 'workout', 'exercise', 'sport', 'yoga',
    'pilates', 'dumbbell', 'barbell', 'protein', 'supplement',
    'athletic', 'outdoor', 'running', 'cycling', 'swim',
    'boxing', 'resistance band', 'foam roller', 'kettlebell',
    'weight', 'cardio', 'hiit', 'crossfit', 'activewear'], 'fitness'],

  // ── Jewelry / Accessories ─────────────────────────────────────────────────
  [['jewelry', 'jewellery', 'jewel', 'ring', 'necklace', 'bracelet',
    'earring', 'pendant', 'charm', 'gem', 'gemstone', 'diamond',
    'gold', 'silver', 'platinum', 'pearl', 'crystal',
    'cufflink', 'brooch', 'anklet', 'tiara', 'locket'], 'jewelry'],

  // ── Books / Stationery ───────────────────────────────────────────────────
  [['book', 'novel', 'reading', 'stationery', 'pen', 'pencil',
    'notebook', 'journal', 'planner', 'diary', 'paper',
    'zine', 'magazine', 'comic', 'calligraphy'], 'books'],

  // ── Toys / Kids ──────────────────────────────────────────────────────────
  [['toy', 'kids', 'children', 'child', 'play', 'game', 'toddler',
    'baby', 'puzzle', 'lego', 'plush', 'stuffed', 'doll',
    'action figure', 'board game', 'educational'], 'toys'],

  // ── Pets ──────────────────────────────────────────────────────────────────
  [['pet', 'dog', 'cat', 'puppy', 'kitten', 'bird', 'fish',
    'hamster', 'rabbit', 'animal', 'paw', 'leash', 'collar',
    'pet food', 'treat', 'grooming', 'aquarium'], 'pets'],

  // ── Art / Craft ───────────────────────────────────────────────────────────
  [['art', 'craft', 'paint', 'drawing', 'illustration', 'canvas',
    'sculpture', 'ceramic', 'pottery', 'handmade', 'artisan',
    'origami', 'knitting', 'crochet', 'embroidery', 'woodwork',
    'leather', 'watercolor', 'acrylic', 'oil painting'], 'art'],

  // ── Gaming ────────────────────────────────────────────────────────────────
  [['gaming', 'gamer', 'console', 'controller', 'joystick',
    'esport', 'rgb', 'streamer', 'playstation', 'xbox',
    'nintendo', 'steam', 'mmo', 'fps', 'rpg'], 'gaming'],
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
 * @param productName   individual product name from Claude
 * @param category      product-level category (e.g. "Lighting", "Textiles")
 * @param storeCategory store-level category (e.g. "Furniture", "Coffee") — extra context
 */
export function getProductImage(productName: string, category: string, storeCategory = ''): string {
  const pool = resolvePool(category, productName, storeCategory);
  // Deterministic index from product name hash
  const idx = productName
    .split('')
    .reduce((acc, c) => ((acc * 31 + c.charCodeAt(0)) & 0xffff), 0) % pool.length;
  return pool[idx];
}
