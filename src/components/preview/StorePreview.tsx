'use client';

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, Reorder } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { ShoppingCart, Heart, Star, Search, ArrowRight, Menu, ArrowLeft, Check, Copy, MessageCircle, MapPin, Phone, Mail, ChevronDown, User, LogOut, Package, Eye, EyeOff, Trash2, Plus, X,
  // EmojiIcon pool
  Wrench, Truck, Shield, Lock, Trophy, Award, Medal, Leaf, Sprout, Zap, Battery, Rocket,
  Flame, DollarSign, TrendingUp, BarChart2, Target, Clock, Smartphone, Laptop, Monitor,
  Palette, Lightbulb, Sparkles, CheckCircle, Globe, Gift, Key, Smile, Users, Home, Car,
  Plane, Moon, Sun, Snowflake, Music, Coffee, Gem, Dumbbell, Activity, Flower2, ThumbsUp,
  GraduationCap, Bell, ClipboardList, Utensils, RefreshCw, HelpCircle, AlertCircle,
  Settings, Hammer, ShieldCheck, Music2, Brain, Handshake, BookOpen, Layers, Wand2, Crown,
  Wheat, Droplets, Wind, Thermometer, Camera, Video, Image, FileText, PenTool, Scissors,
  Brush, Paintbrush, Feather, Compass, Navigation, Map, Globe2, Trees, Mountain, Waves,
  Anchor, Ship, Bus, Bike, Headphones, Mic, Radio, Tv, Watch, Ruler, Calculator, Briefcase,
  Building, Store as StoreIcon, ShoppingBag, CreditCard, Banknote, Coins, Timer,
} from 'lucide-react';
import type { Store, ShippingSettings, ShippingMethod, PaymentSettings, PaymentMethod } from '../../context/StoreContext';
import { DEFAULT_SHIPPING_METHODS, DEFAULT_PAYMENT_METHODS } from '../../context/StoreContext';
import type { StoreDesign, RichProduct, DesignSystem, DesignTokens } from '../../lib/claudeApi';
import { makePriceFmt } from '../../lib/formatCurrency';
import { supabase } from '../../lib/supabase';
import { useCart, type CartItem } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

// ── Field position context for drag-to-move ────────────────────────────────────
type FieldOffsetMap = Record<string, { x: number; y: number }>;

interface FieldPositionContextType {
  fieldOffsets?: FieldOffsetMap;
  onFieldPositionChange?: (field: string, offset: { x: number; y: number }) => void;
  onArrayReorder?: (field: string, newItems: unknown[]) => void;
}

const FieldPositionContext = React.createContext<FieldPositionContextType>({});

function useFieldPosition() {
  return React.useContext(FieldPositionContext);
}

// ── Clipboard helper (works in non-secure / iframe contexts) ─────────────────
function safeClipboardWrite(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => execCommandCopy(text));
  } else {
    execCommandCopy(text);
  }
}
function execCommandCopy(text: string) {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  } catch { /* silent */ }
}

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

// ── Store feature flags & UI translations ─────────────────────────────────────
interface UiT {
  subtotal: string; checkout: string; viewCart: string; startShopping: string;
  shippingNote: string; continueShopping: string; cartEmpty: string;
  orderSummary: string; shipping: string; calcAtCheckout: string;
  promo: string; appliedAtCheckout: string; total: string;
  proceedCheckout: string; secureNote: string; addMoreItems: string;
  orderReceived: string; thankYou: string; orderNum: string;
  addToCart: string; addedToCart: string;
  availability: string; inStock: string; delivery: string;
  deliveryDays: string; returns: string; freeReturns: string;
  yourWishlist: string; wishlistEmpty: string;
  paymentInstructions: string; back: string; remove: string;
}

const UI_T: Record<string, UiT> = {
  en: { subtotal:'Subtotal', checkout:'Checkout →', viewCart:'View Full Cart', startShopping:'Start Shopping', shippingNote:'Shipping & discounts calculated at checkout', continueShopping:'Continue Shopping', cartEmpty:'Your cart is empty', orderSummary:'Order Summary', shipping:'Shipping', calcAtCheckout:'Calculated at checkout', promo:'Promo', appliedAtCheckout:'Applied at checkout', total:'Total', proceedCheckout:'Proceed to Checkout →', secureNote:'🔒 Secure & protected transaction', addMoreItems:'Add more items', orderReceived:'Order Received! 🎉', thankYou:'Thank you for shopping at', orderNum:'Order #:', addToCart:'Add to Cart', addedToCart:'✓ Added to Cart!', availability:'Availability', inStock:'In Stock', delivery:'Delivery', deliveryDays:'2–4 business days', returns:'Returns', freeReturns:'Free 30-day returns', yourWishlist:'Your Wishlist', wishlistEmpty:'Your wishlist is empty', paymentInstructions:'Payment Instructions', back:'Back', remove:'Remove' },
  id: { subtotal:'Subtotal', checkout:'Checkout →', viewCart:'Lihat Keranjang', startShopping:'Mulai Belanja', shippingNote:'Ongkos kirim & diskon dihitung saat checkout', continueShopping:'Lanjut Belanja', cartEmpty:'Keranjang Anda kosong', orderSummary:'Ringkasan Pesanan', shipping:'Ongkos Kirim', calcAtCheckout:'Dihitung saat checkout', promo:'Promo', appliedAtCheckout:'Diterapkan saat checkout', total:'Total', proceedCheckout:'Lanjut ke Pembayaran →', secureNote:'🔒 Transaksi aman & terlindungi', addMoreItems:'Tambah produk', orderReceived:'Pesanan Diterima! 🎉', thankYou:'Terima kasih sudah belanja di', orderNum:'No. Pesanan:', addToCart:'Tambah ke Keranjang', addedToCart:'✓ Ditambahkan!', availability:'Ketersediaan', inStock:'Tersedia', delivery:'Pengiriman', deliveryDays:'2–4 hari kerja', returns:'Pengembalian', freeReturns:'Gratis 30 hari', yourWishlist:'Wishlist Saya', wishlistEmpty:'Wishlist Anda kosong', paymentInstructions:'Instruksi Pembayaran', back:'Kembali', remove:'Hapus' },
  es: { subtotal:'Subtotal', checkout:'Pagar →', viewCart:'Ver Carrito', startShopping:'Empezar a Comprar', shippingNote:'Envío y descuentos calculados al pagar', continueShopping:'Seguir Comprando', cartEmpty:'Tu carrito está vacío', orderSummary:'Resumen del Pedido', shipping:'Envío', calcAtCheckout:'Calculado al pagar', promo:'Promo', appliedAtCheckout:'Aplicado al pagar', total:'Total', proceedCheckout:'Proceder al Pago →', secureNote:'🔒 Transacción segura y protegida', addMoreItems:'Agregar más productos', orderReceived:'¡Pedido Recibido! 🎉', thankYou:'Gracias por comprar en', orderNum:'Pedido #:', addToCart:'Agregar al Carrito', addedToCart:'✓ ¡Agregado!', availability:'Disponibilidad', inStock:'En Stock', delivery:'Entrega', deliveryDays:'2–4 días hábiles', returns:'Devoluciones', freeReturns:'30 días gratis', yourWishlist:'Tu Lista de Deseos', wishlistEmpty:'Tu lista de deseos está vacía', paymentInstructions:'Instrucciones de Pago', back:'Volver', remove:'Eliminar' },
  fr: { subtotal:'Sous-total', checkout:'Commander →', viewCart:'Voir le Panier', startShopping:'Commencer les Achats', shippingNote:'Livraison & réductions calculées à la caisse', continueShopping:'Continuer les Achats', cartEmpty:'Votre panier est vide', orderSummary:'Récapitulatif de la Commande', shipping:'Livraison', calcAtCheckout:'Calculé à la caisse', promo:'Promo', appliedAtCheckout:'Appliqué à la caisse', total:'Total', proceedCheckout:'Procéder au Paiement →', secureNote:'🔒 Transaction sécurisée', addMoreItems:'Ajouter des articles', orderReceived:'Commande Reçue ! 🎉', thankYou:'Merci de votre achat chez', orderNum:'Commande n° :', addToCart:'Ajouter au Panier', addedToCart:'✓ Ajouté !', availability:'Disponibilité', inStock:'En Stock', delivery:'Livraison', deliveryDays:'2–4 jours ouvrés', returns:'Retours', freeReturns:'30 jours gratuits', yourWishlist:'Ma Liste de Souhaits', wishlistEmpty:'Votre liste est vide', paymentInstructions:'Instructions de Paiement', back:'Retour', remove:'Supprimer' },
  de: { subtotal:'Zwischensumme', checkout:'Zur Kasse →', viewCart:'Warenkorb anzeigen', startShopping:'Einkaufen', shippingNote:'Versand & Rabatte werden an der Kasse berechnet', continueShopping:'Weiter Einkaufen', cartEmpty:'Ihr Warenkorb ist leer', orderSummary:'Bestellübersicht', shipping:'Versand', calcAtCheckout:'An der Kasse berechnet', promo:'Promo', appliedAtCheckout:'An der Kasse angewendet', total:'Gesamt', proceedCheckout:'Zur Kasse →', secureNote:'🔒 Sichere & geschützte Transaktion', addMoreItems:'Mehr Artikel hinzufügen', orderReceived:'Bestellung eingegangen! 🎉', thankYou:'Vielen Dank für Ihren Einkauf bei', orderNum:'Bestellung Nr.:', addToCart:'In den Warenkorb', addedToCart:'✓ Hinzugefügt!', availability:'Verfügbarkeit', inStock:'Auf Lager', delivery:'Lieferung', deliveryDays:'2–4 Werktage', returns:'Rückgabe', freeReturns:'30 Tage kostenlos', yourWishlist:'Meine Wunschliste', wishlistEmpty:'Ihre Wunschliste ist leer', paymentInstructions:'Zahlungsanweisungen', back:'Zurück', remove:'Entfernen' },
  ja: { subtotal:'小計', checkout:'購入手続きへ →', viewCart:'カートを見る', startShopping:'買い物を始める', shippingNote:'送料・割引はチェックアウト時に計算されます', continueShopping:'買い物を続ける', cartEmpty:'カートは空です', orderSummary:'注文サマリー', shipping:'配送料', calcAtCheckout:'チェックアウト時に計算', promo:'プロモ', appliedAtCheckout:'チェックアウト時に適用', total:'合計', proceedCheckout:'お支払いへ →', secureNote:'🔒 安全・保護された取引', addMoreItems:'商品を追加', orderReceived:'ご注文を受け付けました！ 🎉', thankYou:'でのお買い物ありがとうございます', orderNum:'注文番号：', addToCart:'カートに追加', addedToCart:'✓ 追加しました！', availability:'在庫状況', inStock:'在庫あり', delivery:'配送', deliveryDays:'2〜4営業日', returns:'返品', freeReturns:'30日間無料', yourWishlist:'ウィッシュリスト', wishlistEmpty:'ウィッシュリストは空です', paymentInstructions:'お支払い方法', back:'戻る', remove:'削除' },
  ko: { subtotal:'소계', checkout:'결제하기 →', viewCart:'장바구니 보기', startShopping:'쇼핑 시작', shippingNote:'배송비 및 할인은 결제 시 계산됩니다', continueShopping:'쇼핑 계속하기', cartEmpty:'장바구니가 비어 있습니다', orderSummary:'주문 요약', shipping:'배송비', calcAtCheckout:'결제 시 계산', promo:'프로모', appliedAtCheckout:'결제 시 적용', total:'합계', proceedCheckout:'결제 진행 →', secureNote:'🔒 안전하고 보호된 거래', addMoreItems:'상품 더 추가', orderReceived:'주문이 접수되었습니다! 🎉', thankYou:'에서 구매해 주셔서 감사합니다', orderNum:'주문번호:', addToCart:'장바구니에 추가', addedToCart:'✓ 추가되었습니다!', availability:'재고 현황', inStock:'재고 있음', delivery:'배송', deliveryDays:'2–4 영업일', returns:'반품', freeReturns:'30일 무료', yourWishlist:'위시리스트', wishlistEmpty:'위시리스트가 비어 있습니다', paymentInstructions:'결제 안내', back:'뒤로', remove:'삭제' },
  zh: { subtotal:'小计', checkout:'去结账 →', viewCart:'查看购物车', startShopping:'开始购物', shippingNote:'运费和折扣将在结账时计算', continueShopping:'继续购物', cartEmpty:'您的购物车是空的', orderSummary:'订单摘要', shipping:'运费', calcAtCheckout:'结账时计算', promo:'优惠', appliedAtCheckout:'结账时应用', total:'总计', proceedCheckout:'去付款 →', secureNote:'🔒 安全受保护的交易', addMoreItems:'添加更多商品', orderReceived:'订单已收到！ 🎉', thankYou:'感谢您在以下地方购物：', orderNum:'订单号：', addToCart:'加入购物车', addedToCart:'✓ 已添加！', availability:'库存状态', inStock:'有货', delivery:'配送', deliveryDays:'2–4个工作日', returns:'退货', freeReturns:'30天免费退货', yourWishlist:'我的心愿单', wishlistEmpty:'心愿单是空的', paymentInstructions:'付款说明', back:'返回', remove:'删除' },
};

const LANG_CODE_MAP: Record<string, string> = {
  'English': 'en', 'Bahasa Indonesia': 'id', 'Español': 'es',
  'Français': 'fr', 'Deutsch': 'de', '日本語': 'ja', '한국어': 'ko', '中文': 'zh',
};

interface StoreFlags {
  showWishlist: boolean;
  showReviews: boolean;
  uiT: UiT;
}

const EN_FLAGS: StoreFlags = { showWishlist: true, showReviews: true, uiT: UI_T.en };
const StoreFlagsCtx = React.createContext<StoreFlags>(EN_FLAGS);
const useStoreFlags = () => React.useContext(StoreFlagsCtx);

// ── Emoji → Lucide icon mapping ───────────────────────────────────────────────
// Maps the emoji strings Claude generates in features/trustBadges/stats
// to crisp SVG Lucide icons. Falls back to emoji text if no match found.

type LucideComp = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; className?: string }>;

const EMOJI_ICON_MAP: Record<string, LucideComp> = {
  // Tools & Build
  '🔧': Wrench,   '🔩': Wrench,   '⚙️': Settings,  '🛠️': Hammer,   '🪛': Wrench,
  // Shipping & Delivery
  '🚚': Truck,    '🚛': Truck,    '📦': Package,   '🚜': Truck,
  // Security & Trust
  '🛡️': Shield,  '🔒': Lock,     '🔐': Lock,      '✅': ShieldCheck, '🔓': ShieldCheck,
  // Quality & Awards
  '⭐': Star,     '🌟': Star,     '🏆': Trophy,    '🥇': Medal,     '🎖️': Award,    '🏅': Award,
  // Nature & Organic
  '🌿': Leaf,     '🌱': Sprout,   '🍃': Leaf,      '🌾': Wheat,     '🌲': Trees,    '🌳': Trees,
  '🌻': Sun,      '🌺': Flower2,  '🌸': Flower2,
  // Energy & Performance
  '⚡': Zap,      '🔋': Battery,  '🚀': Rocket,    '🔥': Flame,
  // Money & Finance
  '💰': Coins,    '💵': DollarSign, '💳': CreditCard, '💴': Banknote, '💶': Banknote,
  // Data & Analytics
  '📈': TrendingUp, '📊': BarChart2, '🎯': Target,
  // Communication
  '💬': MessageCircle, '📞': Phone, '☎️': Phone, '✉️': Mail, '📧': Mail, '📢': Mic,
  // Time
  '⏰': Clock,    '🕐': Clock,    '⌚': Watch,     '⏱️': Timer,
  // Technology
  '📱': Smartphone, '💻': Laptop, '🖥️': Monitor,  '📺': Tv,       '📷': Camera,   '🎬': Video,
  '🎧': Headphones, '🎤': Mic,    '📻': Radio,
  // Creative & Design
  '🎨': Palette,  '💡': Lightbulb, '✨': Sparkles, '🪄': Wand2,   '🖌️': Paintbrush, '✏️': PenTool,
  '✂️': Scissors, '🪶': Feather,
  // Love & Wellness
  '❤️': Heart,   '💙': Heart,    '💚': Heart,    '💜': Heart,    '🧡': Heart,    '🤍': Heart,
  '😊': Smile,   '😍': Heart,    '🧘': Activity,  '🏋️': Dumbbell, '💪': Dumbbell,
  // People & Social
  '👤': User,    '👥': Users,    '🤝': Handshake, '👍': ThumbsUp,
  // Navigation & Location
  '🌍': Globe,   '🌎': Globe,    '🌏': Globe2,   '📍': MapPin,   '🗺️': Map,
  '🧭': Compass,
  // Home & Life
  '🏠': Home,    '🏡': Home,     '🏗️': Building, '🏪': StoreIcon,
  // Transport
  '🚗': Car,     '🚙': Car,      '✈️': Plane,    '🚢': Ship,     '⚓': Anchor,
  '🚌': Bus,     '🚲': Bike,
  // Weather & Nature elements
  '🌙': Moon,    '☀️': Sun,      '❄️': Snowflake, '💧': Droplets, '🌊': Waves,
  '💨': Wind,    '🌡️': Thermometer, '⛰️': Mountain,
  // Music & Entertainment
  '🎵': Music,   '🎶': Music2,   '🎸': Music,    '🥁': Music2,
  // Food & Drink
  '☕': Coffee,  '🍵': Coffee,   '🍽️': Utensils, '🍴': Utensils,
  // Luxury & Special
  '💎': Gem,     '👑': Crown,    '🎁': Gift,     '🎉': Sparkles,
  // Knowledge & Education
  '📚': BookOpen, '📖': BookOpen, '🎓': GraduationCap, '🧠': Brain,
  // Misc utility
  '🔑': Key,     '🗝️': Key,     '🔔': Bell,     '📋': ClipboardList, '📄': FileText,
  '🔄': RefreshCw, '❓': HelpCircle, '❗': AlertCircle, '📏': Ruler,
  '🧮': Calculator, '🗂️': Layers, '💼': Briefcase, '🧳': Briefcase,
  '🔭': Compass, '🧪': Activity,
};

/**
 * Renders a crisp Lucide SVG icon for known emojis, falls back to emoji text.
 * Use this anywhere Claude generates an `icon` string field.
 */
function EmojiIcon({
  emoji,
  size = 24,
  color,
  strokeWidth = 1.75,
  className = '',
}: {
  emoji: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}) {
  // Normalize: trim + strip variation selectors (U+FE0F etc.)
  const key = emoji?.trim().replace(/[︎️]/g, '') ?? '';
  const LucideIcon = EMOJI_ICON_MAP[key] ?? EMOJI_ICON_MAP[emoji?.trim() ?? ''];
  if (LucideIcon) {
    return <LucideIcon size={size} color={color} strokeWidth={strokeWidth} className={className} />;
  }
  // Fallback: render emoji as text
  return <span className={className} style={{ fontSize: `${size}px`, lineHeight: 1 }}>{emoji}</span>;
}

// ── Canvas editor: inline contenteditable text helper ────────────────────────
// Renders a plain span. In edit mode, double-click activates contenteditable for text styling.
function EditSpan({
  field,
  value,
  editMode,
  onFieldChange,
  className,
  style,
  singleLine,
}: {
  field: string;
  value: string;
  editMode?: boolean;
  onFieldChange?: (field: string, value: string) => void;
  onPositionChange?: (field: string, offset: { x: number; y: number }) => void;
  fieldOffset?: { x: number; y: number };
  className?: string;
  style?: React.CSSProperties;
  singleLine?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);

  const decode = (v: string) => {
    const isHtml = /<[a-z]/i.test(v);
    if (isHtml) return v;
    const tmp = document.createElement('span');
    let prev = v;
    for (let i = 0; i < 5; i++) { tmp.innerHTML = prev; const next = tmp.textContent ?? prev; if (next === prev) break; prev = next; }
    return prev;
  };

  const decodedValue = decode(value);
  const isHtml = /<[a-z]/i.test(value);
  const spanStyle: React.CSSProperties = { ...style, lineHeight: 1, verticalAlign: 'middle', display: 'inline' };

  // Sync DOM content when not editing
  useEffect(() => {
    if (!spanRef.current || isEditing) return;
    const el = spanRef.current;
    if (isHtml) { if (el.innerHTML !== value) el.innerHTML = value; }
    else { if (el.textContent !== decodedValue) el.textContent = decodedValue; }
  }, [value, isEditing, isHtml, decodedValue]);

  // ── Inline edit: enter on double-click (dispatched by ElementOverlay) ───────
  // ElementOverlay resolves the element under the cursor (seeing through the
  // selection border) and fires `storee:edit-field` with the field + target el.
  // Only the EditSpan whose own DOM node matches enters edit — avoids duplicate
  // instances of the same field (e.g. storeName in header & footer) all editing.
  useEffect(() => {
    if (!editMode) return;
    const onEditField = (e: Event) => {
      const detail = (e as CustomEvent).detail as { field?: string; el?: Element } | undefined;
      if (!detail || detail.field !== field) return;
      const me = spanRef.current;
      const target = detail.el;
      if (!me || !target) return;
      // Match when the dispatched element is, contains, or is contained by this span.
      if (me === target || me.contains(target) || target.contains(me)) {
        setIsEditing(true);
      }
    };
    window.addEventListener('storee:edit-field', onEditField);
    return () => window.removeEventListener('storee:edit-field', onEditField);
  }, [editMode, field]);

  // While a field is being edited we must NOT let its links navigate — but the link
  // text still has to be fully selectable/editable like ordinary text. The bullet-proof
  // way (works in the preview harness AND in production, regardless of event ordering)
  // is to neuter the anchors: move `href` into `data-href` so there is simply nothing
  // to navigate to, then restore it when editing ends so the saved value keeps the link.
  const stripLinkHrefs = (root: HTMLElement) => {
    root.querySelectorAll('a[href]').forEach((a) => {
      a.setAttribute('data-href', a.getAttribute('href') ?? '');
      a.removeAttribute('href');
    });
  };
  const restoreLinkHrefs = (root: HTMLElement) => {
    root.querySelectorAll('a[data-href]').forEach((a) => {
      const href = a.getAttribute('data-href') ?? '';
      if (href) a.setAttribute('href', href);
      a.removeAttribute('data-href');
    });
  };

  // On entering edit: seed content directly into the DOM (not via React children,
  // so reconciliation never resets the caret), focus, and select-all.
  // Use rAF + execCommand for reliable selection on contentEditable.
  useEffect(() => {
    if (!isEditing || !spanRef.current) return;
    const el = spanRef.current;
    // Preserve link HTML created by FloatingToolbar: only set content if empty,
    // otherwise keep existing (which may have link with data-href from toolbar).
    if (!el.innerHTML.trim()) {
      if (isHtml) el.innerHTML = value; else el.textContent = decodedValue;
    }
    // Disable link navigation for the duration of the edit (restored on commit).
    stripLinkHrefs(el);
    el.focus();
    // Delay selection until contentEditable is fully ready and layout settled
    requestAnimationFrame(() => {
      document.execCommand('selectAll', false);
    });
  // Run once per edit session — value/decodedValue intentionally excluded.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // Add/remove editing indicator class on parent element + dispatch editing state event
  useEffect(() => {
    if (!spanRef.current) return;
    const parent = spanRef.current.parentElement;
    if (!parent) return;
    if (isEditing) {
      parent.classList.add('is-editing-text');
      window.dispatchEvent(new CustomEvent('storee:text-editing-start'));
    } else {
      parent.classList.remove('is-editing-text');
      window.dispatchEvent(new CustomEvent('storee:text-editing-end'));
    }
  }, [isEditing]);

  const getFieldSectionName = (fieldName: string): string => {
    // Convert field name to readable section name
    const mapping: Record<string, string> = {
      heroTitle: 'Hero',
      heroSubtitle: 'Hero',
      ctaText: 'Hero',
      promoBar: 'Promo Bar',
      brandStory: 'Brand Story',
      'newsletter.headline': 'Newsletter',
      'newsletter.subtext': 'Newsletter',
      footerNote: 'Footer',
      tagline: 'Tagline',
      storeName: 'Store Name',
    };

    // Handle array field names like features.1.title, testimonials.0.text, etc.
    const arrayMatch = fieldName.match(/^(\w+)\.\d+\./);
    if (arrayMatch) {
      const arrayType = arrayMatch[1];
      const sectionMap: Record<string, string> = {
        features: 'Features',
        testimonials: 'Testimonials',
        navLinks: 'Nav Links',
        trustBadges: 'Trust Badges',
        stats: 'Stats',
        faq: 'FAQ',
      };
      return sectionMap[arrayType] || arrayType;
    }

    // Handle section heading fields
    if (fieldName.startsWith('sectionHeadings.')) {
      const section = fieldName.split('.')[1];
      const sectionMap: Record<string, string> = {
        features: 'Features',
        testimonials: 'Testimonials',
        products: 'Products',
        faq: 'FAQ',
        newsletter: 'Newsletter',
      };
      return sectionMap[section] || section;
    }

    return mapping[fieldName] || fieldName;
  };

  const getChangeDescription = (oldHtml: string, newHtml: string): string => {
    const plainOld = oldHtml.replace(/<[^>]*>/g, '');
    const plainNew = newHtml.replace(/<[^>]*>/g, '');

    if (plainOld !== plainNew) {
      return 'Text updated';
    }

    const added: string[] = [];
    const removed: string[] = [];

    // Inline formatting tags
    const hadBold = /<strong[\s>]|<b[\s>]/i.test(oldHtml);
    const hasBold = /<strong[\s>]|<b[\s>]/i.test(newHtml);
    const hadItalic = /<em[\s>]|<i[\s>]/i.test(oldHtml);
    const hasItalic = /<em[\s>]|<i[\s>]/i.test(newHtml);
    const hadUnderline = /<u[\s>]/i.test(oldHtml);
    const hasUnderline = /<u[\s>]/i.test(newHtml);
    const hadStrike = /<s[\s>]|<strike[\s>]|text-decoration:[^;"]*line-through/i.test(oldHtml);
    const hasStrike = /<s[\s>]|<strike[\s>]|text-decoration:[^;"]*line-through/i.test(newHtml);

    if (!hadBold && hasBold) added.push('bold');
    else if (hadBold && !hasBold) removed.push('bold');
    if (!hadItalic && hasItalic) added.push('italic');
    else if (hadItalic && !hasItalic) removed.push('italic');
    if (!hadUnderline && hasUnderline) added.push('underline');
    else if (hadUnderline && !hasUnderline) removed.push('underline');
    if (!hadStrike && hasStrike) added.push('strikethrough');
    else if (hadStrike && !hasStrike) removed.push('strikethrough');

    // Text alignment
    const oldAlign = (oldHtml.match(/text-align:\s*(\w+)/i) || [])[1] || '';
    const newAlign = (newHtml.match(/text-align:\s*(\w+)/i) || [])[1] || '';
    if (newAlign !== oldAlign) {
      if (newAlign) added.push(`align ${newAlign}`);
    }

    // Font size — style="font-size: Npx" (custom handler) or <font size="N"> (execCommand)
    const extractFontSizes = (html: string) => {
      const styleSizes = [...html.matchAll(/font-size:\s*([\d.]+)px/gi)].map(m => m[1]);
      return styleSizes;
    };
    const oldSizeStr = [...new Set(extractFontSizes(oldHtml))].sort().join(',');
    const newSizeStr = [...new Set(extractFontSizes(newHtml))].sort().join(',');
    if (newSizeStr !== oldSizeStr && newSizeStr) {
      const sizes = [...new Set(extractFontSizes(newHtml))];
      added.push(`font size ${sizes.length === 1 ? sizes[0] + 'px' : sizes.join('/') + 'px'}`);
    }

    // Font family — style="font-family:..." OR <font face="...">
    const extractFont = (html: string) => {
      const styleMatch = html.match(/font-family:\s*([^;'"<]+)/i);
      if (styleMatch) return styleMatch[1].split(',')[0].replace(/['"]/g, '').trim();
      const faceMatch = html.match(/<font[^>]*\sface=["']?([^"',>]+)/i);
      if (faceMatch) return faceMatch[1].trim();
      return '';
    };
    const oldFont = extractFont(oldHtml);
    const newFont = extractFont(newHtml);
    if (newFont && newFont !== oldFont) added.push(`font: ${newFont}`);

    // Line height
    // Line height — ignore value "1" which is injected as a side-effect by the font-size handler
    const allOldLH = [...oldHtml.matchAll(/line-height:\s*([\d.]+)/gi)].map(m => m[1]).filter(v => v !== '1');
    const allNewLH = [...newHtml.matchAll(/line-height:\s*([\d.]+)/gi)].map(m => m[1]).filter(v => v !== '1');
    const oldLHStr = [...new Set(allOldLH)].sort().join(',');
    const newLHStr = [...new Set(allNewLH)].sort().join(',');
    if (newLHStr !== oldLHStr && allNewLH.length > 0) {
      const lhs = [...new Set(allNewLH)];
      added.push(`line height ${lhs.length === 1 ? lhs[0] : lhs.join('/')}`);
    }

    // Text color — match style="color:" OR <font color="...">
    const extractColors = (html: string) => {
      const styleColors = [...html.matchAll(/(?<![a-z-])color:\s*(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|[a-z]+)/gi)]
        .map(m => m[1].toLowerCase());
      const fontColors = [...html.matchAll(/<font[^>]*\scolor=["']?([^"'\s>]+)/gi)]
        .map(m => m[1].toLowerCase());
      return [...styleColors, ...fontColors];
    };
    const oldColors = extractColors(oldHtml).sort().join(',');
    const newColors = extractColors(newHtml).sort().join(',');
    if (newColors !== oldColors && newColors) added.push(`text color`);

    // Background color
    const extractBg = (html: string) =>
      [...html.matchAll(/background-color:\s*(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|[a-z]+)/gi)]
        .map(m => m[1].toLowerCase());
    const oldBg = extractBg(oldHtml).sort().join(',');
    const newBg = extractBg(newHtml).sort().join(',');
    if (newBg !== oldBg && newBg) added.push(`highlight color`);

    // Hyperlink added/removed
    const hadLink = /<a\s[^>]*href/i.test(oldHtml);
    const hasLink = /<a\s[^>]*href/i.test(newHtml);
    if (!hadLink && hasLink) added.push('hyperlink');
    else if (hadLink && !hasLink) removed.push('hyperlink');

    // Block-level style tag (h1–h4, p)
    const oldBlock = (oldHtml.match(/^<(h[1-4]|p)[\s>]/i) || [])[1]?.toLowerCase() || '';
    const newBlock = (newHtml.match(/^<(h[1-4]|p)[\s>]/i) || [])[1]?.toLowerCase() || '';
    if (newBlock && newBlock !== oldBlock) {
      const blockLabel: Record<string, string> = { h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', h4: 'Heading 4', p: 'Normal' };
      added.push(`style: ${blockLabel[newBlock] ?? newBlock}`);
    }

    if (added.length > 0) return `Applied ${added.join(', ')}`;
    if (removed.length > 0) return `Removed ${removed.join(', ')}`;
    return 'Formatting changed';
  };

  // `overrideHtml` is the authoritative markup captured by the FloatingToolbar from
  // the exact DOM node it mutated. When provided, bypass spanRef (which points to a
  // different node) and use this value directly.
  const commitEdit = (fromBlur = false, overrideHtml?: string) => {
    if (fromBlur) {
      const ae = document.activeElement as HTMLElement | null;
      if (ae?.closest('[data-floating-toolbar]')) {
        return;
      }
    }

    if (overrideHtml != null) {
      // Normalize data-href → href so stored markup has real links
      const next = overrideHtml.replace(/\bdata-href=/g, 'href=');
      // Sync spanRef so the DOM matches saved state before we exit edit mode
      if (spanRef.current && spanRef.current.innerHTML !== next) {
        spanRef.current.innerHTML = next;
      }
      const current = value;
      if (next !== current) {
        const changeType = getChangeDescription(current, next);
        const sectionName = getFieldSectionName(field);
        onFieldChange?.(field, next, `${sectionName} — ${changeType}`);
      }
      setIsEditing(false);
      return;
    }

    const el = spanRef.current;
    if (el) {
      const editedHtml = el.innerHTML;
      restoreLinkHrefs(el);
      const next = el.innerHTML;
      const current = value;
      if (next !== current || editedHtml.includes('<a')) {
        const changeType = getChangeDescription(current, next);
        const sectionName = getFieldSectionName(field);
        onFieldChange?.(field, next, `${sectionName} — ${changeType}`);
      }
    }
    setIsEditing(false);
  };
  const cancelEdit = () => {
    const el = spanRef.current;
    if (el) { if (isHtml) el.innerHTML = value; else el.textContent = decodedValue; }
    setIsEditing(false);
  };
  const onEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    else if (e.key === 'Enter' && (singleLine || !e.shiftKey)) { e.preventDefault(); commitEdit(); }
  };

  // Stop links from navigating while in edit mode WITHOUT breaking text editing.
  // Anchor navigation is the default action of the `click` event, so cancelling it
  // there is enough. We deliberately do NOT touch `mousedown` — the browser places
  // the caret and starts text selection on mousedown, so preventing it would make
  // the link's text impossible to select or edit. With this, a link behaves like
  // normal text in edit mode (selectable/editable) but never navigates.
  const preventLinkNav = useCallback((e: React.MouseEvent) => {
    if (!editMode) return;
    if ((e.target as HTMLElement).closest('a')) {
      e.preventDefault();
    }
  }, [editMode]);

  // Commit-on-demand from the FloatingToolbar (e.g. after inserting a link).
  // The toolbar mutates this contentEditable's innerHTML directly, but the editor
  // is not focused at that point (focus is on the toolbar), so a blur-based commit
  // never fires and the change is lost on the next render. The toolbar dispatches
  // `storee:commit-field` so we can persist the current DOM into React state here.
  useEffect(() => {
    if (!isEditing) return;
    const onCommitField = (e: Event) => {
      const detail = (e as CustomEvent).detail as { field?: string; html?: string } | undefined;
      if (!detail || detail.field !== field) return;
      commitEdit(false, detail.html);
    };
    window.addEventListener('storee:commit-field', onCommitField);
    return () => window.removeEventListener('storee:commit-field', onCommitField);
    // commitEdit closes over `value`/`field`; re-bind when those change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, field, value]);

  if (isEditing) {
    // No React-managed children — content is seeded imperatively in the effect above.
    return (
      <span
        ref={spanRef}
        className={className}
        style={{
          ...spanStyle,
          cursor: 'text',
          // No whiteSpace override — keep identical wrapping/layout to the read-only
          // span so the element doesn't change shape on edit. `singleLine` governs
          // keyboard behaviour (Enter commits) only, not CSS.
        }}
        data-editor-field={field}
        contentEditable
        suppressContentEditableWarning
        onBlur={() => {
          // Defer by one tick so document.activeElement settles on the newly
          // focused element (e.g. the FloatingToolbar's URL input) before
          // we check whether the blur should suppress the commit.
          setTimeout(() => commitEdit(true), 0);
        }}
        onKeyDown={onEditKeyDown}
        // Keep mousedown free of preventDefault so the caret lands and text
        // selection works normally inside links. Only stop propagation so the
        // overlay doesn't hijack the interaction.
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); preventLinkNav(e); }}
        onAuxClick={preventLinkNav}
      />
    );
  }

  // Read-only display — ElementOverlay handles hover/selection on this element.
  // Mark with data-editor-field so drill-down logic skips the span and selects parent instead.
  // In edit mode, cancel link navigation on click so a single click never leaves the editor
  // (double-click still enters text editing via ElementOverlay).
  // Defense in depth: if `value` still carries `data-href` (e.g. a link committed
  // before the edit-mode neutering/restore logic was fully wired), normalize it to
  // a real `href` for read-only display. Otherwise the anchor renders but seed-on-edit
  // never sees a `href` to strip, and any sync that re-writes `value` would leave the
  // link broken. The same effect on enter-edit (stripLinkHrefs) keeps things safe.
  const normalizedValue = isHtml ? value.replace(/\bdata-href=/g, 'href=') : value;
  if (isHtml) return <span ref={spanRef} className={className} style={spanStyle} data-editor-field={field} onClickCapture={preventLinkNav} onAuxClickCapture={preventLinkNav} dangerouslySetInnerHTML={{ __html: normalizedValue }} />;
  return <span ref={spanRef} className={className} style={spanStyle} data-editor-field={field}>{decodedValue}</span>;
}

// ── StyleOnlySpan — select & style dynamic text, but block text editing ───────
// Used for product fields (name, category, description) so users can apply
// bold/italic/color via FloatingToolbar without changing the actual text.
// Tooltip appears when user tries to type, explaining text is edit-only via Dashboard.
function StyleOnlySpan({
  field, value, htmlValue, editMode, onFieldChange, className, style,
  tipMessage = 'Product text can only be edited in the Dashboard',
}: {
  field: string; value: string; htmlValue?: string;
  editMode?: boolean; onFieldChange?: (field: string, value: string) => void;
  className?: string; style?: React.CSSProperties;
  tipMessage?: string;
}) {
  const [isStyling, setIsStyling] = useState(false);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const tipTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const displayVal = htmlValue || value;
  const isHtml = /<[a-z]/i.test(displayVal);
  const spanStyle: React.CSSProperties = { ...style, lineHeight: 'inherit', verticalAlign: 'middle', display: 'inline' };

  // Sync DOM when not in styling mode
  useEffect(() => {
    if (!spanRef.current || isStyling) return;
    const el = spanRef.current;
    if (isHtml) { if (el.innerHTML !== displayVal) el.innerHTML = displayVal; }
    else { if (el.textContent !== value) el.textContent = value; }
  }, [displayVal, value, isStyling, isHtml]);

  // Enter styling mode via storee:edit-field event (same mechanism as EditSpan)
  useEffect(() => {
    if (!editMode) return;
    const onEditField = (e: Event) => {
      const detail = (e as CustomEvent).detail as { field?: string; el?: Element } | undefined;
      if (!detail || detail.field !== field) return;
      const me = spanRef.current;
      const target = detail.el;
      if (!me || !target) return;
      if (me === target || me.contains(target) || target.contains(me)) setIsStyling(true);
    };
    window.addEventListener('storee:edit-field', onEditField);
    return () => window.removeEventListener('storee:edit-field', onEditField);
  }, [editMode, field]);

  // Seed content and focus when entering styling mode
  useEffect(() => {
    if (!isStyling || !spanRef.current) return;
    const el = spanRef.current;
    if (isHtml) el.innerHTML = displayVal; else el.textContent = value;
    el.focus();
    requestAnimationFrame(() => { document.execCommand('selectAll', false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStyling]);

  // Notify FloatingToolbar of editing state
  useEffect(() => {
    if (!spanRef.current) return;
    const parent = spanRef.current.parentElement;
    if (!parent) return;
    if (isStyling) {
      parent.classList.add('is-editing-text');
      window.dispatchEvent(new CustomEvent('storee:text-editing-start'));
    } else {
      parent.classList.remove('is-editing-text');
      window.dispatchEvent(new CustomEvent('storee:text-editing-end'));
    }
  }, [isStyling]);

  const commit = () => {
    if (!spanRef.current) { setIsStyling(false); return; }
    const el = spanRef.current;
    const currentText = el.textContent ?? '';
    if (currentText === value) {
      const html = el.innerHTML;
      if (html !== displayVal) onFieldChange?.(field, html);
    } else {
      // Text was changed — revert to original
      if (isHtml) el.innerHTML = displayVal; else el.textContent = value;
    }
    setIsStyling(false);
  };

  const flashTip = () => {
    if (spanRef.current) {
      const r = spanRef.current.getBoundingClientRect();
      setTipPos({ x: r.left + r.width / 2, y: r.top });
    }
    clearTimeout(tipTimerRef.current);
    tipTimerRef.current = setTimeout(() => setTipPos(null), 2200);
  };

  if (isStyling) {
    return (
      <>
        <span
          ref={spanRef}
          contentEditable
          suppressContentEditableWarning
          data-editor-field={field}
          className={className}
          style={spanStyle}
          onKeyDown={e => {
            const isModifier = e.ctrlKey || e.metaKey;
            const navKeys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'];
            if (e.key === 'Escape') { e.preventDefault(); commit(); return; }
            if (isModifier && ['b','i','u','a','z','y','c','x'].includes(e.key.toLowerCase())) return;
            if (navKeys.includes(e.key)) return;
            if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Enter' || e.key.length === 1) {
              e.preventDefault();
              flashTip();
            }
          }}
          onBlur={() => { setTimeout(commit, 0); }}
        />
        {tipPos && typeof document !== 'undefined' && createPortal(
          <span style={{
            position: 'fixed',
            left: tipPos.x, top: tipPos.y - 8,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(15,23,42,0.92)', color: '#fff', fontSize: '12px', fontWeight: 500,
            padding: '6px 12px', borderRadius: '6px', pointerEvents: 'none', zIndex: 99999,
            whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            textTransform: 'none', letterSpacing: '0.01em',
          }}>
            {tipMessage}
          </span>,
          document.body
        )}
      </>
    );
  }

  if (!editMode) {
    if (isHtml) return <span ref={spanRef} className={className} style={spanStyle} dangerouslySetInnerHTML={{ __html: displayVal }} />;
    return <span ref={spanRef} className={className} style={spanStyle}>{value}</span>;
  }

  if (isHtml) return <span ref={spanRef} className={className} style={spanStyle} data-editor-field={field} dangerouslySetInnerHTML={{ __html: displayVal }} />;
  return <span ref={spanRef} className={className} style={spanStyle} data-editor-field={field}>{value}</span>;
}

type StorePage = 'home' | 'product' | 'cart' | 'checkout' | 'success' | 'myorders' | 'wishlist';

interface BuyerUser { id: string; email: string; }

interface LayoutProps {
  storeName: string;
  primaryColor: string;
  design: StoreDesign;
  device: DeviceMode;
  onProductClick: (p: RichProduct) => void;
  onAddToCart: (p: RichProduct, sourceRect?: DOMRect) => void;
  onCartClick: () => void;
  cartCount: number;
  /** Pre-bound price formatter — call fmtPrice(amount) to get locale-correct string */
  fmtPrice: (amount: number) => string;
  onUserClick: () => void;
  buyerEmail: string | null;
  onSearchOpen: () => void;
  wishlist: Set<string>;
  onToggleWishlist: (id: string) => void;
  onWishlistClick: () => void;
  // Canvas editor — optional; only set when CanvasShell is active
  editMode?: boolean;
  onFieldChange?: (field: string, value: string) => void;
  onArrayReorder?: (field: string, newItems: unknown[]) => void;
}

// ── List wrapper (drag reorder removed) ─────────────────────────────────────
function DraggableList<T>({
  items,
  children,
}: {
  items: T[];
  field: string;
  editMode?: boolean;
  className?: string;
  children: (item: T, index: number) => React.ReactNode;
}) {
  return <>{items.map((item, i) => children(item, i))}</>;
}

// ── Cart toast popup ─────────────────────────────────────────────────────────

interface CartToastItem {
  id: string;
  product: RichProduct;
  cartCount: number;
}

function CartToast({ item, primaryColor, fmtPrice, onClose, onViewCart, previewShell }: {
  item: CartToastItem;
  primaryColor: string;
  fmtPrice: (n: number) => string;
  onClose: () => void;
  onViewCart: () => void;
  previewShell?: boolean;
}) {
  const toast = (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 99999, width: 256, background: '#fff', border: '1px solid #e5e7eb' }}
      className="rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Progress bar auto-dismiss */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 4, ease: 'linear' }}
        style={{ background: primaryColor, height: 3, transformOrigin: 'left', width: '100%' }}
      />

      <div className="p-3 flex items-center gap-3">
        {/* Product image */}
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
          {item.product.image ? (
            <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <ShoppingCart className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: primaryColor }} />
            <span className="text-[11px] font-semibold" style={{ color: primaryColor }}>Added to cart</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{item.product.name}</p>
          <p className="text-xs text-slate-500">{fmtPrice(item.product.price)}</p>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors self-start"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* View cart button */}
      <div className="px-3 pb-3">
        <button
          onClick={onViewCart}
          className="w-full py-2 text-xs font-semibold rounded-xl text-white transition-opacity hover:opacity-90"
          style={{ background: primaryColor }}
        >
          View Cart ({item.cartCount})
        </button>
      </div>
    </motion.div>
  );

  // Live store: portal to body (position:fixed relative to real viewport).
  // Preview/canvas: render inline (position:fixed contained by transform:translateZ(0)).
  if (!previewShell && typeof document !== 'undefined') {
    return createPortal(toast, document.body);
  }
  return toast;
}

// ── Cart fly animation ────────────────────────────────────────────────────────

interface FlyItem {
  id: string;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  image?: string;
}

/** Pixels per second — keep this constant so speed looks uniform at any distance */
const FLY_SPEED = 900; // px/s
const FLY_MIN   = 0.3; // s
const FLY_MAX   = 1.1; // s

function FlyingDot({ item, primaryColor, containerEl }: {
  item: FlyItem;
  primaryColor: string;
  containerEl: HTMLElement | null;
}) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setActive(true));
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, []);

  // Convert viewport coords → container-relative coords so the dot stays
  // inside the preview frame and is clipped by its overflow:hidden.
  const containerRect = containerEl?.getBoundingClientRect();
  const ox = containerRect?.left ?? 0;
  const oy = containerRect?.top  ?? 0;

  // Find the actual cart button in the DOM for an accurate target
  const cartBtn = typeof document !== 'undefined' ? document.querySelector('[data-cart-btn]') : null;
  const cartRect = cartBtn?.getBoundingClientRect();
  const targetX = (cartRect ? cartRect.left + cartRect.width  / 2 : (typeof window !== 'undefined' ? window.innerWidth - 56 : 1144)) - ox;
  const targetY = (cartRect ? cartRect.top  + cartRect.height / 2 : 28) - oy;

  const srcX = item.startX - ox;
  const srcY = item.startY - oy;

  // Duration proportional to distance → constant apparent speed
  const dx = targetX - srcX;
  const dy = targetY - srcY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const dur = Math.min(FLY_MAX, Math.max(FLY_MIN, dist / FLY_SPEED));

  const durS       = `${dur.toFixed(2)}s`;
  const fadeDurS   = `${(dur * 0.35).toFixed(2)}s`;
  const fadeDelayS = `${(dur * 0.65).toFixed(2)}s`;

  // End size: shrink to ~40px on the short side, maintaining the image's aspect ratio
  const aspect = item.startW > 0 && item.startH > 0 ? item.startW / item.startH : 1;
  const END_SHORT = 40;
  const endW = aspect >= 1 ? Math.round(END_SHORT * aspect) : END_SHORT;
  const endH = aspect >= 1 ? END_SHORT : Math.round(END_SHORT / aspect);

  // Border radius: start as card-like (8px), transition to circle at destination
  const startRadius = Math.min(10, Math.min(item.startW, item.startH) * 0.1);
  const endRadius = Math.round(Math.min(endW, endH) / 2);

  const dot = (
    <div
      style={{
        position: 'absolute',
        left: active ? targetX : srcX,
        top: active ? targetY : srcY,
        width: active ? `${endW}px` : `${item.startW}px`,
        height: active ? `${endH}px` : `${item.startH}px`,
        opacity: active ? 0 : 1,
        transform: 'translate(-50%, -50%)',
        borderRadius: active ? `${endRadius}px` : `${startRadius}px`,
        transition: [
          `left ${durS} cubic-bezier(0.25,0.6,0.35,1)`,
          `top ${durS} cubic-bezier(0.25,0.6,0.35,1)`,
          `width ${durS} cubic-bezier(0.25,0.6,0.35,1)`,
          `height ${durS} cubic-bezier(0.25,0.6,0.35,1)`,
          `border-radius ${durS} ease-in`,
          `opacity ${fadeDurS} ease-in ${fadeDelayS}`,
        ].join(', '),
        zIndex: 99999,
        overflow: 'hidden',
        boxShadow: active ? '0 2px 12px rgba(0,0,0,0.25)' : '0 8px 32px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
      }}
    >
      {item.image
        ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{ width: '100%', height: '100%', background: primaryColor }} />
      }
    </div>
  );

  // Portal into the preview container so the dot is clipped by its overflow:hidden.
  if (typeof document === 'undefined' || !containerEl) return null;
  return createPortal(dot, containerEl);
}

// ── Cart fly source rect helper ───────────────────────────────────────────────
// Given a button element inside a product card, finds the product image element
// and returns its bounding rect (preserving the real image shape/aspect ratio).
// Falls back to the card image container, then the button itself.
function getProductImgRect(btn: HTMLElement): DOMRect {
  const card = btn.closest('.group') as HTMLElement | null;
  if (card) {
    const img = card.querySelector('img') as HTMLElement | null;
    if (img) return img.getBoundingClientRect();
    const wrap = card.querySelector('.relative.aspect-square, .relative.aspect-\\[3\\/4\\], .relative.overflow-hidden') as HTMLElement | null;
    if (wrap) return wrap.getBoundingClientRect();
  }
  return btn.getBoundingClientRect();
}

// ── Image fallback ────────────────────────────────────────────────────────────

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3Crect width='4' height='3' fill='%23f1f5f9'/%3E%3C/svg%3E";

function ProductImg({ src, alt, className, style, fallback }: { src?: string; alt?: string; className?: string; style?: CSSProperties; fallback?: string }) {
  const [imgSrc, setImgSrc] = React.useState(src || PLACEHOLDER);
  const triedFallback = React.useRef(false);

  React.useEffect(() => {
    setImgSrc(src || PLACEHOLDER);
    triedFallback.current = false;
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt || ''}
      className={className}
      style={style}
      onError={() => {
        if (!triedFallback.current && fallback && fallback !== imgSrc) {
          triedFallback.current = true;
          setImgSrc(fallback);
        } else {
          setImgSrc(PLACEHOLDER);
        }
      }}
    />
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function isDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}

function alpha(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function Stars({ n = 5 }: { n?: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(n)].map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

function gridCols(device: DeviceMode) {
  return device === 'mobile' ? 'grid-cols-2' : device === 'tablet' ? 'grid-cols-3' : 'grid-cols-4';
}

// ── Theme helpers ─────────────────────────────────────────────────────────────

function getLayoutFont(style?: string): string {
  switch (style) {
    case 'elegant': return 'Georgia, "Times New Roman", serif';
    case 'modern':  return '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
    default:        return 'system-ui, -apple-system, sans-serif';
  }
}

interface CommerceTheme {
  fontFamily: string;
  pageBg: string;
  headerBg: string;
  headerBorder: string;
  surfaceBg: string;
  surfaceBorder: string;
  surfaceRadius: string;
  btnRadius: string;
  inputBg: string;
  inputBorder: string;
  inputRadius: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  divider: string;
  successBg: string;
  successText: string;
  successBorder: string;
  dangerBg: string;
  dangerText: string;
  primary: string;
  primaryContrast: string;
}

function getCommerceTheme(primaryColor: string, layoutStyle?: string): CommerceTheme {
  const pc = primaryColor || '#10b981';
  const contrast = '#ffffff';
  const base: Omit<CommerceTheme, 'primary' | 'primaryContrast'> = (() => {
    switch (layoutStyle) {
      case 'bold':
        return {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          pageBg: '#0a0a0a',
          headerBg: '#141414',
          headerBorder: 'rgba(255,255,255,0.07)',
          surfaceBg: '#1c1c1c',
          surfaceBorder: 'rgba(255,255,255,0.08)',
          surfaceRadius: '16px',
          btnRadius: '12px',
          inputBg: '#242424',
          inputBorder: 'rgba(255,255,255,0.12)',
          inputRadius: '12px',
          textPrimary: '#ffffff',
          textSecondary: '#aaaaaa',
          textMuted: '#666666',
          divider: 'rgba(255,255,255,0.07)',
          successBg: 'rgba(16,185,129,0.12)',
          successText: '#34d399',
          successBorder: 'rgba(16,185,129,0.2)',
          dangerBg: 'rgba(239,68,68,0.12)',
          dangerText: '#f87171',
        };
      case 'elegant':
        return {
          fontFamily: 'Georgia, "Times New Roman", serif',
          pageBg: '#f7f5f2',
          headerBg: '#f7f5f2',
          headerBorder: '#e8e0d8',
          surfaceBg: '#ffffff',
          surfaceBorder: '#e8e0d8',
          surfaceRadius: '4px',
          btnRadius: '4px',
          inputBg: '#faf8f6',
          inputBorder: '#d8cfc6',
          inputRadius: '4px',
          textPrimary: '#2a2420',
          textSecondary: '#6b5e52',
          textMuted: '#a09080',
          divider: '#e8e0d8',
          successBg: '#f0faf5',
          successText: '#2d6a4f',
          successBorder: '#b7e4c7',
          dangerBg: '#fef2f2',
          dangerText: '#991b1b',
        };
      case 'modern':
        return {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          pageBg: '#f4f5f8',
          headerBg: '#ffffff',
          headerBorder: '#eeeef2',
          surfaceBg: '#ffffff',
          surfaceBorder: '#eeeef2',
          surfaceRadius: '24px',
          btnRadius: '20px',
          inputBg: '#f4f5f8',
          inputBorder: '#e0e1ea',
          inputRadius: '16px',
          textPrimary: '#1a1a2e',
          textSecondary: '#4a4a6a',
          textMuted: '#9999aa',
          divider: '#eeeef2',
          successBg: '#f0fdf4',
          successText: '#16a34a',
          successBorder: '#bbf7d0',
          dangerBg: '#fff1f2',
          dangerText: '#e11d48',
        };
      case 'playful':
        return {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          pageBg: '#f9f9fb',
          headerBg: '#ffffff',
          headerBorder: alpha(pc, 0.15),
          surfaceBg: '#ffffff',
          surfaceBorder: alpha(pc, 0.15),
          surfaceRadius: '24px',
          btnRadius: '20px',
          inputBg: '#ffffff',
          inputBorder: alpha(pc, 0.25),
          inputRadius: '16px',
          textPrimary: '#1a1a1a',
          textSecondary: '#555555',
          textMuted: '#999999',
          divider: alpha(pc, 0.1),
          successBg: '#f0fdf4',
          successText: '#16a34a',
          successBorder: '#bbf7d0',
          dangerBg: '#fff1f2',
          dangerText: '#e11d48',
        };
      default: // minimal
        return {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          pageBg: '#f9f9f7',
          headerBg: '#ffffff',
          headerBorder: '#f0f0ee',
          surfaceBg: '#ffffff',
          surfaceBorder: '#f0f0ee',
          surfaceRadius: '16px',
          btnRadius: '12px',
          inputBg: '#ffffff',
          inputBorder: '#e5e5e0',
          inputRadius: '12px',
          textPrimary: '#111111',
          textSecondary: '#555555',
          textMuted: '#999999',
          divider: '#f0f0ee',
          successBg: '#f0fdf4',
          successText: '#16a34a',
          successBorder: '#bbf7d0',
          dangerBg: '#fff1f2',
          dangerText: '#e11d48',
        };
    }
  })();
  return { ...base, primary: pc, primaryContrast: contrast };
}

// ── Shared interactive pages ──────────────────────────────────────────────────

function ProductDetailPage({ product, primaryColor, storeName, device, onBack, onAddToCart, onCartClick, cartCount, fmtPrice, layoutStyle }: {
  product: RichProduct; primaryColor: string; storeName: string; device: DeviceMode; fmtPrice: (n: number) => string;
  onBack: () => void; onAddToCart: (p: RichProduct, sourceRect?: DOMRect) => void; onCartClick: () => void; cartCount: number;
  layoutStyle?: string;
}) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const t = getCommerceTheme(primaryColor, layoutStyle);
  const { uiT } = useStoreFlags();
  const handleAdd = () => {
    const rect = imgRef.current?.getBoundingClientRect();
    for (let i = 0; i < qty; i++) onAddToCart(product, i === 0 ? rect : undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };
  return (
    <div className="min-h-screen" style={{ background: t.pageBg, fontFamily: t.fontFamily }}>
      <header className="px-5 h-14 flex items-center justify-between sticky top-0 z-40" style={{ background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}` }}>
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors" style={{ color: t.textSecondary }}><ArrowLeft className="w-4 h-4" /> {uiT.back}</button>
        <span className="text-sm font-bold truncate max-w-[140px]" style={{ color: t.textPrimary }}>{storeName}</span>
        <button data-cart-btn onClick={onCartClick} className="relative p-2">
          <ShoppingCart className="w-5 h-5" style={{ color: t.textSecondary }} />
          {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center" style={{ background: t.primary, color: t.primaryContrast }}>{cartCount}</span>}
        </button>
      </header>
      <div className={`max-w-4xl mx-auto px-5 py-8 ${device === 'mobile' ? 'flex flex-col gap-6' : 'grid grid-cols-2 gap-12'}`}>
        <div ref={imgRef} className="aspect-square overflow-hidden shadow-sm" style={{ borderRadius: t.surfaceRadius, background: t.surfaceBg }}>
          <ProductImg src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col gap-4">
          {product.badge && <span className="text-xs font-bold px-3 py-1 rounded-full w-fit" style={{ background: t.primary, color: t.primaryContrast }}>{product.badge}</span>}
          <p className="text-xs uppercase tracking-wider" style={{ color: t.textMuted }}>{product.category}</p>
          <h1 className="text-2xl font-bold" style={{ color: t.textPrimary }}>{product.name}</h1>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black" style={{ color: t.primary }}>{fmtPrice(product.price)}</span>
            {product.originalPrice && <span className="text-lg line-through" style={{ color: t.textMuted }}>{fmtPrice(product.originalPrice)}</span>}
          </div>
          <div data-reviews-section="" className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            <span className="text-sm ml-1" style={{ color: t.textMuted }}>(4.8) · 124 reviews</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: t.textSecondary }}>{product.description || 'Premium quality product crafted with care and precision.'}</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center overflow-hidden" style={{ border: `1px solid ${t.surfaceBorder}`, borderRadius: t.inputRadius }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-11 h-11 flex items-center justify-center text-lg font-bold transition-colors" style={{ color: t.textSecondary }}>−</button>
              <span className="w-10 text-center text-sm font-bold" style={{ color: t.textPrimary }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="w-11 h-11 flex items-center justify-center text-lg font-bold transition-colors" style={{ color: t.textSecondary }}>+</button>
            </div>
            <button onClick={handleAdd} className="flex-1 py-3.5 text-sm font-bold transition-all hover:opacity-90 active:scale-95" style={{ background: added ? '#10b981' : t.primary, color: t.primaryContrast, borderRadius: t.btnRadius }}>
              {added ? uiT.addedToCart : uiT.addToCart}
            </button>
          </div>
          <div className="pt-4 space-y-2 text-sm" style={{ borderTop: `1px solid ${t.divider}` }}>
            {([[uiT.availability, uiT.inStock, t.successText], [uiT.delivery, uiT.deliveryDays, t.textPrimary], [uiT.returns, uiT.freeReturns, t.textPrimary]] as [string, string, string][]).map(([k, v, clr]) => (
              <div key={k} className="flex justify-between"><span style={{ color: t.textMuted }}>{k}</span><span className="font-semibold" style={{ color: clr }}>{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cart Sidebar ──────────────────────────────────────────────────────────────
function CartSidebar({ cart, primaryColor, fmtPrice, device, onClose, onViewCart, onCheckout, onUpdateQty, layoutStyle, editMode, previewShell }: {
  cart: CartItem[]; primaryColor: string; fmtPrice: (n: number) => string;
  device: DeviceMode; layoutStyle?: string; editMode?: boolean; previewShell?: boolean;
  onClose: () => void; onViewCart: () => void; onCheckout: () => void;
  onUpdateQty: (id: string, delta: number) => void;
}) {
  const t = getCommerceTheme(primaryColor, layoutStyle);
  const { uiT } = useStoreFlags();
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const isMobile = device === 'mobile';

  // Always position:fixed.
  // previewShell/editMode → NOT portaled; transform:translateZ(0) on the frame
  //   container contains the fixed element inside the frame (not real viewport).
  //   height:'100%' on a fixed element in a transformed ancestor = frame height → sticky CTA ✓
  // live store → portaled to body; fixed to real viewport.
  const isContained = editMode || previewShell;
  const pos = 'fixed';
  const h   = '100%';

  // Lock body scroll on live store only (preview/canvas already locked by backdrop)
  useEffect(() => {
    if (isContained) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isContained]);

  const content = (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: pos, inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.35)' }}
      />

      {/* Sidebar panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        className="flex flex-col shadow-2xl"
        style={{
          position: pos,
          top: 0,
          right: 0,
          zIndex: 99999,
          width: isMobile ? '100%' : '300px',
          height: h,
          background: t.surfaceBg,
          fontFamily: t.fontFamily,
          borderLeft: `1px solid ${t.surfaceBorder}`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" style={{ color: t.primary }} />
            <span className="text-sm font-bold" style={{ color: t.textPrimary }}>
              Cart ({cart.reduce((s, i) => s + i.qty, 0)})
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            style={{ color: t.textMuted }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <ShoppingCart className="w-10 h-10" style={{ color: t.textMuted }} />
              <p className="text-sm" style={{ color: t.textSecondary }}>{uiT.cartEmpty}</p>
            </div>
          ) : cart.map(({ product: p, qty }) => (
            <div key={p.id} className="flex gap-3 py-3" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: t.inputBg }}>
                <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate leading-tight" style={{ color: t.textPrimary }}>{p.name}</p>
                <p className="text-xs font-bold mt-0.5" style={{ color: t.primary }}>{fmtPrice(p.price)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center overflow-hidden" style={{ border: `1px solid ${t.surfaceBorder}`, borderRadius: '6px' }}>
                    <button onClick={() => onUpdateQty(p.id, -1)} className="w-6 h-6 flex items-center justify-center text-sm font-medium" style={{ color: t.textSecondary }}>−</button>
                    <span className="w-6 text-center text-xs font-bold" style={{ color: t.textPrimary }}>{qty}</span>
                    <button onClick={() => onUpdateQty(p.id, 1)} className="w-6 h-6 flex items-center justify-center text-sm font-medium" style={{ color: t.textSecondary }}>+</button>
                  </div>
                  <button
                    onClick={() => onUpdateQty(p.id, -qty)}
                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 transition-colors"
                    style={{ color: t.textMuted }}
                    title="Remove"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <span className="text-xs font-bold flex-shrink-0 pt-0.5" style={{ color: t.textPrimary }}>{fmtPrice(p.price * qty)}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 flex-shrink-0 space-y-3" style={{ borderTop: `1px solid ${t.divider}` }}>
          {cart.length > 0 ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold" style={{ color: t.textSecondary }}>{uiT.subtotal}</span>
                <span className="text-sm font-bold" style={{ color: t.primary }}>{fmtPrice(subtotal)}</span>
              </div>
              <p className="text-[10px] text-center" style={{ color: t.textMuted }}>{uiT.shippingNote}</p>
              <button
                onClick={onCheckout}
                className="w-full py-3 text-sm font-bold hover:opacity-90 transition-opacity"
                style={{ background: t.primary, color: t.primaryContrast, borderRadius: t.btnRadius }}
              >
                {uiT.checkout}
              </button>
              <button
                onClick={onViewCart}
                className="w-full py-2.5 text-xs font-semibold hover:opacity-75 transition-opacity"
                style={{ color: t.primary, border: `1.5px solid ${alpha(t.primary, 0.35)}`, borderRadius: t.btnRadius }}
              >
                {uiT.viewCart}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: t.primary, color: t.primaryContrast, borderRadius: t.btnRadius }}
            >
              {uiT.startShopping}
            </button>
          )}
        </div>
      </motion.div>
    </>
  );

  // Live store: portal to body so position:fixed is relative to the real viewport (sticky).
  // In editMode/previewShell: render inline — position:absolute clipped inside the frame.
  if (!isContained) {
    if (typeof document === 'undefined') return null;
    return createPortal(content, document.body);
  }
  return content;
}

function CartPage({ cart, primaryColor, storeName, device, onBack, onCheckout, onUpdateQty, fmtPrice, layoutStyle }: {
  cart: CartItem[]; primaryColor: string; storeName: string; device: DeviceMode; fmtPrice: (n: number) => string;
  layoutStyle?: string;
  onBack: () => void; onCheckout: () => void; onUpdateQty: (id: string, delta: number) => void;
}) {
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const isMobile = device === 'mobile';
  const isTablet = device === 'tablet';
  const t = getCommerceTheme(primaryColor, layoutStyle);
  const { uiT } = useStoreFlags();

  return (
    <div className="min-h-screen" style={{ background: t.pageBg, fontFamily: t.fontFamily }}>
      <header className="px-5 h-14 flex items-center justify-between sticky top-0 z-40 shadow-sm" style={{ background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}` }}>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium transition-colors" style={{ color: t.textSecondary }}><ArrowLeft className="w-4 h-4" /> {uiT.continueShopping}</button>
        <span className="text-sm font-bold" style={{ color: t.textPrimary }}>Cart ({cart.reduce((s, i) => s + i.qty, 0)})</span>
        <div className="w-28" />
      </header>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <ShoppingCart className="w-12 h-12" style={{ color: t.textMuted }} />
          <p className="text-sm font-medium" style={{ color: t.textSecondary }}>{uiT.cartEmpty}</p>
          <button onClick={onBack} className="px-6 py-2.5 text-sm font-semibold" style={{ background: t.primary, color: t.primaryContrast, borderRadius: t.btnRadius }}>{uiT.startShopping}</button>
        </div>
      ) : (
        <div className={`max-w-4xl mx-auto px-4 py-6 ${(isMobile || isTablet) ? 'flex flex-col gap-4' : 'grid grid-cols-[1fr_320px] gap-8 items-start'}`}>

          {/* Left: items */}
          <div className="space-y-4">
            <div className="overflow-hidden shadow-sm" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
                <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>Items ({cart.reduce((s, i) => s + i.qty, 0)})</h3>
              </div>
              <div>
                {cart.map(({ product: p, qty }) => (
                  <div key={p.id} className="flex gap-4 px-5 py-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: t.inputBg }}>
                      <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: t.textMuted }}>{p.category}</p>
                      <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>{p.name}</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: t.primary }}>{fmtPrice(p.price)}</p>
                    </div>
                    <div className="flex flex-col items-end justify-between flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold" style={{ color: t.textPrimary }}>{fmtPrice(p.price * qty)}</span>
                        <button
                          onClick={() => onUpdateQty(p.id, -qty)}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 transition-colors"
                          style={{ color: t.textMuted }}
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center overflow-hidden mt-2" style={{ border: `1px solid ${t.surfaceBorder}`, borderRadius: '8px' }}>
                        <button onClick={() => onUpdateQty(p.id, -1)} className="w-8 h-8 flex items-center justify-center text-base font-medium" style={{ color: t.textSecondary }}>−</button>
                        <span className="w-8 text-center text-xs font-bold" style={{ color: t.textPrimary }}>{qty}</span>
                        <button onClick={() => onUpdateQty(p.id, 1)} className="w-8 h-8 flex items-center justify-center text-base font-medium" style={{ color: t.textSecondary }}>+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Add more items CTA */}
              <div className="px-5 py-3" style={{ borderTop: `1px solid ${t.divider}` }}>
                <button
                  onClick={onBack}
                  className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-70 transition-opacity"
                  style={{ color: t.primary }}
                >
                  <Plus className="w-3.5 h-3.5" /> {uiT.addMoreItems}
                </button>
              </div>
            </div>
          </div>

          {/* Right: order summary */}
          <div className="shadow-sm p-5 space-y-3" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
            <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>{uiT.orderSummary}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: t.textSecondary }}>{uiT.subtotal}</span>
                <span className="font-medium" style={{ color: t.textPrimary }}>{fmtPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: t.textSecondary }}>{uiT.shipping}</span>
                <span className="text-xs italic" style={{ color: t.textMuted }}>{uiT.calcAtCheckout}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: t.textSecondary }}>{uiT.promo}</span>
                <span className="text-xs italic" style={{ color: t.textMuted }}>{uiT.appliedAtCheckout}</span>
              </div>
            </div>
            <div className="pt-3 flex justify-between font-bold text-sm" style={{ borderTop: `1px solid ${t.divider}` }}>
              <span style={{ color: t.textPrimary }}>{uiT.total}</span>
              <span style={{ color: t.primary }}>{fmtPrice(subtotal)}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-3.5 text-sm font-bold hover:opacity-90 transition-opacity mt-1"
              style={{ background: t.primary, color: t.primaryContrast, borderRadius: t.btnRadius }}
            >
              {uiT.proceedCheckout}
            </button>
            <p className="text-[10px] text-center" style={{ color: t.textMuted }}>{uiT.secureNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const INDONESIAN_PROVINCES = ['Aceh','Bali','Banten','Bengkulu','DI Yogyakarta','DKI Jakarta','Gorontalo','Jambi','Jawa Barat','Jawa Tengah','Jawa Timur','Kalimantan Barat','Kalimantan Selatan','Kalimantan Tengah','Kalimantan Timur','Kalimantan Utara','Kepulauan Bangka Belitung','Kepulauan Riau','Lampung','Maluku','Maluku Utara','Nusa Tenggara Barat','Nusa Tenggara Timur','Papua','Papua Barat','Riau','Sulawesi Barat','Sulawesi Selatan','Sulawesi Tengah','Sulawesi Tenggara','Sulawesi Utara','Sumatera Barat','Sumatera Selatan','Sumatera Utara'];

const PAYMENT_ICONS: Record<string, string> = { bank_transfer: '🏦', qris: '📱', cod: '💵', ewallet: '👛', gopay: '🟢', ovo: '🟣', dana: '🔵' };

// ── Country codes ─────────────────────────────────────────────────────────────
const COUNTRY_CODES: { code: string; name: string; dial: string; flag: string }[] = [
  { code: 'ID', name: 'Indonesia',         dial: '62',  flag: '🇮🇩' },
  { code: 'MY', name: 'Malaysia',          dial: '60',  flag: '🇲🇾' },
  { code: 'SG', name: 'Singapore',         dial: '65',  flag: '🇸🇬' },
  { code: 'PH', name: 'Philippines',       dial: '63',  flag: '🇵🇭' },
  { code: 'TH', name: 'Thailand',          dial: '66',  flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam',           dial: '84',  flag: '🇻🇳' },
  { code: 'MM', name: 'Myanmar',           dial: '95',  flag: '🇲🇲' },
  { code: 'KH', name: 'Cambodia',          dial: '855', flag: '🇰🇭' },
  { code: 'BN', name: 'Brunei',            dial: '673', flag: '🇧🇳' },
  { code: 'LA', name: 'Laos',              dial: '856', flag: '🇱🇦' },
  { code: 'TL', name: 'Timor-Leste',       dial: '670', flag: '🇹🇱' },
  { code: 'JP', name: 'Japan',             dial: '81',  flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea',       dial: '82',  flag: '🇰🇷' },
  { code: 'CN', name: 'China',             dial: '86',  flag: '🇨🇳' },
  { code: 'HK', name: 'Hong Kong',         dial: '852', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan',            dial: '886', flag: '🇹🇼' },
  { code: 'IN', name: 'India',             dial: '91',  flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan',          dial: '92',  flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh',        dial: '880', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka',         dial: '94',  flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal',             dial: '977', flag: '🇳🇵' },
  { code: 'AU', name: 'Australia',         dial: '61',  flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand',       dial: '64',  flag: '🇳🇿' },
  { code: 'US', name: 'United States',     dial: '1',   flag: '🇺🇸' },
  { code: 'CA', name: 'Canada',            dial: '1',   flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom',    dial: '44',  flag: '🇬🇧' },
  { code: 'IE', name: 'Ireland',           dial: '353', flag: '🇮🇪' },
  { code: 'DE', name: 'Germany',           dial: '49',  flag: '🇩🇪' },
  { code: 'FR', name: 'France',            dial: '33',  flag: '🇫🇷' },
  { code: 'IT', name: 'Italy',             dial: '39',  flag: '🇮🇹' },
  { code: 'ES', name: 'Spain',             dial: '34',  flag: '🇪🇸' },
  { code: 'PT', name: 'Portugal',          dial: '351', flag: '🇵🇹' },
  { code: 'NL', name: 'Netherlands',       dial: '31',  flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium',           dial: '32',  flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland',       dial: '41',  flag: '🇨🇭' },
  { code: 'AT', name: 'Austria',           dial: '43',  flag: '🇦🇹' },
  { code: 'SE', name: 'Sweden',            dial: '46',  flag: '🇸🇪' },
  { code: 'NO', name: 'Norway',            dial: '47',  flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark',           dial: '45',  flag: '🇩🇰' },
  { code: 'FI', name: 'Finland',           dial: '358', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland',            dial: '48',  flag: '🇵🇱' },
  { code: 'CZ', name: 'Czech Republic',    dial: '420', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary',           dial: '36',  flag: '🇭🇺' },
  { code: 'RO', name: 'Romania',           dial: '40',  flag: '🇷🇴' },
  { code: 'GR', name: 'Greece',            dial: '30',  flag: '🇬🇷' },
  { code: 'RU', name: 'Russia',            dial: '7',   flag: '🇷🇺' },
  { code: 'UA', name: 'Ukraine',           dial: '380', flag: '🇺🇦' },
  { code: 'TR', name: 'Turkey',            dial: '90',  flag: '🇹🇷' },
  { code: 'SA', name: 'Saudi Arabia',      dial: '966', flag: '🇸🇦' },
  { code: 'AE', name: 'UAE',               dial: '971', flag: '🇦🇪' },
  { code: 'QA', name: 'Qatar',             dial: '974', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait',            dial: '965', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain',           dial: '973', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman',              dial: '968', flag: '🇴🇲' },
  { code: 'JO', name: 'Jordan',            dial: '962', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanon',           dial: '961', flag: '🇱🇧' },
  { code: 'IL', name: 'Israel',            dial: '972', flag: '🇮🇱' },
  { code: 'IR', name: 'Iran',              dial: '98',  flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq',              dial: '964', flag: '🇮🇶' },
  { code: 'EG', name: 'Egypt',             dial: '20',  flag: '🇪🇬' },
  { code: 'ZA', name: 'South Africa',      dial: '27',  flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria',           dial: '234', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya',             dial: '254', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana',             dial: '233', flag: '🇬🇭' },
  { code: 'TZ', name: 'Tanzania',          dial: '255', flag: '🇹🇿' },
  { code: 'ET', name: 'Ethiopia',          dial: '251', flag: '🇪🇹' },
  { code: 'UG', name: 'Uganda',            dial: '256', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda',            dial: '250', flag: '🇷🇼' },
  { code: 'MX', name: 'Mexico',            dial: '52',  flag: '🇲🇽' },
  { code: 'BR', name: 'Brazil',            dial: '55',  flag: '🇧🇷' },
  { code: 'AR', name: 'Argentina',         dial: '54',  flag: '🇦🇷' },
  { code: 'CL', name: 'Chile',             dial: '56',  flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia',          dial: '57',  flag: '🇨🇴' },
  { code: 'PE', name: 'Peru',              dial: '51',  flag: '🇵🇪' },
];

function detectDefaultCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const map: Record<string, string> = {
      'Asia/Jakarta': 'ID', 'Asia/Makassar': 'ID', 'Asia/Jayapura': 'ID', 'Asia/Pontianak': 'ID',
      'Asia/Kuala_Lumpur': 'MY', 'Asia/Kuching': 'MY',
      'Asia/Singapore': 'SG',
      'Asia/Bangkok': 'TH', 'Asia/Phnom_Penh': 'KH', 'Asia/Vientiane': 'LA',
      'Asia/Manila': 'PH',
      'Asia/Ho_Chi_Minh': 'VN', 'Asia/Hanoi': 'VN',
      'Asia/Rangoon': 'MM', 'Asia/Yangon': 'MM',
      'Asia/Dili': 'TL',
      'Asia/Tokyo': 'JP',
      'Asia/Seoul': 'KR',
      'Asia/Shanghai': 'CN', 'Asia/Chongqing': 'CN', 'Asia/Harbin': 'CN', 'Asia/Urumqi': 'CN',
      'Asia/Hong_Kong': 'HK',
      'Asia/Taipei': 'TW',
      'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN',
      'Asia/Karachi': 'PK',
      'Asia/Dhaka': 'BD',
      'Asia/Colombo': 'LK',
      'Asia/Kathmandu': 'NP',
      'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Perth': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Adelaide': 'AU',
      'Pacific/Auckland': 'NZ',
      'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
      'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Winnipeg': 'CA',
      'Europe/London': 'GB',
      'Europe/Dublin': 'IE',
      'Europe/Berlin': 'DE', 'Europe/Munich': 'DE',
      'Europe/Paris': 'FR',
      'Europe/Rome': 'IT',
      'Europe/Madrid': 'ES',
      'Europe/Lisbon': 'PT',
      'Europe/Amsterdam': 'NL',
      'Europe/Brussels': 'BE',
      'Europe/Zurich': 'CH',
      'Europe/Vienna': 'AT',
      'Europe/Stockholm': 'SE',
      'Europe/Oslo': 'NO',
      'Europe/Copenhagen': 'DK',
      'Europe/Helsinki': 'FI',
      'Europe/Warsaw': 'PL',
      'Europe/Prague': 'CZ',
      'Europe/Budapest': 'HU',
      'Europe/Bucharest': 'RO',
      'Europe/Athens': 'GR',
      'Europe/Moscow': 'RU', 'Europe/Samara': 'RU',
      'Europe/Kiev': 'UA', 'Europe/Kyiv': 'UA',
      'Europe/Istanbul': 'TR',
      'Asia/Riyadh': 'SA',
      'Asia/Dubai': 'AE',
      'Asia/Qatar': 'QA',
      'Asia/Kuwait': 'KW',
      'Asia/Bahrain': 'BH',
      'Asia/Muscat': 'OM',
      'Asia/Amman': 'JO',
      'Asia/Beirut': 'LB',
      'Asia/Jerusalem': 'IL',
      'Asia/Tehran': 'IR',
      'Asia/Baghdad': 'IQ',
      'Africa/Cairo': 'EG',
      'Africa/Johannesburg': 'ZA',
      'Africa/Lagos': 'NG',
      'Africa/Nairobi': 'KE',
      'Africa/Accra': 'GH',
      'Africa/Dar_es_Salaam': 'TZ',
      'Africa/Addis_Ababa': 'ET',
      'Africa/Kampala': 'UG',
      'Africa/Kigali': 'RW',
      'America/Mexico_City': 'MX',
      'America/Sao_Paulo': 'BR', 'America/Manaus': 'BR',
      'America/Argentina/Buenos_Aires': 'AR',
      'America/Santiago': 'CL',
      'America/Bogota': 'CO',
      'America/Lima': 'PE',
    };
    return map[tz] ?? 'ID';
  } catch { return 'ID'; }
}

function PhoneCountrySelect({ selectedCode, onChangeCode, t }: {
  selectedCode: string;
  onChangeCode: (code: string) => void;
  t: ReturnType<typeof getCommerceTheme>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 260 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const selected = COUNTRY_CODES.find(c => c.code === selectedCode) ?? COUNTRY_CODES[0];
  const q = search.trim().toLowerCase();
  const digitQ = q.replace(/\D/g, '');
  const filtered = !q
    ? COUNTRY_CODES
    : COUNTRY_CODES.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (digitQ.length > 0 && c.dial.startsWith(digitQ))
      );

  // Outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest?.('[data-pcd="1"]')) return;
      if (btnRef.current?.contains(el)) return;
      setOpen(false);
      setSearch('');
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const updatePos = () => {
    if (btnRef.current) {
      // Measure the WhatsApp field container (grandparent of button)
      const container = btnRef.current.parentElement?.parentElement ?? btnRef.current;
      const r = container.getBoundingClientRect();
      // Find the preview root so we can subtract its offset and use position:absolute
      // (keeps the dropdown inside the frame even in PreviewShell / canvas)
      const root = btnRef.current.closest('[data-preview-root]');
      const ro = root?.getBoundingClientRect();
      const ox = ro?.left ?? 0;
      const oy = ro?.top  ?? 0;
      setPos({ top: r.bottom - oy, left: r.left - ox, width: r.width });
    }
  };

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open]);

  const handleToggle = () => {
    updatePos();
    setOpen(v => !v);
    if (open) setSearch('');
  };

  // Stable ref callback — useCallback prevents re-runs on re-render (only fires on mount/unmount)
  const searchInputRef = useCallback((el: HTMLInputElement | null) => {
    if (!el) return;
    el.value = '';
    el.focus();
    el.oninput = () => setSearch(el.value);
  }, []);

  return (
    <div className="relative flex-shrink-0">
      <button ref={btnRef} type="button" onClick={handleToggle}
        className="flex items-center gap-1 text-xs font-medium flex-shrink-0"
        style={{ padding: '10px 10px', background: 'transparent', color: t.textSecondary, borderRight: `1px solid ${t.inputBorder}`, whiteSpace: 'nowrap' }}
      >
        <span>+{selected.dial}</span>
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>

      {open && typeof window !== 'undefined' && createPortal(
        <div data-pcd="1" style={{
          position: 'absolute', top: pos.top, left: pos.left, width: pos.width, zIndex: 99999,
          background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: '0 0 12px 12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden', fontFamily: t.fontFamily,
        }}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Cari negara atau kode…"
            style={{
              display: 'block', width: '100%', padding: '10px 12px', fontSize: 12, outline: 'none',
              background: t.inputBg, border: 'none', borderBottom: `1px solid ${t.divider}`,
              color: t.textPrimary, boxSizing: 'border-box', fontFamily: t.fontFamily,
            }}
          />
          <div style={{ overflowY: 'auto', maxHeight: 200 }}>
            {filtered.length === 0
              ? <p style={{ fontSize: 12, textAlign: 'center', padding: '16px 0', color: t.textMuted }}>Tidak ditemukan</p>
              : filtered.map(c => (
                <button key={c.code} type="button"
                  onMouseDown={e => { e.preventDefault(); onChangeCode(c.code); setOpen(false); setSearch(''); }}
                  onMouseEnter={e => { if (c.code !== selectedCode) (e.currentTarget as HTMLElement).style.background = alpha(t.primary, 0.05); }}
                  onMouseLeave={e => { if (c.code !== selectedCode) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', fontSize: 12, textAlign: 'left', cursor: 'pointer',
                    border: 'none', outline: 'none', fontFamily: t.fontFamily,
                    background: c.code === selectedCode ? alpha(t.primary, 0.08) : 'transparent',
                    color: t.textPrimary, transition: 'background 0.1s',
                  }}
                >
                  <span style={{ flexShrink: 0, fontWeight: 600, color: t.textMuted, minWidth: 36 }}>+{c.dial}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                </button>
              ))}
          </div>
        </div>,
        (btnRef.current?.closest('[data-preview-root]') ?? document.body) as Element
      )}
    </div>
  );
}

function CheckoutPage({ cart, primaryColor, storeName, device, onBack, onPlaceOrder, fmtPrice, shippingSettings, paymentSettings, layoutStyle }: {
  cart: CartItem[]; primaryColor: string; storeName: string; device: DeviceMode; fmtPrice: (n: number) => string;
  shippingSettings?: ShippingSettings; paymentSettings?: PaymentSettings; layoutStyle?: string;
  onBack: () => void; onPlaceOrder: (paymentId: string, shippingId: string, customer: { name: string; email: string; whatsapp: string; address: string; city: string; province: string; postal: string }) => void;
}) {
  const [form, setForm] = useState({ email: '', whatsapp: '', name: '', address: '', city: '', province: '', postal: '' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const [phoneCountryCode, setPhoneCountryCode] = useState(() => detectDefaultCountry());
  const showAddressFields = form.name.trim().length > 0 && form.whatsapp.trim().length > 0 && form.email.trim().length > 0;

  const enabledPayments = (paymentSettings?.methods ?? DEFAULT_PAYMENT_METHODS).filter(m => m.enabled);
  const paymentMethods: PaymentMethod[] = enabledPayments.length > 0 ? enabledPayments : [
    { id: 'bca', name: 'Transfer BCA', type: 'bank_transfer', enabled: true, bankName: 'BCA', accountNumber: '1234567890', accountHolder: 'Nama Toko' }
  ];
  const [selectedPayId, setSelectedPayId] = useState(paymentMethods[0]?.id ?? '');
  useEffect(() => { if (!selectedPayId && paymentMethods.length) setSelectedPayId(paymentMethods[0].id); }, []);

  const enabledShippingMethods = (shippingSettings?.methods ?? DEFAULT_SHIPPING_METHODS).filter(m => m.enabled);
  const shippingMethods: ShippingMethod[] = enabledShippingMethods.length > 0 ? enabledShippingMethods : [
    { id: 'flat', name: 'Standard Shipping', price: 15000, estimatedDays: '2–3 days', enabled: true, icon: '📦' }
  ];
  const [selectedShippingId, setSelectedShippingId] = useState(shippingMethods[0]?.id ?? '');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const selectedShipping = shippingMethods.find(m => m.id === selectedShippingId) ?? shippingMethods[0];
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const freeThreshold = shippingSettings?.freeShippingThreshold;
  const shippingCost = (freeThreshold && subtotal >= freeThreshold) ? 0 : (selectedShipping?.price ?? 15000);
  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal + shippingCost - discount;
  const isMobile = device === 'mobile';
  const isTablet = device === 'tablet';
  const selectedPayment = paymentMethods.find(m => m.id === selectedPayId);
  const t = getCommerceTheme(primaryColor, layoutStyle);
  const inpStyle: CSSProperties = { background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: t.inputRadius, color: t.textPrimary, '--tw-ring-color': alpha(t.primary, 0.3) } as CSSProperties;
  const lblStyle: CSSProperties = { color: t.textSecondary, fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px', display: 'block' };

  return (
    <div className="min-h-screen" style={{ background: t.pageBg, fontFamily: t.fontFamily }}>
      <header className="px-5 h-14 flex items-center sticky top-0 z-40 shadow-sm" style={{ background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}` }}>
        <span className="text-sm font-bold flex-1 text-center" style={{ color: t.textPrimary }}>{storeName}</span>
        <button onClick={onBack} className="relative p-2 hover:opacity-70 transition-opacity" style={{ color: t.textSecondary }}>
          <ShoppingCart className="w-5 h-5" />
        </button>
      </header>

      <div className={`max-w-4xl mx-auto px-4 py-6 ${(isMobile || isTablet) ? 'flex flex-col gap-4' : 'grid grid-cols-[1fr_300px] gap-8 items-start'}`}>

        {/* Left: form sections */}
        <div className="space-y-4">

          {/* Contact & Shipping — merged */}
          <div className="shadow-sm overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: alpha(t.primary, 0.1) }}>
                <MapPin className="w-3.5 h-3.5" style={{ color: t.primary }} />
              </div>
              <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>Customer Details</h3>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              {/* Always visible: Name, WhatsApp, Email */}
              <div className="col-span-2">
                <label style={lblStyle}>Full Name</label>
                <input className="w-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent" style={inpStyle} value={form.name} onChange={set('name')} placeholder="Recipient full name" />
              </div>
              <div>
                <label style={lblStyle}>WhatsApp</label>
                <div className="flex items-center overflow-hidden" style={{ border: `1px solid ${t.inputBorder}`, borderRadius: t.inputRadius, background: t.inputBg, transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  ref={el => {
                    if (!el) return;
                    const inp = el.querySelector('input[type=tel]') as HTMLInputElement | null;
                    if (!inp) return;
                    inp.onfocus = () => { el.style.borderColor = t.primary; el.style.boxShadow = `0 0 0 2px ${alpha(t.primary, 0.2)}`; };
                    inp.onblur  = () => { el.style.borderColor = t.inputBorder; el.style.boxShadow = 'none'; };
                  }}
                >
                  <PhoneCountrySelect selectedCode={phoneCountryCode} onChangeCode={setPhoneCountryCode} t={t} />
                  <input type="tel" className="flex-1 min-w-0 text-sm outline-none" style={{ background: 'transparent', color: t.textPrimary, padding: '10px 12px' }} value={form.whatsapp} onChange={set('whatsapp')} placeholder="81234567890" />
                </div>
              </div>
              <div>
                <label style={lblStyle}>Email</label>
                <input type="email" className="w-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent" style={inpStyle} value={form.email} onChange={set('email')} placeholder="name@email.com" />
              </div>

              {/* Revealed after name + whatsapp + email are filled */}
              <AnimatePresence>
                {showAddressFields && (
                  <motion.div
                    key="address-fields"
                    className="col-span-2 grid grid-cols-2 gap-3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="col-span-2">
                      <label style={lblStyle}>Full Address</label>
                      <textarea
                        className="w-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent resize-none"
                        style={{ ...inpStyle, '--tw-ring-color': alpha(t.primary, 0.3) } as CSSProperties}
                        rows={2}
                        value={form.address}
                        onChange={set('address')}
                        placeholder="Street name, number, district, subdistrict"
                      />
                    </div>
                    <div>
                      <label style={lblStyle}>City</label>
                      <input className="w-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent" style={inpStyle} value={form.city} onChange={set('city')} placeholder="City" />
                    </div>
                    <div>
                      <label style={lblStyle}>Postal Code</label>
                      <input className="w-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent" style={inpStyle} value={form.postal} onChange={set('postal')} placeholder="12345" maxLength={5} />
                    </div>
                    <div className="col-span-2">
                      <label style={lblStyle}>Province</label>
                      <div className="relative">
                        <select
                          value={form.province}
                          onChange={set('province')}
                          className="w-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent appearance-none pr-8"
                          style={{ ...inpStyle, '--tw-ring-color': alpha(t.primary, 0.3) } as CSSProperties}
                        >
                          <option value="">Select province...</option>
                          {INDONESIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: t.textMuted }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Shipping Method */}
          <div className="shadow-sm overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: alpha(t.primary, 0.1) }}>
                <Truck className="w-3.5 h-3.5" style={{ color: t.primary }} />
              </div>
              <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>Shipping Method</h3>
            </div>
            <div className="p-4 space-y-2">
              {shippingMethods.map(method => {
                const isFreeByThreshold = freeThreshold && subtotal >= freeThreshold;
                const cost = isFreeByThreshold ? 0 : method.price;
                const isSelected = selectedShippingId === method.id;
                return (
                  <label key={method.id} className="flex items-center gap-4 p-4 cursor-pointer transition-all" style={{ borderRadius: t.inputRadius, border: `2px solid ${isSelected ? t.primary : t.surfaceBorder}`, background: isSelected ? alpha(t.primary, 0.04) : t.surfaceBg }}>
                    <input type="radio" name="shipping" value={method.id} checked={isSelected} onChange={() => setSelectedShippingId(method.id)} className="sr-only" />
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors" style={{ borderColor: isSelected ? t.primary : t.surfaceBorder }}>
                      {isSelected && <div className="w-2 h-2 rounded-full" style={{ background: t.primary }} />}
                    </div>
                    <span className="text-lg flex-shrink-0">{method.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>{method.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>Est. arrival: {method.estimatedDays}</p>
                    </div>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: t.primary }}>
                      {cost === 0 ? 'FREE' : fmtPrice(cost)}
                    </span>
                  </label>
                );
              })}
              {freeThreshold && subtotal < freeThreshold && (
                <div className="mt-2 px-4 py-2.5 rounded-xl border text-xs text-amber-700" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                  🎁 Add {fmtPrice(freeThreshold - subtotal)} more for free shipping!
                </div>
              )}
            </div>
          </div>

          {/* Payment method */}
          <div className="shadow-sm overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: alpha(t.primary, 0.1) }}>
                <Phone className="w-3.5 h-3.5" style={{ color: t.primary }} />
              </div>
              <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>Payment Method</h3>
            </div>
            <div className="p-5 space-y-2">
              {paymentMethods.map(pm => {
                const icon = PAYMENT_ICONS[pm.id] ?? PAYMENT_ICONS[pm.type] ?? '💳';
                const isSelected = selectedPayId === pm.id;
                return (
                  <label key={pm.id} className="flex items-start gap-4 p-4 cursor-pointer transition-all" style={{ borderRadius: t.inputRadius, border: `2px solid ${isSelected ? t.primary : t.surfaceBorder}`, background: isSelected ? alpha(t.primary, 0.04) : t.surfaceBg }}>
                    <input type="radio" name="payment" value={pm.id} checked={isSelected} onChange={() => setSelectedPayId(pm.id)} className="sr-only" />
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors" style={isSelected ? { borderColor: t.primary } : { borderColor: t.surfaceBorder }}>
                      {isSelected && <div className="w-2 h-2 rounded-full" style={{ background: t.primary }} />}
                    </div>
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>{pm.name}</p>
                      {pm.type === 'bank_transfer' && pm.bankName && (
                        <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{pm.bankName} · ****{pm.accountNumber?.slice(-4)}</p>
                      )}
                      {pm.type === 'ewallet' && pm.ewalletNumber && (
                        <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{pm.ewalletNumber}</p>
                      )}
                      {pm.type === 'qris' && (
                        <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>Pay by scanning QR from any app</p>
                      )}
                      {pm.type === 'cod' && (
                        <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>Pay when your order arrives</p>
                      )}
                      {/* Expanded details when selected */}
                      {isSelected && pm.type === 'bank_transfer' && pm.accountNumber && (
                        <div className="mt-3 p-3 space-y-1.5" style={{ background: t.inputBg, borderRadius: t.inputRadius, border: `1px solid ${t.surfaceBorder}` }}>
                          <p className="text-xs" style={{ color: t.textSecondary }}>Bank: <span className="font-bold" style={{ color: t.textPrimary }}>{pm.bankName}</span></p>
                          <p className="text-xs" style={{ color: t.textSecondary }}>Account Number: <span className="font-bold font-mono" style={{ color: t.textPrimary }}>{pm.accountNumber}</span></p>
                          <p className="text-xs" style={{ color: t.textSecondary }}>Account Name: <span className="font-bold" style={{ color: t.textPrimary }}>{pm.accountHolder}</span></p>
                        </div>
                      )}
                      {isSelected && pm.type === 'qris' && (
                        <div className="mt-3 flex justify-center p-4" style={{ background: t.inputBg, borderRadius: t.inputRadius, border: `1px solid ${t.surfaceBorder}` }}>
                          <div className="w-28 h-28 rounded-xl flex items-center justify-center text-4xl" style={{ background: t.pageBg }}>📱</div>
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
              {paymentSettings?.paymentNote && (
                <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600">{paymentSettings.paymentNote}</p>
                </div>
              )}
            </div>
          </div>

          {/* Promo Code */}
          <div className="shadow-sm p-5" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
            <p className="text-sm font-bold mb-3" style={{ color: t.textPrimary }}>Promo Code</p>
            <div className="flex gap-2">
              <input
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(false); }}
                placeholder="Enter promo code"
                className="flex-1 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent"
                style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: t.inputRadius, color: t.textPrimary, '--tw-ring-color': alpha(t.primary, 0.3) } as CSSProperties}
              />
              <button
                onClick={() => promoCode && setPromoApplied(true)}
                className="px-5 py-2.5 text-sm font-bold hover:opacity-85 transition-opacity"
                style={{ background: t.primary, color: t.primaryContrast, borderRadius: t.btnRadius }}
              >
                {promoApplied ? <Check className="w-4 h-4" /> : 'Apply'}
              </button>
            </div>
            {promoApplied && <p className="text-xs mt-2 font-medium" style={{ color: t.successText }}>✓ Code applied! 10% discount.</p>}
          </div>
        </div>

        {/* Right: order summary */}
        <div className="shadow-sm p-5 space-y-3" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
          <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>Order Summary ({cart.reduce((s, i) => s + i.qty, 0)} items)</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cart.map(({ product: p, qty }) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: t.inputBg }}>
                  <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: t.textPrimary }}>{p.name}</p>
                  <p className="text-[10px]" style={{ color: t.textMuted }}>×{qty}</p>
                </div>
                <span className="text-xs font-bold" style={{ color: t.textPrimary }}>{fmtPrice(p.price * qty)}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 space-y-1.5 text-sm" style={{ borderTop: `1px solid ${t.divider}` }}>
            <div className="flex justify-between text-xs"><span style={{ color: t.textSecondary }}>Subtotal</span><span style={{ color: t.textPrimary }}>{fmtPrice(subtotal)}</span></div>
            <div className="flex justify-between text-xs">
              <span style={{ color: t.textSecondary }}>Shipping</span>
              <span>{shippingCost === 0 ? <span className="font-semibold" style={{ color: t.successText }}>FREE</span> : <span style={{ color: t.textPrimary }}>{fmtPrice(shippingCost)}</span>}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs font-medium" style={{ color: t.successText }}>
                <span>Promo discount</span>
                <span>−{fmtPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-1.5" style={{ borderTop: `1px solid ${t.divider}` }}>
              <span style={{ color: t.textPrimary }}>Total</span>
              <span style={{ color: t.primary }}>{fmtPrice(total)}</span>
            </div>
          </div>
          <button
            onClick={() => { const dial = COUNTRY_CODES.find(c => c.code === phoneCountryCode)?.dial ?? '62'; onPlaceOrder(selectedPayId, selectedShippingId, { ...form, whatsapp: form.whatsapp ? `+${dial}${form.whatsapp}` : '' }); }}
            className="w-full py-3.5 text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: t.primary, color: t.primaryContrast, borderRadius: t.btnRadius }}
          >
            Place Order 🚀
          </button>
          <p className="text-[10px] text-center" style={{ color: t.textMuted }}>🔒 Secure &amp; protected payment</p>
        </div>
      </div>
    </div>
  );
}

function SuccessPage({ primaryColor, storeName, orderNum, total, onContinue, fmtPrice, paymentSettings, selectedPaymentId, buyerUser, onShowAuth, onMyOrders, layoutStyle }: {
  primaryColor: string; storeName: string; orderNum: string; total: number; fmtPrice: (n: number) => string;
  paymentSettings?: PaymentSettings; selectedPaymentId: string; layoutStyle?: string;
  onContinue: () => void;
  buyerUser?: BuyerUser | null;
  onShowAuth?: () => void;
  onMyOrders?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const allMethods = paymentSettings?.methods ?? DEFAULT_PAYMENT_METHODS;
  const payment = allMethods.find(m => m.id === selectedPaymentId) ?? allMethods.find(m => m.enabled);
  const waNumber = paymentSettings?.confirmationWhatsapp;
  const t = getCommerceTheme(primaryColor, layoutStyle);
  const { uiT } = useStoreFlags();
  const handleCopy = (text: string) => {
    safeClipboardWrite(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen" style={{ background: t.pageBg, fontFamily: t.fontFamily }}>
      <div className="max-w-lg mx-auto px-5 py-10">
        {/* Success badge */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl" style={{ background: t.primary }}>
            <Check className="w-9 h-9" style={{ color: t.primaryContrast }} />
          </div>
          <h1 className="text-2xl font-black mb-1" style={{ color: t.textPrimary }}>{uiT.orderReceived}</h1>
          <p className="text-sm" style={{ color: t.textSecondary }}>{uiT.thankYou} <span className="font-bold" style={{ color: t.primary }}>{storeName}</span></p>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: t.inputBg }}>
            <span className="text-xs" style={{ color: t.textMuted }}>{uiT.orderNum}</span>
            <span className="text-xs font-mono font-bold" style={{ color: t.textPrimary }}>{orderNum}</span>
          </div>
        </div>

        {/* Payment instructions */}
        {payment && (
          <div className="shadow-sm mb-4 overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <span className="text-xl">{PAYMENT_ICONS[payment.id] ?? PAYMENT_ICONS[payment.type] ?? '💳'}</span>
              <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>{uiT.paymentInstructions}</h3>
            </div>
            <div className="p-5">
              {payment.type === 'bank_transfer' && (
                <div className="space-y-4">
                  <div className="p-4 space-y-2.5" style={{ background: t.inputBg, borderRadius: t.inputRadius }}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: t.textMuted }}>Bank</span>
                      <span className="text-sm font-bold" style={{ color: t.textPrimary }}>{payment.bankName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: t.textMuted }}>Account Number</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono" style={{ color: t.textPrimary }}>{payment.accountNumber}</span>
                        <button onClick={() => handleCopy(payment.accountNumber ?? '')} className="p-1 rounded-lg transition-colors" style={{ background: t.surfaceBorder }}>
                          {copied ? <Check className="w-3.5 h-3.5" style={{ color: t.successText }} /> : <Copy className="w-3.5 h-3.5" style={{ color: t.textMuted }} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: t.textMuted }}>Account Name</span>
                      <span className="text-sm font-bold" style={{ color: t.textPrimary }}>{payment.accountHolder}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2.5 mt-2.5" style={{ borderTop: `1px solid ${t.divider}` }}>
                      <span className="text-xs" style={{ color: t.textMuted }}>Amount to Pay</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black" style={{ color: t.primary }}>{fmtPrice(total)}</span>
                        <button onClick={() => handleCopy(String(total))} className="p-1 rounded-lg transition-colors" style={{ background: t.surfaceBorder }}>
                          {copied ? <Check className="w-3.5 h-3.5" style={{ color: t.successText }} /> : <Copy className="w-3.5 h-3.5" style={{ color: t.textMuted }} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {payment.instructions && (
                    <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>{payment.instructions}</p>
                  )}
                </div>
              )}

              {payment.type === 'qris' && (
                <div className="text-center space-y-3">
                  <div className="w-36 h-36 rounded-2xl mx-auto flex items-center justify-center text-5xl" style={{ background: t.inputBg }}>📱</div>
                  <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>Total: <span style={{ color: t.primary }}>{fmtPrice(total)}</span></p>
                  {payment.instructions && <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>{payment.instructions}</p>}
                </div>
              )}

              {payment.type === 'cod' && (
                <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                  <span className="text-2xl">💵</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: t.textPrimary }}>Cash on Delivery</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: t.primary }}>Prepare {fmtPrice(total)}</p>
                    <p className="text-xs mt-1" style={{ color: t.textMuted }}>{payment.instructions ?? 'Have exact change ready when the courier arrives.'}</p>
                  </div>
                </div>
              )}

              {payment.type === 'ewallet' && (
                <div className="space-y-3">
                  <div className="p-4 space-y-2" style={{ background: t.inputBg, borderRadius: t.inputRadius }}>
                    <div className="flex justify-between"><span className="text-xs" style={{ color: t.textMuted }}>Send to</span><span className="text-sm font-bold" style={{ color: t.textPrimary }}>{payment.ewalletNumber}</span></div>
                    <div className="flex justify-between"><span className="text-xs" style={{ color: t.textMuted }}>Amount</span><span className="text-sm font-black" style={{ color: t.primary }}>{fmtPrice(total)}</span></div>
                  </div>
                  {payment.instructions && <p className="text-xs" style={{ color: t.textMuted }}>{payment.instructions}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* WhatsApp confirmation */}
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}?text=Hi%2C%20I%20have%20made%20payment%20for%20order%20*${orderNum}*%20totaling%20*${fmtPrice(total)}*%20%F0%9F%99%8F`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-3.5 text-sm font-bold text-white mb-4 hover:opacity-90 transition-opacity"
            style={{ background: '#25D366', borderRadius: t.btnRadius }}
          >
            <MessageCircle className="w-4 h-4" />
            Confirm via WhatsApp
          </a>
        )}

        {/* Status stepper */}
        <div className="shadow-sm p-5 mb-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: t.textMuted }}>Order Status</p>
          <div className="flex items-center">
            {[
              { icon: '📋', label: 'Processing', active: true },
              { icon: '📦', label: 'Packing', active: false },
              { icon: '🚚', label: 'Shipped', active: false },
              { icon: '✅', label: 'Delivered', active: false },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-base border-2"
                    style={step.active ? { borderColor: t.primary, background: alpha(t.primary, 0.08) } : { borderColor: t.divider, background: t.inputBg }}>
                    {step.icon}
                  </div>
                  <p className="text-[9px] font-semibold mt-1 text-center"
                    style={{ color: step.active ? t.primary : t.textMuted }}>
                    {step.label}
                  </p>
                </div>
                {i < arr.length - 1 && <div className="flex-1 h-px mx-1 mb-4" style={{ background: t.divider }} />}
              </div>
            ))}
          </div>
        </div>

        <button onClick={onContinue} className="w-full py-3.5 text-sm font-bold hover:opacity-90 transition-opacity" style={{ background: t.primary, color: t.primaryContrast, borderRadius: t.btnRadius }}>
          Continue Shopping
        </button>

        {/* Buyer auth prompt */}
        {!buyerUser && onShowAuth && (
          <div className="mt-3 p-3 rounded-xl text-center" style={{ background: t.inputBg }}>
            <p className="text-xs mb-1.5" style={{ color: t.textMuted }}>Want to track this order anytime?</p>
            <button onClick={onShowAuth} className="text-xs font-semibold" style={{ color: t.primary }}>
              Create a free account →
            </button>
          </div>
        )}
        {buyerUser && onMyOrders && (
          <button onClick={onMyOrders} className="w-full mt-3 py-2.5 text-sm font-medium transition-colors" style={{ borderRadius: t.btnRadius, border: `1px solid ${t.surfaceBorder}`, color: t.textSecondary, background: t.surfaceBg }}>
            View My Orders
          </button>
        )}
      </div>
    </div>
  );
}

// ── Shared section components ────────────────────────────────────────────────

function PromoBar({ text, primaryColor, editMode, onFieldChange }: { text: string; primaryColor: string; editMode?: boolean; onFieldChange?: (f: string, v: string) => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (!text || dismissed) return null;
  const dark = isDark(primaryColor);
  return (
    <div data-editor-section="promoBar" className="flex items-center justify-center gap-3 px-8 py-2.5 relative" style={{ background: primaryColor }}>
      <p className="text-xs font-semibold text-center" style={{ color: dark ? '#fff' : '#111' }}>
        <EditSpan field="promoBar" value={text} editMode={editMode} onFieldChange={onFieldChange} singleLine />
      </p>
      {!editMode && <button onClick={() => setDismissed(true)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity text-sm font-bold" style={{ color: dark ? '#fff' : '#111' }}>✕</button>}
    </div>
  );
}

function StatsRow({ stats, primaryColor, dark = false, device, editMode, onFieldChange }: { stats: Array<{ value: string; label: string }>; primaryColor: string; dark?: boolean; device?: DeviceMode; editMode?: boolean; onFieldChange?: (f: string, v: string) => void }) {
  const isMobile = device === 'mobile';
  const tt = getDefaultTokenTheme(primaryColor);
  if (!stats?.length) return null;
  return (
    <div data-editor-section="stats" className="border-y" style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : tt.divider }}>
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid grid-cols-3 divide-x" style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : tt.divider }}>
          {stats.map((s, i) => (
            <div key={i} className={`text-center px-4 ${isMobile ? 'py-5' : 'py-8'}`}>
              <p className={`font-black ${isMobile ? 'text-2xl' : 'text-3xl'}`} style={{ color: primaryColor }}>
                <EditSpan field={`stats.${i}.value`} value={s.value} editMode={editMode} onFieldChange={onFieldChange} singleLine />
              </p>
              <p className="text-xs mt-1 font-medium tracking-wide" style={{ color: dark ? 'rgba(255,255,255,0.5)' : tt.textMuted }}>
                <EditSpan field={`stats.${i}.label`} value={s.label} editMode={editMode} onFieldChange={onFieldChange} singleLine />
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrustBadgesRow({ badges, primaryColor, dark = false, device, editMode, onFieldChange }: { badges: Array<{ icon: string; text: string }>; primaryColor: string; dark?: boolean; device?: DeviceMode; editMode?: boolean; onFieldChange?: (f: string, v: string) => void }) {
  const isMobile = device === 'mobile';
  const tt = getDefaultTokenTheme(primaryColor);
  if (!badges?.length) return null;
  return (
    <div data-editor-section="trust" className="border-y" style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : tt.divider }}>
      <div style={dark ? {} : { background: tt.surfaceBg, opacity: 0.97 }}>
        <div className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-2.5 gap-4' : 'py-3.5 gap-6'} flex items-center justify-center flex-wrap`}>
          {badges.map((b, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <EmojiIcon emoji={b.icon} size={isMobile ? 14 : 16} color={dark ? 'rgba(255,255,255,0.6)' : tt.textSecondary} strokeWidth={1.75} />
              <span className={`${isMobile ? 'text-[11px]' : 'text-xs'} font-semibold`} style={{ color: dark ? 'rgba(255,255,255,0.6)' : tt.textSecondary }}>
                <EditSpan field={`trustBadges.${i}.text`} value={b.text} editMode={editMode} onFieldChange={onFieldChange} singleLine />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FAQSection({ faq, primaryColor, device, dark = false, elegant = false, editMode, onFieldChange, sectionHeadings }: {
  faq: Array<{ q: string; a: string }>;
  primaryColor: string;
  device: DeviceMode;
  dark?: boolean;
  elegant?: boolean;
  editMode?: boolean;
  onFieldChange?: (f: string, v: string) => void;
  sectionHeadings?: { faq?: string; [key: string]: string | undefined };
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isMobileInFaq = device === 'mobile';
  const tt = getDefaultTokenTheme(primaryColor);
  if (!faq?.length) return null;
  return (
    <section data-editor-section="faq" className={isMobileInFaq ? 'py-8' : 'py-14'} style={dark ? { background: 'rgba(255,255,255,0.03)' } : elegant ? { background: '#fdfcf8' } : { background: tt.pageBg }}>
      <div className="max-w-3xl mx-auto px-5">
        <div className="text-center mb-9">
          {elegant ? (
            <>
              <p className="text-[10px] tracking-[0.35em] mb-3" style={{ color: primaryColor }}>QUESTIONS</p>
              <h2 className="text-xl font-bold tracking-wide" style={{ color: '#2a2420' }}>
                <EditSpan field="sectionHeadings.faq" value={sectionHeadings?.faq ?? 'Frequently Asked'} editMode={editMode} onFieldChange={onFieldChange} singleLine />
              </h2>
              <div className="w-12 h-px mx-auto mt-4" style={{ background: primaryColor }} />
            </>
          ) : (
            <h2 className="text-2xl font-bold" style={{ color: dark ? '#fff' : tt.textPrimary }}>
              <EditSpan field="sectionHeadings.faq" value={sectionHeadings?.faq ?? 'Frequently Asked Questions'} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </h2>
          )}
        </div>
        <div className="space-y-2">
          {faq.map((item, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border transition-all cursor-pointer"
              style={dark
                ? { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }
                : elegant
                  ? { borderColor: tt.surfaceBorder, background: tt.surfaceBg }
                  : { borderColor: tt.divider, background: tt.surfaceBg }}>
              <button onClick={() => !editMode && setOpenIndex(openIndex === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                <EditSpan field={`faq.${i}.q`} value={item.q} editMode={editMode} onFieldChange={onFieldChange} singleLine
                  className="text-sm font-semibold pr-4"
                  style={{ color: dark ? '#fff' : elegant ? '#2a2420' : tt.textPrimary }} />
                {!editMode && <span className="text-xl flex-shrink-0 transition-transform duration-200 font-light" style={{ color: primaryColor, display: 'inline-block', transform: openIndex === i ? 'rotate(45deg)' : 'none' }}>+</span>}
              </button>
              {(editMode || openIndex === i) && (
                <div className="px-5 pb-5 text-sm leading-relaxed"
                  style={{ color: dark ? 'rgba(255,255,255,0.6)' : elegant ? '#6b5e52' : tt.textSecondary, ...(elegant ? { fontFamily: 'system-ui' } : {}) }}>
                  <EditSpan field={`faq.${i}.a`} value={item.a} editMode={editMode} onFieldChange={onFieldChange} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSection({ newsletter, primaryColor, dark = false, elegant = false, device, editMode, onFieldChange }: {
  newsletter: { headline: string; subtext: string };
  primaryColor: string;
  dark?: boolean;
  elegant?: boolean;
  device?: DeviceMode;
  editMode?: boolean;
  onFieldChange?: (f: string, v: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const isMobile = device === 'mobile';
  const tt = getDefaultTokenTheme(primaryColor);
  if (!newsletter) return null;
  const inverted = dark || elegant;
  return (
    <section data-editor-section="newsletter" className={isMobile ? 'py-8' : 'py-14'}>
      <div className="max-w-xl mx-auto px-5">
        <div className={`rounded-3xl ${isMobile ? 'p-5' : 'p-8'} text-center`} style={
          dark ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' } :
          elegant ? { background: '#2a2420' } :
          { background: `linear-gradient(135deg, ${alpha(primaryColor, 0.09)}, ${alpha(primaryColor, 0.04)})`, border: `1px solid ${alpha(primaryColor, 0.12)}` }
        }>
          <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mb-3`} style={{ color: inverted ? '#fff' : '#111' }}>
            <EditSpan field="newsletter.headline" value={newsletter.headline} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
          <p className={`text-sm ${isMobile ? 'mb-5' : 'mb-7'} leading-relaxed`} style={{ color: inverted ? 'rgba(255,255,255,0.6)' : tt.textSecondary }}>
            <EditSpan field="newsletter.subtext" value={newsletter.subtext} editMode={editMode} onFieldChange={onFieldChange} />
          </p>
          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold" style={{ color: inverted ? '#fff' : primaryColor }}>
              <span>✓</span> You're on the list!
            </div>
          ) : (
            <div className={`flex ${isMobile ? 'flex-col' : ''} gap-2`}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address"
                className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                style={inverted ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' } : { background: '#fff', border: `1px solid ${alpha(primaryColor, 0.2)}`, color: '#111' }} />
              <button onClick={() => email && setSubmitted(true)} className="px-5 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 flex-shrink-0" style={{ background: primaryColor, color: isDark(primaryColor) ? '#fff' : '#111' }}>
                Subscribe
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Buyer Auth Modal ──────────────────────────────────────────────────────────

function BuyerAuthModal({ primaryColor, onClose, onSuccess, onLogout, buyerEmail }: {
  primaryColor: string;
  onClose: () => void;
  onSuccess: (user: BuyerUser) => void;
  onLogout: () => void;
  buyerEmail: string | null;
}) {
  const [tab, setTab] = useState<'login' | 'register'>(buyerEmail ? 'login' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const btnText = isDark(primaryColor) ? '#fff' : '#111';

  // If already logged in, show account panel
  if (buyerEmail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: primaryColor }}>
              {buyerEmail[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">My Account</p>
              <p className="text-xs text-slate-400 truncate max-w-[180px]">{buyerEmail}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-100 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) onSuccess({ id: data.user.id, email: data.user.email ?? email });
        onClose();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { data: { name } },
        });
        if (error) throw error;
        if (data.user) onSuccess({ id: data.user.id, email: data.user.email ?? email });
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4" onClick={e => e.stopPropagation()}>
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'register' && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400"
          />
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 pr-9"
            />
            <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ background: primaryColor, color: btnText }}
          >
            {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Mobile Menu Drawer ────────────────────────────────────────────────────────

function MobileMenuDrawer({ open, onClose, navLinks, primaryColor, storeName, onScrollToProducts }: {
  open: boolean; onClose: () => void; navLinks: string[]; primaryColor: string; storeName: string;
  onScrollToProducts?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-bold text-gray-900">{storeName}</span>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg text-lg leading-none">✕</button>
        </div>
        <nav className="p-4 space-y-1">
          {navLinks.map((l, i) => (
            <button key={l} onClick={() => { onScrollToProducts?.(); onClose(); }}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-50"
              style={i === 0 ? { color: primaryColor, background: alpha(primaryColor, 0.08) } : { color: '#374151' }}>
              {l}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// ── Search Overlay ────────────────────────────────────────────────────────────

function SearchOverlay({ open, onClose, products, primaryColor, onProductClick, fmtPrice }: {
  open: boolean; onClose: () => void; products: RichProduct[]; primaryColor: string;
  onProductClick: (p: RichProduct) => void; fmtPrice: (n: number) => string;
}) {
  const [query, setQuery] = useState('');
  const results = query.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase()))
    : [];
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-start justify-center" style={{ paddingTop: '15vh' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search products…" className="flex-1 text-sm outline-none bg-transparent" />
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!query.trim() && <p className="text-center py-8 text-sm text-gray-400">Start typing to search products…</p>}
          {query.trim() && results.length === 0 && <p className="text-center py-8 text-sm text-gray-400">No results for &quot;{query}&quot;</p>}
          {results.map(p => (
            <button key={p.id} onClick={() => { onProductClick(p); onClose(); setQuery(''); }}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-400">{p.category}</p>
              </div>
              <span className="text-sm font-bold flex-shrink-0" style={{ color: primaryColor }}>{fmtPrice(p.price)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── My Orders Page ────────────────────────────────────────────────────────────

function MyOrdersPage({ buyerUserId, primaryColor, storeName, storeId, onBack, fmtPrice, layoutStyle }: {
  buyerUserId: string;
  primaryColor: string;
  storeName: string;
  storeId: string;
  onBack: () => void;
  fmtPrice: (n: number) => string;
  layoutStyle?: string;
}) {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const t = getCommerceTheme(primaryColor, layoutStyle);

  useEffect(() => {
    fetch(`/api/orders?buyerUserId=${buyerUserId}`)
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [buyerUserId]);

  const STATUS_COLOR: Record<string, string> = {
    Processing: '#f59e0b',
    Shipped: '#3b82f6',
    Completed: '#10b981',
  };

  return (
    <div className="min-h-screen" style={{ background: t.pageBg, fontFamily: t.fontFamily }}>
      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}` }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg transition-colors" style={{ color: t.textMuted }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold" style={{ color: t.textPrimary }}>My Orders</span>
          <span className="ml-1 text-xs" style={{ color: t.textMuted }}>— {storeName}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        {loading ? (
          <div className="text-center py-16 text-sm" style={{ color: t.textMuted }}>Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-10 h-10 mx-auto mb-3" style={{ color: t.divider }} />
            <p className="text-sm font-medium" style={{ color: t.textMuted }}>No orders yet</p>
            <button onClick={onBack} className="mt-4 text-sm font-semibold" style={{ color: t.primary }}>
              Start Shopping →
            </button>
          </div>
        ) : (
          orders.map((o: Record<string, unknown>) => {
            const items = Array.isArray(o.items) ? o.items as Record<string, unknown>[] : [];
            const status = (o.status as string) ?? 'Processing';
            const total = Number(o.total ?? 0);
            const date = new Date(o.created_at as string).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <div key={o.id as string} className="p-4 space-y-3" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold" style={{ color: t.textPrimary }}>{o.id as string}</span>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full text-white" style={{ background: STATUS_COLOR[status] ?? '#94a3b8' }}>
                    {status}
                  </span>
                </div>
                {items.slice(0, 2).map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {item.image
                      ? <img src={item.image as string} alt={item.name as string} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" style={{ background: t.inputBg }} />
                      : <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: t.inputBg }}><Package className="w-4 h-4" style={{ color: t.textMuted }} /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: t.textPrimary }}>{item.name as string}</p>
                      <p className="text-xs" style={{ color: t.textMuted }}>x{item.qty as number}</p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>{fmtPrice(Number(item.subtotal ?? 0))}</span>
                  </div>
                ))}
                {items.length > 2 && <p className="text-xs" style={{ color: t.textMuted }}>+{items.length - 2} more item(s)</p>}
                <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${t.divider}` }}>
                  <span className="text-xs" style={{ color: t.textMuted }}>{date}</span>
                  <span className="text-sm font-bold" style={{ color: t.primary }}>{fmtPrice(total)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── User profile dropdown (shared across all layouts) ────────────────────────

function UserProfileMenu({ buyerEmail, onUserClick, onWishlistClick, wishlistCount, iconColor, hoverClass }: {
  buyerEmail: string | null;
  onUserClick: () => void;
  onWishlistClick: () => void;
  wishlistCount: number;
  iconColor: string;
  hoverClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const { showWishlist } = useStoreFlags();

  if (!buyerEmail) {
    return (
      <button onClick={onUserClick} className={`relative p-2 transition-colors ${hoverClass ?? ''}`} title="Sign in" style={{ color: iconColor }}>
        <User className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative p-2 transition-colors ${hoverClass ?? ''}`}
        title={buyerEmail}
        style={{ color: iconColor }}
      >
        <User className="w-4 h-4" />
        <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 w-48">
            <div className="px-3 py-2 border-b border-slate-50">
              <p className="text-xs text-slate-400 truncate">{buyerEmail}</p>
            </div>
            <button
              onClick={() => { setOpen(false); onUserClick(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
            >
              <Package className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              My Orders
            </button>
            {showWishlist && (
              <button
                onClick={() => { setOpen(false); onWishlistClick(); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <Heart className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                Wishlist
                {wishlistCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600">{wishlistCount}</span>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Wishlist page ──────────────────────────────────────────────────────────────

function WishlistPage({ wishlist, products, onToggleWishlist, onAddToCart, onProductClick, onBack, primaryColor, storeName, fmtPrice, layoutStyle, device }: {
  wishlist: Set<string>;
  products: RichProduct[];
  onToggleWishlist: (id: string) => void;
  onAddToCart: (p: RichProduct, sourceRect?: DOMRect) => void;
  onProductClick: (p: RichProduct) => void;
  onBack: () => void;
  primaryColor: string;
  storeName: string;
  fmtPrice: (amount: number) => string;
  layoutStyle?: string;
  device: DeviceMode;
}) {
  const t = getCommerceTheme(primaryColor, layoutStyle);
  const { uiT } = useStoreFlags();
  const wishlisted = products.filter(p => wishlist.has(p.id));
  const isMobile = device === 'mobile';

  return (
    <div style={{ minHeight: '100vh', background: t.pageBg, fontFamily: t.fontFamily }}>
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 h-14 flex items-center gap-3" style={{ background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}` }}>
        <button onClick={onBack} className="p-2 rounded-xl transition-colors" style={{ color: t.textMuted }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Heart className="w-4 h-4 flex-shrink-0 fill-rose-500 text-rose-500" />
          <span className="font-bold text-sm" style={{ color: t.textPrimary }}>{uiT.yourWishlist}</span>
          {wishlisted.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: t.inputBg, color: t.textSecondary }}>
              {wishlisted.length}
            </span>
          )}
        </div>
        <span className="text-xs font-medium truncate max-w-[120px]" style={{ color: t.textMuted }}>{storeName}</span>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {wishlisted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: t.inputBg }}>
              <Heart className="w-8 h-8" style={{ color: t.textMuted }} />
            </div>
            <p className="font-semibold mb-1.5" style={{ color: t.textPrimary }}>No items yet</p>
            <p className="text-sm" style={{ color: t.textMuted }}>Tap the ♡ on any product to save it here.</p>
            <button
              onClick={onBack}
              className="mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-85"
              style={{ background: t.primary, color: t.primaryContrast }}
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
            {wishlisted.map(p => (
              <div
                key={p.id}
                className="rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
                onClick={() => onProductClick(p)}
              >
                <div className="relative aspect-square" style={{ background: t.inputBg }}>
                  <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
                  {p.badge && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: t.primary }}>
                      {p.badge}
                    </span>
                  )}
                  <button
                    data-wishlist-btn=""
                    onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95" style={{ background: t.surfaceBg }}
                    title="Remove from wishlist"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-xs truncate mb-0.5" style={{ color: t.textMuted }}>{p.category}</p>
                  <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>{p.name}</p>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="text-sm font-bold" style={{ color: t.primary }}>{fmtPrice(p.price)}</span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const btn = e.currentTarget as HTMLElement;
                        onAddToCart(p, getProductImgRect(btn));
                      }}
                      className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-85"
                      style={{ background: t.primary, color: t.primaryContrast }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MINIMAL layout ────────────────────────────────────────────────────────────
// Inspired by: COS, Aesop, Muji — editorial, clean, whitespace-forward

function MinimalLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen, wishlist, onToggleWishlist, onWishlistClick, editMode, onFieldChange }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks = [], products = [], collections = [], features = [], testimonials = [], tagline, faq = [], stats = [], promoBar, newsletter, trustBadges = [], brandStory, sectionHeadings, footerNote } = design;
  const btnText = isDark(primaryColor) ? '#fff' : '#111';
  const isMobile = device === 'mobile';
  const tt = getDefaultTokenTheme(primaryColor);
  const [selectedCol, setSelectedCol] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth' });
  const displayed = selectedCol === 0 ? products : products.filter((_, i) => i % 2 === selectedCol - 1);
  const defaultFooterNote = `© 2026 ${storeName} · All rights reserved`;

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: tt.pageBg }}>

      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={navLinks} primaryColor={primaryColor} storeName={storeName} onScrollToProducts={scrollToProducts} />

      {/* Header */}
      <header className="backdrop-blur-sm border-b sticky top-0 z-40" style={{ background: `${tt.headerBg}f5`, borderColor: tt.headerBorder }}>
        <div className="max-w-6xl mx-auto px-5 h-15 flex items-center justify-between" style={{ height: '56px' }}>
          <span className="text-sm font-black tracking-[0.18em] uppercase" style={{ color: tt.textPrimary }}>
            <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </span>
          {!isMobile ? (
            <nav className="flex gap-8">
              {navLinks.map((l, li) => <a key={li} onClick={editMode ? undefined : scrollToProducts} className="text-xs uppercase tracking-wider transition-colors font-medium cursor-pointer" style={{ color: tt.textMuted }}><EditSpan field={`navLinks.${li}`} value={l} editMode={editMode} onFieldChange={onFieldChange} singleLine /></a>)}
            </nav>
          ) : (
            <button onClick={() => setMenuOpen(true)} className="p-2 rounded-lg" style={{ color: tt.textSecondary }}><Menu className="w-5 h-5" /></button>
          )}
          <div className="flex items-center gap-1">
            {!isMobile && <button onClick={onSearchOpen} className="p-2 rounded-lg transition-colors" style={{ color: tt.textMuted }}><Search className="w-4 h-4" /></button>}
            <button data-wishlist-nav="" onClick={onWishlistClick} className="relative p-2 rounded-lg transition-colors" style={{ color: tt.textMuted }}>
              <Heart className="w-4 h-4" />
              {wishlist.size > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center bg-rose-500">{wishlist.size}</span>}
            </button>
            <button data-cart-btn onClick={onCartClick} className="relative p-2 rounded-lg transition-colors" style={{ color: tt.textMuted }}>
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: primaryColor }}>{cartCount}</span>}
            </button>
            <UserProfileMenu buyerEmail={buyerEmail} onUserClick={onUserClick} onWishlistClick={onWishlistClick} wishlistCount={wishlist.size} iconColor={tt.textMuted} hoverClass="rounded-lg" />
          </div>
        </div>
      </header>

      {promoBar && <PromoBar text={promoBar} primaryColor={primaryColor} editMode={editMode} onFieldChange={onFieldChange} />}

      {/* Hero */}
      {isMobile ? (
        <section data-editor-section="hero" style={{ background: '#f5f4f0' }}>
          {/* Mobile: image first, text below */}
          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden">
              <ProductImg src={products[0]?.image} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-4 right-4 rounded-2xl px-3.5 py-2.5 shadow-lg" style={{ background: tt.surfaceBg }}>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: tt.textMuted }}>{products[0]?.category}</p>
              <p className="text-xs font-bold max-w-[100px] truncate" style={{ color: tt.textPrimary }}>{products[0]?.name}</p>
              <p className="text-xs font-black mt-0.5" style={{ color: primaryColor }}>{fmtPrice(products[0]?.price ?? 0)}</p>
            </div>
          </div>
          <div className="px-5 py-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-4 flex items-center gap-1.5" style={{ color: primaryColor }}>
              {collections[0]?.emoji} {tagline}
            </p>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight mb-4" style={{ color: tt.textPrimary }}>
              <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </h1>
            <p className="text-sm leading-relaxed mb-7" style={{ color: tt.textSecondary }}>
              <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
            </p>
            <button onClick={editMode ? undefined : scrollToProducts} className="w-full py-3.5 text-sm font-bold uppercase tracking-wider rounded-full" style={{ background: primaryColor, color: btnText }}>
              <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </button>
          </div>
        </section>
      ) : (
        <section data-editor-section="hero" style={{ background: '#f5f4f0' }}>
          <div className="max-w-6xl mx-auto px-5 py-16 grid grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-5 flex items-center gap-1.5" style={{ color: primaryColor }}>
                {collections[0]?.emoji} {tagline}
              </p>
              <h1 className="text-5xl font-black leading-[1.02] tracking-tight mb-5" style={{ color: tt.textPrimary }}>
                <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
              </h1>
              <p className="text-sm leading-relaxed mb-8 max-w-sm" style={{ color: tt.textSecondary }}>
                <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
              </p>
              <div className="flex items-center gap-4">
                <button onClick={editMode ? undefined : scrollToProducts} className="px-7 py-3 text-xs font-bold uppercase tracking-wider rounded-full hover:opacity-85 transition-opacity" style={{ background: primaryColor, color: btnText }}>
                  <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                </button>
                <button onClick={scrollToProducts} className="text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5" style={{ color: tt.textMuted }}>
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                <ProductImg src={products[0]?.image} alt="" className="w-full h-full object-cover" />
              </div>
              {/* Floating product card */}
              <div className="absolute -bottom-6 -left-8 rounded-2xl p-4 shadow-2xl" style={{ maxWidth: '190px', background: tt.surfaceBg, border: `1px solid ${tt.surfaceBorder}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <ProductImg src={products[1]?.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: tt.textMuted }}>{products[1]?.category}</p>
                    <p className="text-xs font-bold truncate" style={{ color: tt.textPrimary }}>{products[1]?.name}</p>
                    <p className="text-xs font-black mt-0.5" style={{ color: primaryColor }}>{fmtPrice(products[1]?.price ?? 0)}</p>
                  </div>
                </div>
              </div>
              {/* Collection pill */}
              <div className="absolute -top-4 -right-4 rounded-full px-4 py-2 shadow-xl text-xs font-bold" style={{ background: tt.surfaceBg, borderColor: tt.divider, border: `1px solid ${tt.divider}`, color: tt.textSecondary }}>
                {collections[1]?.emoji} {collections[1]?.name}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Collections strip */}
      <div className="border-y" style={{ background: tt.pageBg, borderColor: tt.divider }}>
        <div className="max-w-6xl mx-auto px-5 py-3 flex gap-2.5 overflow-x-auto">
          {collections.map((c, i) => (
            <button key={i} onClick={() => setSelectedCol(i)} className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wide uppercase transition-all"
              style={selectedCol === i ? { background: primaryColor, color: btnText } : { background: '#f3f2ef', color: '#555' }}>
              <span>{editMode ? <StyleOnlySpan field={`collections.${i}.emojiHtml`} value={c.emoji} htmlValue={c.emojiHtml} editMode={editMode} onFieldChange={onFieldChange} /> : c.emoji}</span>
              <span>{editMode ? <StyleOnlySpan field={`collections.${i}.nameHtml`} value={c.name} htmlValue={c.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /> : c.name}</span>
            </button>
          ))}
        </div>
      </div>
      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} />}

      {/* Products */}
      <section ref={productsRef} className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-14'}`}>
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] mb-1.5" style={{ color: tt.textMuted }}>Curated Selection</p>
            <h2 className="text-xl font-black tracking-tight" style={{ color: tt.textPrimary }}><EditSpan field="sectionHeadings.products" value={sectionHeadings?.products ?? 'Featured Products'} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h2>
          </div>
          <button onClick={scrollToProducts} className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:gap-2.5 transition-all" style={{ color: primaryColor }}>
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className={`grid ${gridCols(device)} gap-4`}>
          {displayed.map(p => (
            <div key={p.id} className="group cursor-pointer" onClick={() => onProductClick(p)}>
              <div className="relative overflow-hidden rounded-2xl mb-3" style={{ aspectRatio: isMobile ? '3/4' : '3/4', background: tt.surfaceBg }}>
                {/* ProductImg: Remove transition-transform and group-hover:scale-105 in edit mode */}
                <ProductImg
                  src={p.image}
                  alt={p.name}
                  fallback={p.imageFallback}
                  className={`w-full h-full object-cover ${editMode ? '' : 'group-hover:scale-105 transition-transform duration-700'}`}
                />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white" style={{ background: primaryColor }}>{p.badge}</span>
                )}
                {/* Quick add button: Remove transition-transform and translate in edit mode */}
                <div className={`absolute bottom-0 inset-x-0 p-3 ${editMode ? '' : 'transition-transform duration-200'} ${isMobile || editMode ? '' : 'translate-y-full group-hover:translate-y-0'}`}>
                  <button
                    onClick={e => { e.stopPropagation(); const _btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(_btn)); }}
                    className="w-full py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl text-white shadow-lg"
                    style={{ background: primaryColor }}
                  >
                    + Add to Cart
                  </button>
                </div>
                {/* Wishlist button: Remove transition-all and hover:scale in edit mode */}
                <button
                  data-wishlist-btn=""
                  onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                  className={`absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow ${editMode ? '' : 'transition-all hover:scale-110 active:scale-95'} ${isMobile || editMode ? '' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <Heart className={`w-3.5 h-3.5 ${editMode ? '' : 'transition-colors'} ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(p.id) ? undefined : { color: tt.textMuted }} />
                </button>
              </div>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: tt.textMuted }}>{p.category}</p>
              <p className="text-sm font-bold truncate" style={{ color: tt.textPrimary }}>{p.name}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm font-black" style={{ color: tt.textPrimary }}>{fmtPrice(p.price)}</span>
                {p.originalPrice && <span className="text-xs line-through" style={{ color: tt.textMuted }}>{fmtPrice(p.originalPrice)}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Reorderable sections */}
      {(() => {
        const sectionOrder = design.sectionOrder ?? ['brandStory', 'features', 'testimonials', 'stats', 'faq', 'newsletter'];
        const sectionMap: Record<string, React.ReactNode> = {
          brandStory: brandStory ? (
            <section key="brandStory" data-editor-section="brandStory" className={isMobile ? 'py-8' : 'py-14'} style={{ background: '#f5f4f0' }}>
              <div className="max-w-2xl mx-auto px-5 text-center">
                <div className="text-4xl mb-5 opacity-20" style={{ color: primaryColor }}>&ldquo;</div>
                <p className={`${isMobile ? 'text-base' : 'text-lg'} font-medium leading-relaxed italic`} style={{ color: tt.textSecondary }}>
                  <EditSpan field="brandStory" value={brandStory} editMode={editMode} onFieldChange={onFieldChange} />
                </p>
              </div>
            </section>
          ) : null,
          features: features.length > 0 ? (
            <section key="features" data-editor-section="features" className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-14'}`}>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-6'}`}>
                <DraggableList items={features} field="features" editMode={editMode}>
                  {(f, i) => (
                  <div key={i} className="flex items-start gap-4 p-6 rounded-2xl border hover:shadow-md transition-all" style={{ borderColor: tt.divider }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: alpha(primaryColor, 0.1) }}>
                      <EmojiIcon emoji={f.icon} size={20} color={primaryColor} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wide mb-1" style={{ color: tt.textPrimary }}>
                        <EditSpan field={`features.${i}.title`} value={f.title} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                      </h3>
                      <p className="text-xs leading-relaxed" style={{ color: tt.textSecondary }}>
                        <EditSpan field={`features.${i}.description`} value={f.description} editMode={editMode} onFieldChange={onFieldChange} />
                      </p>
                    </div>
                  </div>
                  )}
                </DraggableList>
              </div>
            </section>
          ) : null,
          testimonials: testimonials.length > 0 ? (
            <section key="testimonials" data-editor-section="testimonials" style={{ background: '#f5f4f0' }} className={isMobile ? 'py-8' : 'py-14'}>
              <div className="max-w-6xl mx-auto px-5">
                <p className="text-[10px] uppercase tracking-[0.25em] mb-2 text-center" style={{ color: tt.textMuted }}>Reviews</p>
                <h2 className="text-xl font-black text-center mb-9" style={{ color: tt.textPrimary }}>
                  <EditSpan field="sectionHeadings.testimonials" value={sectionHeadings?.testimonials ?? 'What Customers Say'} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                </h2>
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-5`}>
                  <DraggableList items={testimonials} field="testimonials" editMode={editMode}>
                    {(t, i) => (
                      <div className="rounded-3xl p-6 shadow-sm" style={{ background: tt.surfaceBg }}>
                        <Stars n={t.rating} />
                        <p className="text-sm leading-relaxed mt-3 mb-5 italic" style={{ color: tt.textSecondary }}>
                          &ldquo;<EditSpan field={`testimonials.${i}.text`} value={t.text} editMode={editMode} onFieldChange={onFieldChange} />&rdquo;
                        </p>
                        <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: tt.divider }}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: primaryColor }}>
                            {t.author[0]}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide" style={{ color: tt.textPrimary }}>
                              <EditSpan field={`testimonials.${i}.author`} value={t.author} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: tt.textMuted }}>
                              <EditSpan field={`testimonials.${i}.role`} value={t.role} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </DraggableList>
                </div>
              </div>
            </section>
          ) : null,
          stats: stats?.length ? <StatsRow key="stats" stats={stats} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} /> : null,
          faq: faq?.length ? <FAQSection key="faq" faq={faq} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} sectionHeadings={sectionHeadings} /> : null,
          newsletter: newsletter ? <NewsletterSection key="newsletter" newsletter={newsletter} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} /> : null,
        };
        return sectionOrder.map(type => sectionMap[type] ?? null);
      })()}

      {/* Footer */}
      <footer className="border-t py-10" style={{ background: tt.pageBg, borderColor: tt.divider }}>
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: tt.textPrimary }}>
            <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </span>
          <p className="text-xs italic" style={{ color: tt.textMuted }}>
            <EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
          <p className="text-xs" style={{ color: tt.textMuted }}>
            <EditSpan field="footerNote" value={footerNote ?? defaultFooterNote} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── BOLD layout ───────────────────────────────────────────────────────────────
// Inspired by: Nike, OFF-WHITE, Supreme — dark, high-energy, high contrast

function BoldLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen: _onSearchOpen, wishlist, onToggleWishlist, onWishlistClick, editMode, onFieldChange }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks = [], products = [], collections = [], features = [], testimonials = [], tagline, accentColor, faq = [], stats = [], promoBar, newsletter, trustBadges = [], brandStory, sectionHeadings, footerNote } = design;
  const defaultFooterNote = `© 2026 ${storeName} · All rights reserved`;
  const isMobile = device === 'mobile';
  const [selectedCol, setSelectedCol] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth' });
  const displayed = selectedCol === 0 ? products : products.filter((_, i) => i % 2 === selectedCol - 1);

  return (
    <div className="bg-[#0a0a0a]" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={navLinks} primaryColor={primaryColor} storeName={storeName} onScrollToProducts={scrollToProducts} />

      {/* Header */}
      <header className="bg-[#0a0a0a]/96 backdrop-blur-sm border-b border-white/8 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between" style={{ height: '56px' }}>
          <span className="text-sm font-black uppercase tracking-[0.18em] text-white">
            <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </span>
          {!isMobile ? (
            <nav className="flex gap-7">
              {navLinks.map((l, li) => <a key={li} onClick={editMode ? undefined : scrollToProducts} className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors cursor-pointer"><EditSpan field={`navLinks.${li}`} value={l} editMode={editMode} onFieldChange={onFieldChange} singleLine /></a>)}
            </nav>
          ) : (
            <button onClick={() => setMenuOpen(true)} className="p-2 text-white/60"><Menu className="w-5 h-5" /></button>
          )}
          <div className="flex items-center gap-1">
            <button data-wishlist-nav="" onClick={onWishlistClick} className="relative p-2 text-white/50 hover:text-white transition-colors">
              <Heart className="w-5 h-5" />
              {wishlist.size > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold text-black rounded-full flex items-center justify-center bg-rose-500">{wishlist.size}</span>}
            </button>
            <button data-cart-btn onClick={onCartClick} className="relative p-2 text-white/50 hover:text-white transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold text-black rounded-full flex items-center justify-center" style={{ background: primaryColor }}>{cartCount}</span>}
            </button>
            <UserProfileMenu buyerEmail={buyerEmail} onUserClick={onUserClick} onWishlistClick={onWishlistClick} wishlistCount={wishlist.size} iconColor="rgba(255,255,255,0.5)" hoverClass="hover:text-white" />
          </div>
        </div>
      </header>

      {promoBar && <PromoBar text={promoBar} primaryColor={primaryColor} editMode={editMode} onFieldChange={onFieldChange} />}

      {/* Hero */}
      <section data-editor-section="hero" className="relative overflow-hidden" style={{ minHeight: isMobile ? '75vh' : '82vh', display: 'flex', alignItems: 'center' }}>
        {/* Background image */}
        <div className="absolute inset-0">
          <ProductImg src={products[0]?.image} alt="" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(145deg, #0a0a0a 50%, ${alpha(primaryColor, 0.25)})` }} />
        </div>
        {/* Primary color side accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: primaryColor }} />
        <div className="relative max-w-6xl mx-auto px-5 py-16 w-full">
          <div className="mb-6">
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full border" style={{ borderColor: alpha(primaryColor, 0.6), color: primaryColor, background: alpha(primaryColor, 0.08) }}>
              {collections[0]?.emoji} {tagline}
            </span>
          </div>
          <h1 className={`font-black text-white leading-[0.93] tracking-tight mb-7 ${isMobile ? 'text-[2.5rem]' : 'text-[5.5rem]'}`}
            style={{ textShadow: `0 0 80px ${alpha(primaryColor, 0.35)}` }}>
            <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </h1>
          <p className={`text-white/45 text-sm max-w-md ${isMobile ? 'mb-7' : 'mb-10'} leading-relaxed`}>
            <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={editMode ? undefined : scrollToProducts} className={`${isMobile ? 'px-5 py-3 text-[11px]' : 'px-8 py-4 text-xs'} font-black uppercase tracking-widest rounded-full text-black hover:opacity-90 transition-opacity shadow-xl`} style={{ background: primaryColor }}>
              <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /> →
            </button>
            <button onClick={scrollToProducts} className={`${isMobile ? 'px-5 py-3 text-[11px]' : 'px-8 py-4 text-xs'} font-black uppercase tracking-widest rounded-full text-white/70 border border-white/15 hover:bg-white/8 transition-colors`}>
              See All
            </button>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="border-y border-white/8 py-4">
        <div className="max-w-6xl mx-auto px-5 flex gap-2.5 overflow-x-auto">
          {collections.map((c, i) => (
            <button key={i} onClick={() => setSelectedCol(i)} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
              style={selectedCol === i ? { background: primaryColor, color: '#000' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
              <span>{editMode ? <StyleOnlySpan field={`collections.${i}.emojiHtml`} value={c.emoji} htmlValue={c.emojiHtml} editMode={editMode} onFieldChange={onFieldChange} /> : c.emoji}</span>
              <span>{editMode ? <StyleOnlySpan field={`collections.${i}.nameHtml`} value={c.name} htmlValue={c.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /> : c.name}</span>
            </button>
          ))}
        </div>
      </section>
      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} dark={true} device={device} editMode={editMode} onFieldChange={onFieldChange} />}

      {/* Products */}
      <section ref={productsRef} className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-14'}`}>
        <div className="flex items-end justify-between mb-8">
          <h2 className={`font-black text-white tracking-tight uppercase ${isMobile ? 'text-2xl' : 'text-3xl'}`}><EditSpan field="sectionHeadings.products" value={sectionHeadings?.products ?? 'New Drops'} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h2>
          <button onClick={scrollToProducts} className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5 hover:gap-3 transition-all" style={{ color: primaryColor }}>
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className={`grid ${gridCols(device)} gap-4`}>
          {displayed.map((p, idx) => (
            <div key={p.id} className="group cursor-pointer" onClick={() => onProductClick(p)}>
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
                <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700" style={{ transition: 'transform 0.7s ease' }} />
                {/* Overlay gradient at bottom */}
                <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[10px] font-black uppercase px-2.5 py-1 rounded-full text-black" style={{ background: idx === 0 ? accentColor : primaryColor }}>{p.badge}</span>
                )}
                <button
                  data-wishlist-btn=""
                  onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                  className={`absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${wishlist.has(p.id) ? 'text-rose-400 fill-rose-400' : 'text-white'}`} />
                </button>
                {/* Always-visible price + add on mobile; hover on desktop */}
                <div className={`absolute bottom-0 inset-x-0 p-3 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                  <button
                    onClick={e => { e.stopPropagation(); const _btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(_btn)); }}
                    className="w-full py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl text-black"
                    style={{ background: primaryColor }}
                  >
                    + Add to Cart
                  </button>
                </div>
              </div>
              <div className="mt-3 px-0.5">
                <p className="text-[10px] text-white/30 uppercase tracking-widest">{p.category}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-sm font-black text-white truncate flex-1">{p.name}</p>
                  <span className="text-sm font-black ml-2 flex-shrink-0" style={{ color: primaryColor }}>{fmtPrice(p.price)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {(() => {
        const sectionOrder = design.sectionOrder ?? ['features', 'testimonials', 'brandStory', 'stats', 'faq', 'newsletter'];
        const sectionMap: Record<string, React.ReactNode> = {
          features: features.length > 0 ? (
            <section key="features" data-editor-section="features" className={`border-t border-white/8 ${isMobile ? 'py-8' : 'py-14'}`}>
              <div className={`max-w-6xl mx-auto px-5 grid ${isMobile ? 'grid-cols-1 gap-8' : 'grid-cols-3 gap-8'}`}>
                <DraggableList items={features} field="features" editMode={editMode}>
                  {(f, i) => (
                  <div key={i} className="flex items-start gap-5">
                    <div>
                      <div className="h-0.5 w-8 mb-4" style={{ background: primaryColor }} />
                      <span className="text-4xl font-black leading-none text-white/15 block mb-3">{String(i + 1).padStart(2, '0')}</span>
                      <div className="mb-2.5"><EmojiIcon emoji={f.icon} size={28} color="rgba(255,255,255,0.7)" strokeWidth={1.5} /></div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2">
                        <EditSpan field={`features.${i}.title`} value={f.title} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                      </h3>
                      <p className="text-xs text-white/40 leading-relaxed">
                        <EditSpan field={`features.${i}.description`} value={f.description} editMode={editMode} onFieldChange={onFieldChange} />
                      </p>
                    </div>
                  </div>
                  )}
                </DraggableList>
              </div>
            </section>
          ) : null,
          testimonials: testimonials.length > 0 ? (
            <section key="testimonials" data-editor-section="testimonials" className={isMobile ? 'py-8' : 'py-14'} style={{ background: alpha(primaryColor, 0.06) }}>
              <div className="max-w-6xl mx-auto px-5">
                <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-8 text-center">
                  <EditSpan field="sectionHeadings.testimonials" value={sectionHeadings?.testimonials ?? 'The Word'} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                </h2>
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-5`}>
                  <DraggableList items={testimonials} field="testimonials" editMode={editMode}>
                    {(t, i) => (
                    <div key={i} className="rounded-3xl p-6 backdrop-blur" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="text-3xl font-black mb-4 leading-none" style={{ color: alpha(primaryColor, 0.4) }}>"</div>
                      <Stars n={t.rating} />
                      <p className="text-sm text-white/65 leading-relaxed mt-3 mb-5">"<EditSpan field={`testimonials.${i}.text`} value={t.text} editMode={editMode} onFieldChange={onFieldChange} />"</p>
                      <div className="flex items-center gap-3 border-t border-white/8 pt-4">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-black" style={{ background: primaryColor }}>
                          {t.author[0]}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-white">
                            <EditSpan field={`testimonials.${i}.author`} value={t.author} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: alpha(primaryColor, 0.7) }}>
                            <EditSpan field={`testimonials.${i}.role`} value={t.role} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                          </p>
                        </div>
                      </div>
                    </div>
                    )}
                  </DraggableList>
                </div>
              </div>
            </section>
          ) : null,
          brandStory: brandStory ? (
            <section key="brandStory" data-editor-section="brandStory" className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-14'}`}>
              <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">Our Story</p>
              <p className="text-sm text-white/60 leading-relaxed max-w-2xl">
                <EditSpan field="brandStory" value={brandStory} editMode={editMode} onFieldChange={onFieldChange} />
              </p>
            </section>
          ) : null,
          stats: stats?.length ? <StatsRow key="stats" stats={stats} primaryColor={primaryColor} dark={true} device={device} editMode={editMode} onFieldChange={onFieldChange} /> : null,
          faq: faq?.length ? <FAQSection key="faq" faq={faq} primaryColor={primaryColor} device={device} dark={true} editMode={editMode} onFieldChange={onFieldChange} sectionHeadings={sectionHeadings} /> : null,
          newsletter: newsletter ? <NewsletterSection key="newsletter" newsletter={newsletter} primaryColor={primaryColor} dark={true} device={device} editMode={editMode} onFieldChange={onFieldChange} /> : null,
        };
        return sectionOrder.map(type => sectionMap[type] ?? null);
      })()}

      {/* Footer */}
      <footer className="border-t border-white/8 py-10">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm font-black uppercase tracking-[0.18em] text-white">
            <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </span>
          <p className="text-xs text-white/30 uppercase tracking-widest">
            <EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
          <p className="text-xs text-white/30">
            <EditSpan field="footerNote" value={footerNote ?? defaultFooterNote} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── ELEGANT layout ────────────────────────────────────────────────────────────
// Inspired by: Net-a-Porter, Jo Malone, Tiffany — luxury, refined, warm

function ElegantLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen, wishlist, onToggleWishlist, onWishlistClick, editMode, onFieldChange }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks = [], products = [], collections = [], features = [], testimonials = [], tagline, faq = [], stats = [], promoBar, newsletter, trustBadges = [], brandStory, sectionHeadings, footerNote } = design;
  const defaultFooterNote = `© 2026 ${storeName} · All rights reserved`;
  const btnText = isDark(primaryColor) ? '#fff' : '#2a2420';
  const isMobile = device === 'mobile';
  const tt = getDefaultTokenTheme(primaryColor);
  const [selectedCol, setSelectedCol] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth' });
  const displayed = selectedCol === 0 ? products : products.filter((_, i) => i % 2 === selectedCol - 1);

  return (
    <div style={{ background: '#fdfcf8', fontFamily: 'Georgia, "Times New Roman", serif' }}>

      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={navLinks} primaryColor={primaryColor} storeName={storeName} onScrollToProducts={scrollToProducts} />

      {/* Header */}
      <header style={{ background: '#fdfcf8', borderBottom: '1px solid #ece7de' }} className="sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between" style={{ height: '60px' }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm" style={{ background: primaryColor }}>
              {storeName[0]}
            </div>
            <span className="text-sm font-bold" style={{ color: '#2a2420', letterSpacing: '0.16em' }}>
              <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </span>
          </div>
          {!isMobile ? (
            <nav className="flex gap-5">
              {navLinks.map((l, li) => (
                <a key={li} onClick={editMode ? undefined : scrollToProducts} className="text-[11px] hover:opacity-50 transition-opacity cursor-pointer" style={{ color: '#6b5e52', letterSpacing: '0.1em' }}><EditSpan field={`navLinks.${li}`} value={l} editMode={editMode} onFieldChange={onFieldChange} singleLine /></a>
              ))}
            </nav>
          ) : (
            <button onClick={() => setMenuOpen(true)} className="p-2" style={{ color: '#6b5e52' }}><Menu className="w-5 h-5" /></button>
          )}
          <div className="flex items-center gap-3">
            {!isMobile && <button onClick={onSearchOpen} className="p-1" style={{ color: '#6b5e52' }}><Search className="w-4 h-4" /></button>}
            <button data-wishlist-nav="" onClick={onWishlistClick} className="relative p-2" style={{ color: '#6b5e52' }}>
              <Heart className="w-4 h-4" />
              {wishlist.size > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center bg-rose-500">{wishlist.size}</span>}
            </button>
            <button data-cart-btn onClick={onCartClick} className="relative p-2" style={{ color: '#6b5e52' }}>
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: primaryColor }}>{cartCount}</span>}
            </button>
            <UserProfileMenu buyerEmail={buyerEmail} onUserClick={onUserClick} onWishlistClick={onWishlistClick} wishlistCount={wishlist.size} iconColor="#6b5e52" />
          </div>
        </div>
        {/* Gradient rule */}
        <div className="h-px" style={{ background: `linear-gradient(to right, transparent, ${primaryColor}, transparent)` }} />
      </header>

      {promoBar && <PromoBar text={promoBar} primaryColor={primaryColor} editMode={editMode} onFieldChange={onFieldChange} />}

      {/* Hero — full-bleed image */}
      <section data-editor-section="hero" className="relative overflow-hidden" style={{ height: isMobile ? '56vh' : '82vh' }}>
        <ProductImg src={products[0]?.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: isMobile ? 'linear-gradient(to bottom, rgba(10,7,4,0.4), rgba(10,7,4,0.7))' : 'linear-gradient(to right, rgba(10,7,4,0.78) 42%, rgba(10,7,4,0.15))' }} />
        <div className={`absolute inset-0 flex items-${isMobile ? 'end pb-8' : 'center'}`}>
          <div className="max-w-6xl mx-auto px-6 w-full">
            <p className="text-xs tracking-[0.35em] mb-5 text-white/55" style={{ fontFamily: 'system-ui' }}>{tagline.toUpperCase()}</p>
            <h1 className={`font-bold text-white leading-tight mb-6 ${isMobile ? 'text-3xl' : 'text-5xl'}`}
              style={{ textShadow: '0 2px 30px rgba(0,0,0,0.5)', maxWidth: '14ch' }}>
              <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </h1>
            {!isMobile && <p className="text-white/65 text-sm max-w-xs mb-9 leading-relaxed" style={{ fontFamily: 'system-ui' }}>
              <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
            </p>}
            <button onClick={editMode ? undefined : scrollToProducts} className={`${isMobile ? 'w-full text-center py-3 px-6' : 'px-9 py-3.5'} text-xs border text-white hover:bg-white/12 transition-colors`}
              style={{ borderColor: 'rgba(255,255,255,0.35)', letterSpacing: '0.22em', fontFamily: 'system-ui' }}>
              <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </button>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section style={{ borderBottom: '1px solid #ece7de', background: '#fdfcf8' }} className="py-5">
        <div className="max-w-6xl mx-auto px-6 flex justify-center gap-5 flex-wrap">
          {collections.map((c, i) => (
            <button key={i} onClick={() => setSelectedCol(i)} className="flex items-center gap-2 text-xs transition-all px-5 py-2"
              style={selectedCol === i ? { background: primaryColor, color: btnText, letterSpacing: '0.14em', fontFamily: 'system-ui' } : { color: '#8a7a6a', letterSpacing: '0.14em', fontFamily: 'system-ui' }}>
              <span>{c.emoji}</span> <span>{c.name.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </section>
      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} />}

      {/* Products */}
      <section ref={productsRef} className={`max-w-6xl mx-auto px-6 ${isMobile ? 'py-8' : 'py-16'}`}>
        <div className={`text-center ${isMobile ? 'mb-7' : 'mb-12'}`}>
          <p className="text-[10px] tracking-[0.38em] mb-3" style={{ color: primaryColor, fontFamily: 'system-ui' }}>CURATED SELECTION</p>
          <h2 className="text-2xl font-bold tracking-wide" style={{ color: '#2a2420' }}><EditSpan field="sectionHeadings.products" value={sectionHeadings?.products ?? 'New Arrivals'} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h2>
          <div className="w-10 h-px mx-auto mt-4" style={{ background: primaryColor }} />
        </div>
        <div className={`grid ${gridCols(device)} gap-6`}>
          {displayed.map(p => (
            <div key={p.id} className="group cursor-pointer" onClick={() => onProductClick(p)}>
              <div className="relative overflow-hidden mb-4" style={{ aspectRatio: '3/4', background: tt.surfaceBg }}>
                <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover transition-transform duration-1000" style={{ transform: 'scale(1)', transition: 'transform 1s ease' }} />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[9px] font-bold tracking-widest px-2.5 py-1 text-white" style={{ background: primaryColor, letterSpacing: '0.15em', fontFamily: 'system-ui' }}>
                    {p.badge.toUpperCase()}
                  </span>
                )}
                <button
                  data-wishlist-btn=""
                  onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                  className={`absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(p.id) ? undefined : { color: tt.textMuted }} />
                </button>
                {/* Add to bag — always visible on mobile, hover on desktop */}
                <div className={`absolute bottom-0 inset-x-0 transition-transform duration-300 ${isMobile ? '' : 'translate-y-full group-hover:translate-y-0'}`}
                  style={{ background: 'rgba(15,10,5,0.88)' }}>
                  <button
                    onClick={e => { e.stopPropagation(); const _btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(_btn)); }}
                    className="w-full py-3 text-[10px] text-white border-t border-white/15 hover:bg-white/8 transition-colors"
                    style={{ letterSpacing: '0.22em', fontFamily: 'system-ui' }}
                  >
                    ADD TO BAG
                  </button>
                </div>
              </div>
              <p className="text-[10px] tracking-[0.22em] mb-1.5" style={{ color: '#a09080', fontFamily: 'system-ui' }}>{p.category.toUpperCase()}</p>
              <p className="text-sm font-medium tracking-wide truncate" style={{ color: '#2a2420' }}>{p.name}</p>
              <div className="flex items-center gap-2.5 mt-1.5">
                <span className="text-sm font-bold" style={{ color: primaryColor, fontFamily: 'system-ui' }}>{fmtPrice(p.price)}</span>
                {p.originalPrice && <span className="text-xs line-through" style={{ color: '#a09080', fontFamily: 'system-ui' }}>{fmtPrice(p.originalPrice)}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {(() => {
        const sectionOrder = design.sectionOrder ?? ['features', 'testimonials', 'brandStory', 'stats', 'faq', 'newsletter'];
        const sectionMap: Record<string, React.ReactNode> = {
          brandStory: (
            <section key="brandStory" data-editor-section="brandStory" className={isMobile ? 'py-8' : 'py-16'} style={{ background: '#f5f0e8' }}>
              <div className="max-w-2xl mx-auto px-6 text-center">
                <p className="text-[10px] tracking-[0.38em] mb-6" style={{ color: primaryColor, fontFamily: 'system-ui' }}>OUR PHILOSOPHY</p>
                <p className="text-lg font-medium leading-loose italic" style={{ color: '#4a3d32', lineHeight: '1.9' }}>
                  "<EditSpan field="brandStory" value={brandStory || heroSubtitle || ''} editMode={editMode} onFieldChange={onFieldChange} />"
                </p>
                <div className="w-8 h-px mx-auto mt-6" style={{ background: primaryColor }} />
              </div>
            </section>
          ),
          features: features.length > 0 ? (
            <section key="features" data-editor-section="features" className={`max-w-6xl mx-auto px-6 ${isMobile ? 'py-8' : 'py-14'}`}>
              <div className={`grid ${isMobile ? 'grid-cols-1 divide-y' : 'grid-cols-3 divide-x'}`} style={{ borderColor: '#e8e3db' }}>
                <DraggableList items={features} field="features" editMode={editMode}>
                  {(f, i) => (
                  <div key={i} className={`text-center ${isMobile ? 'px-4 py-5' : 'px-8 py-8'}`}>
                    <div className="mb-4"><EmojiIcon emoji={f.icon} size={28} color={primaryColor} strokeWidth={1.5} /></div>
                    <h3 className="text-xs font-bold tracking-[0.2em] mb-2" style={{ color: '#2a2420', fontFamily: 'system-ui' }}>
                      <EditSpan field={`features.${i}.title`} value={f.title} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: '#8a7a6a', fontFamily: 'system-ui' }}>
                      <EditSpan field={`features.${i}.description`} value={f.description} editMode={editMode} onFieldChange={onFieldChange} />
                    </p>
                  </div>
                  )}
                </DraggableList>
              </div>
            </section>
          ) : null,
          testimonials: testimonials.length > 0 ? (
            <section key="testimonials" data-editor-section="testimonials" className={isMobile ? 'py-8' : 'py-14'} style={{ background: '#f5f0e8' }}>
              <div className="max-w-6xl mx-auto px-6">
                <div className={`text-center ${isMobile ? 'mb-7' : 'mb-10'}`}>
                  <p className="text-[10px] tracking-[0.38em] mb-3" style={{ color: primaryColor, fontFamily: 'system-ui' }}>CLIENT VOICES</p>
                  <h2 className="text-xl font-bold tracking-wide" style={{ color: '#2a2420' }}>
                    <EditSpan field="sectionHeadings.testimonials" value={sectionHeadings?.testimonials ?? 'Testimonials'} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                  </h2>
                </div>
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-6`}>
                  <DraggableList items={testimonials} field="testimonials" editMode={editMode}>
                    {(t, i) => (
                    <div key={i} className="p-7 relative overflow-hidden" style={{ background: tt.surfaceBg, borderLeft: `3px solid ${primaryColor}` }}>
                      <div className="text-5xl font-black leading-none absolute top-3 right-5 opacity-6" style={{ color: primaryColor }}>❝</div>
                      <Stars n={t.rating} />
                      <p className="text-sm leading-loose italic mt-4 mb-6" style={{ color: '#4a3d32' }}>
                        "<EditSpan field={`testimonials.${i}.text`} value={t.text} editMode={editMode} onFieldChange={onFieldChange} />"
                      </p>
                      <div>
                        <p className="text-xs font-bold tracking-widest" style={{ color: '#2a2420', fontFamily: 'system-ui' }}>
                          <EditSpan field={`testimonials.${i}.author`} value={t.author} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                        </p>
                        <p className="text-[10px] tracking-wider mt-0.5" style={{ color: primaryColor, fontFamily: 'system-ui' }}>
                          <EditSpan field={`testimonials.${i}.role`} value={t.role} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                        </p>
                      </div>
                    </div>
                    )}
                  </DraggableList>
                </div>
              </div>
            </section>
          ) : null,
          stats: stats?.length ? <StatsRow key="stats" stats={stats} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} /> : null,
          faq: faq?.length ? <FAQSection key="faq" faq={faq} primaryColor={primaryColor} device={device} elegant={true} editMode={editMode} onFieldChange={onFieldChange} sectionHeadings={sectionHeadings} /> : null,
          newsletter: newsletter ? <NewsletterSection key="newsletter" newsletter={newsletter} primaryColor={primaryColor} elegant={true} device={device} editMode={editMode} onFieldChange={onFieldChange} /> : null,
        };
        return sectionOrder.map(type => sectionMap[type] ?? null);
      })()}

      {/* Footer */}
      <footer style={{ background: '#2a2420', borderTop: `3px solid ${primaryColor}` }} className="py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs font-bold tracking-[0.45em] text-white mb-3">
            <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
          <p className="text-[10px] tracking-[0.22em] mb-6" style={{ color: 'rgba(255,255,255,0.38)' }}>
            <EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
          <div className="w-10 h-px mx-auto mb-6" style={{ background: primaryColor }} />
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
            <EditSpan field="footerNote" value={footerNote ?? defaultFooterNote} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── MODERN layout ─────────────────────────────────────────────────────────────
// Inspired by: Apple Store, Allbirds, Casper — clean, airy, contemporary

function ModernLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen, wishlist, onToggleWishlist, onWishlistClick, editMode, onFieldChange }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks = [], products = [], collections = [], features = [], testimonials = [], tagline, accentColor, faq = [], stats = [], promoBar, newsletter, trustBadges = [], brandStory, sectionHeadings, footerNote } = design;
  const defaultFooterNote = `© 2026 ${storeName} · All rights reserved`;
  const btnText = isDark(primaryColor) ? '#fff' : '#fff';
  const isMobile = device === 'mobile';
  const tt = getDefaultTokenTheme(primaryColor);
  const [selectedCol, setSelectedCol] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth' });
  const displayed = selectedCol === 0 ? products : products.filter((_, i) => i % 2 === selectedCol - 1);

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', background: tt.pageBg }}>

      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={navLinks} primaryColor={primaryColor} storeName={storeName} onScrollToProducts={scrollToProducts} />

      {/* Header */}
      <header className="backdrop-blur-xl border-b sticky top-0 z-40" style={{ background: `${tt.headerBg}d9`, borderColor: tt.headerBorder }}>
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between" style={{ height: '56px' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-bold text-white shadow-md" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
              {storeName[0]}
            </div>
            <span className="text-sm font-bold" style={{ color: tt.textPrimary }}>
              <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </span>
          </div>
          {!isMobile ? (
            <nav className="flex gap-6">
              {navLinks.map((l, li) => <a key={li} onClick={editMode ? undefined : scrollToProducts} className="text-sm transition-colors font-medium cursor-pointer" style={{ color: tt.textSecondary }}><EditSpan field={`navLinks.${li}`} value={l} editMode={editMode} onFieldChange={onFieldChange} singleLine /></a>)}
            </nav>
          ) : (
            <button onClick={() => setMenuOpen(true)} className="p-2 rounded-xl" style={{ color: tt.textSecondary }}><Menu className="w-5 h-5" /></button>
          )}
          <div className="flex items-center gap-1">
            {!isMobile && <button onClick={onSearchOpen} className="p-2 rounded-xl transition-colors" style={{ color: tt.textMuted }}><Search className="w-4 h-4" /></button>}
            <button data-wishlist-nav="" onClick={onWishlistClick} className="relative p-2 rounded-xl transition-colors" style={{ color: tt.textMuted }}>
              <Heart className="w-4 h-4" />
              {wishlist.size > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center bg-rose-500">{wishlist.size}</span>}
            </button>
            <button data-cart-btn onClick={onCartClick} className="relative p-2 rounded-xl transition-colors" style={{ color: tt.textMuted }}>
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: primaryColor }}>{cartCount}</span>}
            </button>
            <UserProfileMenu buyerEmail={buyerEmail} onUserClick={onUserClick} onWishlistClick={onWishlistClick} wishlistCount={wishlist.size} iconColor={tt.textMuted} hoverClass="rounded-xl" />
          </div>
        </div>
      </header>

      {promoBar && <PromoBar text={promoBar} primaryColor={primaryColor} editMode={editMode} onFieldChange={onFieldChange} />}

      {/* Hero */}
      {isMobile ? (
        <section data-editor-section="hero" className="px-5 py-10" style={{ background: `linear-gradient(160deg, ${alpha(primaryColor, 0.05)} 0%, ${alpha(accentColor, 0.08)} 100%)` }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5" style={{ background: alpha(primaryColor, 0.1), color: primaryColor }}>
            ✦ {tagline}
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight mb-4" style={{ color: tt.textPrimary }}>
            <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </h1>
          <p className="text-sm mb-7 leading-relaxed" style={{ color: tt.textSecondary }}>
            <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
          </p>
          <button onClick={editMode ? undefined : scrollToProducts} className="w-full py-3.5 text-sm font-semibold rounded-2xl shadow-lg" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, color: btnText }}>
            <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </button>
          {/* Mini product scroll on mobile */}
          <div className="mt-7 flex gap-3 overflow-x-auto pb-1">
            {products.slice(0, 4).map(p => (
              <div key={p.id} className="flex-shrink-0 w-32 rounded-2xl overflow-hidden shadow-md cursor-pointer" onClick={() => onProductClick(p)}>
                <div className="h-28" style={{ background: tt.surfaceBg }}>
                  <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
                </div>
                <div className="p-2" style={{ background: tt.surfaceBg }}>
                  <p className="text-[11px] font-semibold truncate" style={{ color: tt.textPrimary }}>{p.name}</p>
                  <p className="text-[11px] font-bold mt-0.5" style={{ color: primaryColor }}>{fmtPrice(p.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section data-editor-section="hero" className="overflow-hidden">
          <div className="max-w-6xl mx-auto px-5 py-14 grid grid-cols-2 gap-0 items-center">
            <div className="py-6 pr-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ background: alpha(primaryColor, 0.1), color: primaryColor }}>
                ✦ {tagline}
              </div>
              <h1 className="text-5xl font-bold leading-[1.05] tracking-tight mb-5" style={{ color: tt.textPrimary }}>
                <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
              </h1>
              <p className="text-base mb-8 max-w-sm leading-relaxed" style={{ color: tt.textSecondary }}>
                <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <button onClick={editMode ? undefined : scrollToProducts} className="px-7 py-3.5 text-sm font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:opacity-90 transition-all" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, color: btnText }}>
                  <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                </button>
                <button onClick={scrollToProducts} className="px-7 py-3.5 text-sm font-semibold rounded-2xl border transition-all" style={{ borderColor: tt.surfaceBorder, color: tt.textSecondary, background: 'transparent' }}>
                  Learn More
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {collections.map((c, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: tt.surfaceBg, color: tt.textSecondary }}>
                    {editMode ? <><StyleOnlySpan field={`collections.${i}.emojiHtml`} value={c.emoji} htmlValue={c.emojiHtml} editMode={editMode} onFieldChange={onFieldChange} /> <StyleOnlySpan field={`collections.${i}.nameHtml`} value={c.name} htmlValue={c.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /></> : `${c.emoji} ${c.name}`}
                  </span>
                ))}
              </div>
            </div>
            {/* Product mosaic */}
            <div className="relative pl-6">
              <div className="absolute inset-y-0 left-0 right-0 rounded-3xl" style={{ background: `linear-gradient(135deg, ${alpha(primaryColor, 0.07)}, ${alpha(accentColor, 0.1)})` }} />
              <div className="relative grid grid-cols-2 gap-3 p-5">
                {products.slice(0, 4).map((p, i) => (
                  <div key={p.id}
                    className="rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                    style={{ aspectRatio: i === 0 ? '2/1.2' : '1/1.2' }}
                    onClick={() => onProductClick(p)}
                  >
                    <div className="relative w-full h-full">
                      <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/65 to-transparent">
                        <p className="text-white text-xs font-semibold truncate">{p.name}</p>
                        <p className="text-white/80 text-xs">{fmtPrice(p.price)}</p>
                      </div>
                      {p.badge && (
                        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow" style={{ background: primaryColor }}>{p.badge}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} />}

      {/* Products */}
      <section ref={productsRef} className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-14'}`} style={{ borderTop: `1px solid ${tt.divider}` }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: tt.textPrimary }}><EditSpan field="sectionHeadings.products" value={sectionHeadings?.products ?? 'Featured Products'} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h2>
            <p className="text-sm mt-1" style={{ color: tt.textMuted }}>{tagline}</p>
          </div>
          <button onClick={scrollToProducts} className="text-sm font-semibold flex items-center gap-1.5 hover:gap-2.5 transition-all" style={{ color: primaryColor }}>
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className={`grid ${gridCols(device)} gap-5`}>
          {displayed.map(p => (
            <div key={p.id} className="group rounded-3xl border overflow-hidden hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer" style={{ background: tt.surfaceBg, borderColor: tt.divider }} onClick={() => onProductClick(p)}>
              <div className="relative aspect-square overflow-hidden" style={{ background: tt.surfaceBg }}>
                <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm" style={{ background: primaryColor }}>{p.badge}</span>
                )}
                <button
                  data-wishlist-btn=""
                  onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                  className={`absolute top-3 right-3 w-9 h-9 rounded-2xl shadow flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'}`}
                  style={{ background: tt.surfaceBg }}
                >
                  <Heart className={`w-4 h-4 transition-colors ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(p.id) ? undefined : { color: tt.textMuted }} />
                </button>
              </div>
              <div className={isMobile ? 'p-3' : 'p-4'}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: alpha(primaryColor, 0.1), color: primaryColor }}>{p.category}</span>
                </div>
                <p className="text-sm font-bold truncate" style={{ color: tt.textPrimary }}>{p.name}</p>
                {!isMobile && <p className="text-xs mt-0.5 truncate" style={{ color: tt.textMuted }}>{p.description}</p>}
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-bold" style={{ color: tt.textPrimary }}>{fmtPrice(p.price)}</span>
                    {p.originalPrice && !isMobile && <span className="text-xs line-through" style={{ color: tt.textMuted }}>{fmtPrice(p.originalPrice)}</span>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); const _btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(_btn)); }} className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-xl text-white shadow-sm hover:opacity-90 transition-opacity" style={{ background: primaryColor }}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {(() => {
        const sectionOrder = design.sectionOrder ?? ['features', 'testimonials', 'brandStory', 'stats', 'faq', 'newsletter'];
        const sectionMap: Record<string, React.ReactNode> = {
          features: features.length > 0 ? (
            <section key="features" data-editor-section="features" className={isMobile ? 'py-8' : 'py-14'} style={{ background: `linear-gradient(135deg, ${alpha(primaryColor, 0.04)}, ${alpha(accentColor, 0.06)})` }}>
              <div className={`max-w-6xl mx-auto px-5 grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-5'}`}>
                <DraggableList items={features} field="features" editMode={editMode}>
                  {(f, i) => (
                  <div key={i} className="bg-white/75 backdrop-blur rounded-3xl p-7 shadow-sm hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: `linear-gradient(135deg, ${alpha(primaryColor, 0.15)}, ${alpha(accentColor, 0.15)})` }}>
                      <EmojiIcon emoji={f.icon} size={24} color={primaryColor} strokeWidth={1.75} />
                    </div>
                    <h3 className="text-sm font-bold mb-2" style={{ color: tt.textPrimary }}>
                      <EditSpan field={`features.${i}.title`} value={f.title} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: tt.textSecondary }}>
                      <EditSpan field={`features.${i}.description`} value={f.description} editMode={editMode} onFieldChange={onFieldChange} />
                    </p>
                  </div>
                  )}
                </DraggableList>
              </div>
            </section>
          ) : null,
          testimonials: testimonials.length > 0 ? (
            <section key="testimonials" data-editor-section="testimonials" className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-14'}`}>
              <h2 className="text-2xl font-bold text-center mb-9" style={{ color: tt.textPrimary }}>
                <EditSpan field="sectionHeadings.testimonials" value={sectionHeadings?.testimonials ?? 'Loved by Customers'} editMode={editMode} onFieldChange={onFieldChange} singleLine />
              </h2>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-5`}>
                <DraggableList items={testimonials} field="testimonials" editMode={editMode}>
                  {(t, i) => (
                  <div key={i} className="rounded-3xl p-6 border-l-4" style={{ background: alpha(i === 0 ? primaryColor : accentColor, 0.05), borderLeftColor: i === 0 ? primaryColor : accentColor }}>
                    <Stars n={t.rating} />
                    <p className="text-sm leading-relaxed mt-3 mb-5" style={{ color: tt.textSecondary }}>
                      "<EditSpan field={`testimonials.${i}.text`} value={t.text} editMode={editMode} onFieldChange={onFieldChange} />"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: i === 0 ? primaryColor : accentColor }}>
                        {t.author[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold" style={{ color: tt.textPrimary }}>
                          <EditSpan field={`testimonials.${i}.author`} value={t.author} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                        </p>
                        <p className="text-[10px]" style={{ color: tt.textMuted }}>
                          <EditSpan field={`testimonials.${i}.role`} value={t.role} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                        </p>
                      </div>
                    </div>
                  </div>
                  )}
                </DraggableList>
              </div>
            </section>
          ) : null,
          brandStory: brandStory ? (
            <section key="brandStory" data-editor-section="brandStory" className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-14'}`}>
              <p className="text-sm font-semibold mb-3" style={{ color: tt.textMuted }}>Our Story</p>
              <p className="text-base leading-relaxed max-w-2xl" style={{ color: tt.textSecondary }}>
                <EditSpan field="brandStory" value={brandStory} editMode={editMode} onFieldChange={onFieldChange} />
              </p>
            </section>
          ) : null,
          stats: stats?.length ? <StatsRow key="stats" stats={stats} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} /> : null,
          faq: faq?.length ? <FAQSection key="faq" faq={faq} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} sectionHeadings={sectionHeadings} /> : null,
          newsletter: newsletter ? <NewsletterSection key="newsletter" newsletter={newsletter} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} /> : null,
        };
        return sectionOrder.map(type => sectionMap[type] ?? null);
      })()}

      {/* Footer */}
      <footer className="border-t py-10" style={{ background: tt.surfaceBg, borderColor: tt.divider }}>
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
              {storeName[0]}
            </div>
            <span className="text-sm font-bold" style={{ color: tt.textPrimary }}>
              <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </span>
          </div>
          <p className="text-xs" style={{ color: tt.textMuted }}>
            <EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
          <p className="text-xs" style={{ color: tt.textMuted }}>
            <EditSpan field="footerNote" value={footerNote ?? defaultFooterNote} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── PLAYFUL layout ────────────────────────────────────────────────────────────
// Inspired by: Glossier, Oatly, Warby Parker — fun, colorful, round, youthful

function PlayfulLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen: _onSearchOpen, wishlist, onToggleWishlist, onWishlistClick, editMode, onFieldChange }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks = [], products = [], collections = [], features = [], testimonials = [], tagline, accentColor, faq = [], stats = [], promoBar, newsletter, trustBadges = [], brandStory, sectionHeadings, footerNote } = design;
  const defaultFooterNote = `© 2026 ${storeName} · All rights reserved`;
  const heroTextColor = isDark(primaryColor) ? '#fff' : '#111';
  const isMobile = device === 'mobile';
  const tt = getDefaultTokenTheme(primaryColor);
  const [selectedCol, setSelectedCol] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth' });
  const displayed = selectedCol === 0 ? products : products.filter((_, i) => i % 2 === selectedCol - 1);

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: tt.pageBg }}>

      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={navLinks} primaryColor={primaryColor} storeName={storeName} onScrollToProducts={scrollToProducts} />

      {/* Header */}
      <header className="border-b-2 sticky top-0 z-40" style={{ background: tt.headerBg, borderColor: tt.headerBorder }}>
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between" style={{ height: '56px' }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{collections[0]?.emoji}</span>
            <span className="text-sm font-black" style={{ color: tt.textPrimary }}>
              <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </span>
          </div>
          {!isMobile ? (
            <nav className="flex gap-2">
              {navLinks.map((l, li) => (
                <a key={li} onClick={editMode ? undefined : scrollToProducts} className="px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer"
                  style={li === 0 ? { background: primaryColor, color: heroTextColor } : { color: '#555', background: '#f5f5f5' }}>
                  <EditSpan field={`navLinks.${li}`} value={l} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                </a>
              ))}
            </nav>
          ) : (
            <button onClick={() => setMenuOpen(true)} className="p-2" style={{ color: tt.textSecondary }}><Menu className="w-5 h-5" /></button>
          )}
          <div className="flex items-center gap-1">
            <button data-wishlist-nav="" onClick={onWishlistClick} className="relative p-2">
              <Heart className="w-5 h-5" style={{ color: tt.textSecondary }} />
              {wishlist.size > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-black text-white rounded-full flex items-center justify-center bg-rose-500">{wishlist.size}</span>}
            </button>
            <button data-cart-btn onClick={onCartClick} className="relative p-2">
              <ShoppingCart className="w-5 h-5" style={{ color: tt.textSecondary }} />
              {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-black text-white rounded-full flex items-center justify-center" style={{ background: accentColor }}>{cartCount}</span>}
            </button>
            <UserProfileMenu buyerEmail={buyerEmail} onUserClick={onUserClick} onWishlistClick={onWishlistClick} wishlistCount={wishlist.size} iconColor={tt.textSecondary} />
          </div>
        </div>
      </header>

      {promoBar && <PromoBar text={promoBar} primaryColor={primaryColor} editMode={editMode} onFieldChange={onFieldChange} />}

      {/* Hero — gradient with wave bottom */}
      <section data-editor-section="hero" className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}>
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />
        <div className={`max-w-6xl mx-auto px-5 pt-12 pb-16 relative ${isMobile ? 'flex flex-col items-center text-center gap-6' : 'grid grid-cols-2 gap-12 items-center'}`}>
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-xs font-bold mb-5" style={{ color: heroTextColor }}>
              {collections[0]?.emoji} {tagline}
            </div>
            <h1 className={`font-black leading-tight mb-4 ${isMobile ? 'text-4xl' : 'text-5xl'}`} style={{ color: heroTextColor }}>
              <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </h1>
            <p className={`text-sm mb-8 max-w-sm leading-relaxed ${isMobile ? 'text-center' : ''}`} style={{ color: `${heroTextColor}cc` }}>
              <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
            </p>
            <div className={`flex items-center gap-3 flex-wrap ${isMobile ? 'justify-center' : ''}`}>
              <button onClick={editMode ? undefined : scrollToProducts} className="px-7 py-3.5 text-sm font-black rounded-2xl shadow-xl hover:scale-105 transition-transform" style={{ background: tt.surfaceBg, color: primaryColor }}>
                <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /> 🛍️
              </button>
              <button onClick={scrollToProducts} className="px-7 py-3.5 text-sm font-bold rounded-2xl border-2 hover:bg-white/12 transition-colors" style={{ borderColor: `${heroTextColor}40`, color: heroTextColor }}>
                Browse All
              </button>
            </div>
          </div>
          {/* Product mosaic */}
          <div className={isMobile ? 'w-full' : 'relative'}>
            <div className="bg-white/18 rounded-[2rem] p-4 backdrop-blur">
              <div className="grid grid-cols-2 gap-3">
                {products.slice(0, 4).map((p, i) => (
                  <div key={p.id} className="rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition-transform cursor-pointer" style={{ background: tt.surfaceBg }} onClick={() => onProductClick(p)}>
                    <div className="aspect-square">
                      <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold truncate" style={{ color: tt.textPrimary }}>{p.name}</p>
                      <p className="text-xs font-black mt-0.5" style={{ color: primaryColor }}>{fmtPrice(p.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Wave divider */}
        <div className="relative" style={{ height: '48px', marginBottom: '-2px' }}>
          <svg viewBox="0 0 1200 48" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <path d="M0,48 C200,0 400,48 600,24 C800,0 1000,48 1200,24 L1200,48 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Collections */}
      <section className="py-5" style={{ background: tt.pageBg }}>
        <div className="max-w-6xl mx-auto px-5 flex gap-3 overflow-x-auto">
          {collections.map((c, i) => (
            <button key={i} onClick={() => setSelectedCol(i)} className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border-2 transition-all hover:scale-105"
              style={selectedCol === i ? { background: primaryColor, borderColor: primaryColor, color: heroTextColor } : { borderColor: tt.surfaceBorder, color: tt.textPrimary }}>
              <span className="text-base">{c.emoji}</span> <span>{c.name}</span>
            </button>
          ))}
        </div>
      </section>
      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} />}

      {/* Products */}
      <section ref={productsRef} className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-12'}`}>
        <div className="flex items-end justify-between mb-7">
          <div>
            <h2 className="text-2xl font-black" style={{ color: tt.textPrimary }}>{collections[0]?.emoji} <EditSpan field="sectionHeadings.products" value={sectionHeadings?.products ?? 'Our Picks'} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h2>
            <p className="text-sm mt-1" style={{ color: tt.textMuted }}>{tagline}</p>
          </div>
          <button onClick={scrollToProducts} className="text-sm font-black flex items-center gap-1.5 hover:gap-2.5 transition-all" style={{ color: primaryColor }}>
            See All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className={`grid ${gridCols(device)} gap-4`}>
          {displayed.map((p, idx) => (
            <div key={p.id} className="group rounded-3xl overflow-hidden border-2 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              style={{ background: tt.surfaceBg, borderColor: alpha(idx % 2 === 0 ? primaryColor : accentColor, 0.25) }}
              onClick={() => onProductClick(p)}>
              <div className="relative aspect-square overflow-hidden" style={{ background: tt.surfaceBg }}>
                <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[10px] font-black px-3 py-1.5 rounded-full text-white shadow-lg" style={{ background: idx % 2 === 0 ? primaryColor : accentColor }}>
                    {p.badge}
                  </span>
                )}
                <button
                  data-wishlist-btn=""
                  onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                  className={`absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow transition-all hover:scale-110 active:scale-95 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(p.id) ? undefined : { color: tt.textMuted }} />
                </button>
              </div>
              <div className={isMobile ? 'p-3' : 'p-4'}>
                <p className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1.5" style={{ background: alpha(primaryColor, 0.1), color: primaryColor }}>{p.category}</p>
                <p className="text-sm font-black truncate" style={{ color: tt.textPrimary }}>{p.name}</p>
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-black truncate" style={{ color: primaryColor }}>{fmtPrice(p.price)}</span>
                    {p.originalPrice && !isMobile && <span className="text-xs line-through flex-shrink-0" style={{ color: tt.textMuted }}>{fmtPrice(p.originalPrice)}</span>}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); const _btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(_btn)); }}
                    className={`flex-shrink-0 rounded-xl font-black text-white hover:opacity-85 transition-opacity ${isMobile ? 'p-2' : 'flex items-center gap-1 px-3 py-2 text-xs'}`}
                    style={{ background: idx % 2 === 0 ? primaryColor : accentColor }}
                  >
                    {isMobile ? <ShoppingCart className="w-3.5 h-3.5" /> : <><ShoppingCart className="w-3 h-3" /> Add</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {(() => {
        const sectionOrder = design.sectionOrder ?? ['features', 'testimonials', 'brandStory', 'stats', 'faq', 'newsletter'];
        const sectionMap: Record<string, React.ReactNode> = {
          features: features.length > 0 ? (
            <section key="features" data-editor-section="features" className={isMobile ? 'py-8' : 'py-12'} style={{ background: alpha(primaryColor, 0.04) }}>
              <div className={`max-w-6xl mx-auto px-5 grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-5'}`}>
                <DraggableList items={features} field="features" editMode={editMode}>
                  {(f, i) => (
                  <div key={i} className="rounded-3xl p-7 text-center hover:scale-102 transition-transform"
                    style={{ background: [alpha(primaryColor, 0.12), alpha(accentColor, 0.12), alpha(primaryColor, 0.07)][i], transition: 'transform 0.2s ease' }}>
                    <div className="mb-4"><EmojiIcon emoji={f.icon} size={36} color={primaryColor} strokeWidth={1.5} /></div>
                    <h3 className="text-sm font-black mb-2" style={{ color: tt.textPrimary }}>
                      <EditSpan field={`features.${i}.title`} value={f.title} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: tt.textSecondary }}>
                      <EditSpan field={`features.${i}.description`} value={f.description} editMode={editMode} onFieldChange={onFieldChange} />
                    </p>
                  </div>
                  )}
                </DraggableList>
              </div>
            </section>
          ) : null,
          testimonials: testimonials.length > 0 ? (
            <section key="testimonials" data-editor-section="testimonials" className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-12'}`}>
              <h2 className="text-2xl font-black text-center mb-8" style={{ color: tt.textPrimary }}>
                <EditSpan field="sectionHeadings.testimonials" value={sectionHeadings?.testimonials ?? 'Happy Customers 🤩'} editMode={editMode} onFieldChange={onFieldChange} singleLine />
              </h2>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-5`}>
                <DraggableList items={testimonials} field="testimonials" editMode={editMode}>
                  {(t, i) => (
                  <div key={i} className="rounded-3xl p-6 border-2" style={{ borderColor: alpha(i === 0 ? primaryColor : accentColor, 0.25) }}>
                    <Stars n={t.rating} />
                    <p className="text-sm leading-relaxed mt-3 mb-5" style={{ color: tt.textSecondary }}>
                      "<EditSpan field={`testimonials.${i}.text`} value={t.text} editMode={editMode} onFieldChange={onFieldChange} />"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-base font-black text-white flex-shrink-0" style={{ background: i === 0 ? primaryColor : accentColor }}>
                        {t.author[0]}
                      </div>
                      <div>
                        <p className="text-xs font-black" style={{ color: tt.textPrimary }}>
                          <EditSpan field={`testimonials.${i}.author`} value={t.author} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                        </p>
                        <p className="text-[10px]" style={{ color: tt.textMuted }}>
                          <EditSpan field={`testimonials.${i}.role`} value={t.role} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                        </p>
                      </div>
                    </div>
                  </div>
                  )}
                </DraggableList>
              </div>
            </section>
          ) : null,
          brandStory: brandStory ? (
            <section key="brandStory" data-editor-section="brandStory" className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-12'}`}>
              <p className="text-sm font-black mb-3" style={{ color: tt.textMuted }}>Our Story</p>
              <p className="text-sm leading-relaxed max-w-2xl" style={{ color: tt.textSecondary }}>
                <EditSpan field="brandStory" value={brandStory} editMode={editMode} onFieldChange={onFieldChange} />
              </p>
            </section>
          ) : null,
          stats: stats?.length ? <StatsRow key="stats" stats={stats} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} /> : null,
          faq: faq?.length ? <FAQSection key="faq" faq={faq} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} sectionHeadings={sectionHeadings} /> : null,
          newsletter: newsletter ? <NewsletterSection key="newsletter" newsletter={newsletter} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} /> : null,
        };
        return sectionOrder.map(type => sectionMap[type] ?? null);
      })()}

      {/* Footer with wave top */}
      <footer style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
        <div style={{ height: '36px', marginTop: '-1px' }}>
          <svg viewBox="0 0 1200 36" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,0 C300,36 600,0 900,18 C1050,27 1150,9 1200,0 L1200,36 L0,36 Z" fill="white" />
          </svg>
        </div>
        <div className="max-w-6xl mx-auto px-5 py-8 text-center">
          <p className="text-2xl mb-2">{collections[0]?.emoji}</p>
          <p className="text-sm font-black mb-1" style={{ color: heroTextColor }}>
            <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
          <p className="text-xs mb-4" style={{ color: `${heroTextColor}aa` }}>
            <EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
          <p className="text-[10px]" style={{ color: `${heroTextColor}66` }}>
            <EditSpan field="footerNote" value={footerNote ?? defaultFooterNote} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Fallback layout (template-based stores without AI design) ─────────────────

function FallbackLayout({ store, device, onProductClick, onAddToCart, onCartClick, cartCount, onUserClick, buyerEmail, wishlist, onToggleWishlist, onWishlistClick }: {
  store: Store; device: DeviceMode;
  onProductClick: (p: RichProduct) => void;
  onAddToCart: (p: RichProduct, sourceRect?: DOMRect) => void;
  onCartClick: () => void;
  onUserClick?: () => void;
  buyerEmail?: string | null;
  cartCount: number;
  wishlist: Set<string>;
  onToggleWishlist: (id: string) => void;
  onWishlistClick?: () => void;
}) {
  const primaryColor = store.primaryColor || '#10b981';
  const tt = getDefaultTokenTheme(primaryColor);
  const fmtPrice = makePriceFmt(store.currency?.code ?? 'USD');
  // Option C: use design.products as primary source; fall back to template for
  // stores created before Option C (template-browsed or legacy AI stores).
  const products = (
    store.design?.products ??
    (store.template?.demoProducts || []).map(p => ({ ...p, description: '' }))
  ) as RichProduct[];

  return (
    <div style={{ background: tt.pageBg }}>
      <div className="border-b" style={{ borderColor: tt.divider }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05)` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: primaryColor }}>
              {(store.name || 'S')[0]}
            </div>
            <span className="font-bold text-slate-900">{store.name || 'My Store'}</span>
          </div>
          <div className="flex items-center gap-3">
            {onWishlistClick && (
              <button data-wishlist-nav="" onClick={onWishlistClick} className="relative p-2 rounded-lg hover:bg-slate-100">
                <Heart className="w-4 h-4 text-slate-500" />
                {wishlist.size > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center bg-rose-500">{wishlist.size}</span>}
              </button>
            )}
            <button data-cart-btn onClick={onCartClick} className="relative flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl" style={{ background: primaryColor }}>
              <ShoppingCart className="w-4 h-4" />{device !== 'mobile' && <span>Cart</span>}
              {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 text-[9px] font-bold text-white rounded-full flex items-center justify-center bg-rose-500">{cartCount}</span>}
            </button>
            {onUserClick && (
              <UserProfileMenu buyerEmail={buyerEmail ?? null} onUserClick={onUserClick} onWishlistClick={onWishlistClick ?? (() => {})} wishlistCount={wishlist.size} iconColor="#64748b" hoverClass="rounded-lg hover:bg-slate-100" />
            )}
          </div>
        </div>
      </div>
      <div className="relative overflow-hidden" style={{ height: device === 'mobile' ? '200px' : '320px', background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)` }}>
        {store.template?.image && <img src={store.template.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
        <div className="absolute inset-0 flex items-center px-8">
          <div>
            <h1 className={`font-bold text-white mb-4 ${device === 'mobile' ? 'text-2xl' : 'text-4xl'}`}>{store.name || 'Your Store'}<br /><span className="opacity-80">Premium Quality</span></h1>
            <button className="px-6 py-3 text-sm font-semibold rounded-xl" style={{ background: tt.surfaceBg, color: primaryColor }}>Shop Now →</button>
          </div>
        </div>
      </div>
      <div className="px-6 py-8">
        <h2 className="text-xl font-bold mb-6" style={{ color: tt.textPrimary }}>Featured Products</h2>
        <div className={`grid ${gridCols(device)} gap-4`}>
          {products.map(p => (
            <div key={p.id} className="group rounded-2xl overflow-hidden hover:shadow-lg transition-all cursor-pointer" style={{ background: tt.surfaceBg, border: `1px solid ${tt.divider}` }} onClick={() => onProductClick(p)}>
              <div className="relative aspect-square" style={{ background: tt.surfaceBg }}>
                <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                {p.badge && <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold text-white rounded-full" style={{ background: primaryColor }}>{p.badge}</span>}
                <button
                  data-wishlist-btn=""
                  onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow transition-all hover:scale-110 active:scale-95"
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                </button>
              </div>
              <div className="p-3">
                <p className="text-xs mb-1" style={{ color: tt.textMuted }}>{p.category}</p>
                <p className="text-sm font-semibold truncate" style={{ color: tt.textPrimary }}>{p.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold" style={{ color: tt.textPrimary }}>{fmtPrice(p.price)}</span>
                  <button onClick={e => { e.stopPropagation(); const _btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(_btn)); }} className="px-3 py-1.5 text-xs font-semibold rounded-xl text-white" style={{ background: primaryColor }}>Add</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-6 py-6" style={{ borderTop: `1px solid ${tt.divider}`, background: tt.surfaceBg }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: primaryColor }}>{(store.name || 'S')[0]}</div>
            <span className="font-bold text-sm" style={{ color: tt.textSecondary }}>{store.name}</span>
          </div>
          <p className="text-xs" style={{ color: tt.textMuted }}>© 2026 · Powered by Storee</p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN LAYOUT — Claude-as-Designer: driven entirely by designSystem tokens
// ══════════════════════════════════════════════════════════════════════════════

// ── Font pairs ────────────────────────────────────────────────────────────────

const FONT_PAIRS: Record<string, { heading: string; body: string; url: string }> = {
  'playfair-lato': {
    heading: "'Playfair Display', Georgia, serif",
    body: "'Lato', system-ui, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Lato:wght@300;400;700&display=swap',
  },
  'montserrat-opensans': {
    heading: "'Montserrat', system-ui, sans-serif",
    body: "'Open Sans', system-ui, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Open+Sans:wght@300;400;600&display=swap',
  },
  'space-inter': {
    heading: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap',
  },
  'fraunces-dm': {
    heading: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,700;0,900;1,300&family=DM+Sans:wght@300;400;500;700&display=swap',
  },
  'bebas-barlow': {
    heading: "'Bebas Neue', system-ui, sans-serif",
    body: "'Barlow', system-ui, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap',
  },
  'cormorant-jost': {
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Jost', system-ui, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300&family=Jost:wght@300;400;500;600&display=swap',
  },
  'syne-nunito': {
    heading: "'Syne', system-ui, sans-serif",
    body: "'Nunito Sans', system-ui, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Nunito+Sans:wght@300;400;600;700&display=swap',
  },
  'anton-roboto': {
    heading: "'Anton', system-ui, sans-serif",
    body: "'Roboto', system-ui, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Anton&family=Roboto:wght@300;400;500;700&display=swap',
  },
  'josefin': {
    heading: "'Josefin Sans', system-ui, sans-serif",
    body: "'Josefin Sans', system-ui, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600;700&display=swap',
  },
  'raleway-source': {
    heading: "'Raleway', system-ui, sans-serif",
    body: "'Source Sans 3', system-ui, sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;600;700;900&family=Source+Sans+3:wght@300;400;600&display=swap',
  },
};

// ── Color schemes ─────────────────────────────────────────────────────────────

type TkColorBase = Omit<CommerceTheme, 'primary' | 'primaryContrast'>;

const COLOR_SCHEMES: Record<string, TkColorBase> = {
  light: {
    fontFamily: 'system-ui',
    pageBg: '#ffffff', headerBg: '#ffffff', headerBorder: '#f0f0ee',
    surfaceBg: '#f8f8f6', surfaceBorder: '#e8e8e4', surfaceRadius: '16px', btnRadius: '12px',
    inputBg: '#f8f8f6', inputBorder: '#e0e0dc', inputRadius: '12px',
    textPrimary: '#111111', textSecondary: '#444444', textMuted: '#888888', divider: '#f0f0ee',
    successBg: '#f0fdf4', successText: '#16a34a', successBorder: '#bbf7d0',
    dangerBg: '#fff1f2', dangerText: '#e11d48',
  },
  dark: {
    fontFamily: 'system-ui',
    pageBg: '#0a0a0a', headerBg: '#111111', headerBorder: 'rgba(255,255,255,0.07)',
    surfaceBg: '#1a1a1a', surfaceBorder: 'rgba(255,255,255,0.08)', surfaceRadius: '16px', btnRadius: '12px',
    inputBg: '#222222', inputBorder: 'rgba(255,255,255,0.12)', inputRadius: '12px',
    textPrimary: '#ffffff', textSecondary: '#aaaaaa', textMuted: '#666666', divider: 'rgba(255,255,255,0.07)',
    successBg: 'rgba(16,185,129,0.12)', successText: '#34d399', successBorder: 'rgba(16,185,129,0.2)',
    dangerBg: 'rgba(239,68,68,0.12)', dangerText: '#f87171',
  },
  cream: {
    fontFamily: 'system-ui',
    pageBg: '#f9f6f0', headerBg: '#f9f6f0', headerBorder: '#e8e0d4',
    surfaceBg: '#ffffff', surfaceBorder: '#e4dcd0', surfaceRadius: '8px', btnRadius: '6px',
    inputBg: '#faf8f5', inputBorder: '#d8cfc6', inputRadius: '6px',
    textPrimary: '#1a1208', textSecondary: '#5c4a32', textMuted: '#9a8878', divider: '#e8e0d4',
    successBg: '#f0fdf4', successText: '#2d6a4f', successBorder: '#b7e4c7',
    dangerBg: '#fef2f2', dangerText: '#991b1b',
  },
  slate: {
    fontFamily: 'system-ui',
    pageBg: '#f0f4f8', headerBg: '#ffffff', headerBorder: '#e2e8f0',
    surfaceBg: '#ffffff', surfaceBorder: '#e2e8f0', surfaceRadius: '20px', btnRadius: '16px',
    inputBg: '#f0f4f8', inputBorder: '#d8e4f0', inputRadius: '14px',
    textPrimary: '#1e293b', textSecondary: '#475569', textMuted: '#94a3b8', divider: '#e2e8f0',
    successBg: '#f0fdf4', successText: '#16a34a', successBorder: '#bbf7d0',
    dangerBg: '#fff1f2', dangerText: '#e11d48',
  },
  warm: {
    fontFamily: 'system-ui',
    pageBg: '#fdf8f4', headerBg: '#ffffff', headerBorder: '#f0e8e0',
    surfaceBg: '#ffffff', surfaceBorder: '#f0e8e0', surfaceRadius: '16px', btnRadius: '12px',
    inputBg: '#fdf8f4', inputBorder: '#e8ddd4', inputRadius: '12px',
    textPrimary: '#1c0f04', textSecondary: '#6b4c38', textMuted: '#b08070', divider: '#f0e8e0',
    successBg: '#f0fdf4', successText: '#16a34a', successBorder: '#bbf7d0',
    dangerBg: '#fff1f2', dangerText: '#e11d48',
  },
};

// ── Bucket radii (legacy v1 DesignSystem) ─────────────────────────────────────

const BTN_RADIUS: Record<string, string>     = { pill: '9999px', rounded: '12px', square: '4px' };
const SURFACE_RADIUS: Record<string, string> = { pill: '20px',   rounded: '16px', square: '6px' };

// ── Extended token theme ──────────────────────────────────────────────────────

interface TokenTheme extends CommerceTheme {
  headingFont: string;
  googleFontsUrl: string;
  // Typography intelligence
  headingScale:   number;   // size multiplier
  headingWeight:  number;   // font-weight
  headingTracking: string;  // letter-spacing
  headingLeading:  number;  // line-height
  bodyLeading:     number;  // line-height for body text
  bodyTracking:    string;  // letter-spacing for body text
  // Layout mutation
  compositionStyle: 'grid' | 'staggered' | 'overlapping' | 'asymmetric';
  // Density — how much info is packed per card / per section
  density: 'dense' | 'normal' | 'airy';
  // Animation
  personality?: string;
  motion?: string;
  // Hero background decoration (only when user explicitly requested)
  heroBg?: 'blob' | 'mesh' | 'wave' | 'gradient';
  // Theme blending — ordered list of style archetypes Claude blended
  styleMix?: string[];
  // Content / copy presentation style
  contentStyle?: 'conversational' | 'formal' | 'playful' | 'editorial' | 'minimal';
  // Card visual treatment
  cardStyle?: 'floating' | 'ghost' | 'bordered' | 'filled';
  // Hover interaction style
  hoverStyle?: 'lift' | 'glow' | 'scale' | 'none';
}

// ── Phase 3: Motion & Elevation utilities ─────────────────────────────────────

type MotionLevel    = 'none' | 'subtle' | 'smooth' | 'expressive';
type ElevationLevel = 'flat' | 'subtle' | 'raised' | 'floating';

// ── Animation Archetype ───────────────────────────────────────────────────────
// Derived from personality slug. Drives scroll-reveal style, glow, parallax.
type AnimArchetype = 'luxury' | 'tech' | 'fashion' | 'hype' | 'default';

function getAnimArchetype(personality?: string, motion?: string, styleMix?: string[]): AnimArchetype {
  if (motion === 'none') return 'default';
  // styleMix[0] is the dominant style — check it first
  const dominant = styleMix?.[0]?.toLowerCase() ?? personality?.toLowerCase() ?? '';
  if (!dominant) return 'default';
  if (dominant.includes('zara') || dominant.includes('luxury') || dominant.includes('apple') || dominant.includes('notion') || dominant.includes('editorial')) return 'luxury';
  if (dominant.includes('spotify') || dominant.includes('discord') || dominant.includes('airbnb') || dominant.includes('tech') || dominant.includes('futuristic')) return 'tech';
  if (dominant.includes('tiktok') || dominant.includes('hype') || dominant.includes('streetwear')) return 'hype';
  if (dominant.includes('instagram') || dominant.includes('pinterest') || dominant.includes('fashion') || dominant.includes('korean')) return 'fashion';
  return 'default';
}

// ── CSS injector (CSS-only effects that Framer doesn't handle) ────────────────
function AnimationInjector() {
  return (
    <style>{`
      /* Glow ring on CTA buttons — CSS ::after pseudo-element */
      @keyframes sk-glow { 0%,100% { box-shadow:0 0 0 0 var(--sk-glow-color,rgba(99,102,241,0)); } 50% { box-shadow:0 0 18px 4px var(--sk-glow-color,rgba(99,102,241,0.45)); } }
      .sk-glow-btn { position:relative; overflow:visible; }
      .sk-glow-btn::after { content:''; position:absolute; inset:0; border-radius:inherit; animation:sk-glow 2.4s ease-in-out infinite; }

      /* Animated gradient header — background-position keyframe */
      @keyframes sk-gradShift { 0%{background-position:0% 50%;} 50%{background-position:100% 50%;} 100%{background-position:0% 50%;} }
      .sk-grad-header { background-size:200% 200%; animation:sk-gradShift 6s ease infinite; }

      /* Ken-Burns slow zoom on hero images */
      @keyframes sk-kenBurns { from{transform:scale(1);} to{transform:scale(1.06);} }
      .sk-ken-burns { animation:sk-kenBurns 12s ease-out forwards; }
    `}</style>
  );
}

// ── Haikei-style SVG decorations ─────────────────────────────────────────────
// Organic blob paths (viewBox 0 0 200 200, centered at 100,100)
const BLOB_PATHS = [
  'M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.5,90,-16.3,88.5,-1C87,14.4,81.4,28.8,73,41.7C64.6,54.6,53.4,66,40.2,74.5C27,83.1,13.5,88.8,-0.3,89.3C-14.1,89.8,-28.2,85,-40.7,77.6C-53.2,70.2,-64.1,60.1,-71.9,47.8C-79.7,35.4,-84.4,17.7,-84.8,-0.3C-85.1,-18.2,-81.1,-36.3,-72.3,-50.4C-63.5,-64.4,-50,-74.3,-35.8,-81.3C-21.6,-88.3,-10.8,-92.4,2.3,-96.1C15.4,-99.8,30.7,-83.6,44.7,-76.4Z',
  'M39.9,-68.1C52.3,-60.7,63.2,-51,70.7,-38.8C78.2,-26.7,82.4,-13.3,82.7,0.2C83,13.7,79.3,27.4,72.4,39.5C65.6,51.6,55.5,62.2,43.4,69.1C31.3,75.9,15.6,79.1,0.9,77.7C-13.9,76.4,-27.7,70.5,-40.3,63.1C-52.9,55.7,-64.4,46.7,-71.6,34.7C-78.8,22.7,-81.8,7.7,-80.1,-6.9C-78.4,-21.5,-72.1,-35.7,-62.8,-47.4C-53.5,-59.1,-41.2,-68.3,-28.3,-75.5C-15.4,-82.7,-1.9,-87.9,10.6,-83.3C23.1,-78.8,27.5,-75.5,39.9,-68.1Z',
  'M47.7,-80.4C62.2,-73.4,74.8,-62.1,81.6,-48C88.4,-33.9,89.4,-17,87.1,-1.3C84.8,14.4,79.1,28.8,70.8,40.9C62.4,53.1,51.3,63.1,38.7,70.1C26.2,77.1,12.1,81.2,-2.5,84.9C-17.1,88.5,-34.2,91.7,-47.4,85.2C-60.6,78.8,-69.8,62.7,-75.9,46.4C-82,30.2,-84.9,13.8,-83.9,-2.3C-82.9,-18.4,-78,-34.5,-69.8,-48.4C-61.6,-62.3,-50.1,-73.9,-36.8,-81.4C-23.5,-88.9,-8.4,-92.2,4.5,-98.8C17.3,-105.5,33.2,-87.5,47.7,-80.4Z',
  'M38.8,-67.1C49.8,-59.5,58.2,-49,64.8,-36.9C71.4,-24.8,76.2,-11.1,76.5,2.8C76.8,16.6,72.7,30.7,65.1,42.6C57.6,54.6,46.8,64.3,34.5,71.2C22.3,78.2,8.7,82.3,-5.5,82.1C-19.7,81.9,-34.5,77.4,-46,69.2C-57.5,61.1,-65.7,49.3,-70.4,36.2C-75.1,23.1,-76.4,8.7,-73.6,-4.3C-70.8,-17.2,-63.9,-28.8,-55.1,-38.7C-46.3,-48.6,-35.5,-56.8,-23.9,-64.6C-12.3,-72.4,0.1,-79.8,13,-83.3C25.8,-86.8,27.8,-74.7,38.8,-67.1Z',
  'M43.4,-74.7C55.9,-67.3,65.4,-55.2,72.7,-41.7C80,-28.2,85,-14.1,85.3,0.2C85.6,14.5,81.2,29,73.4,41.1C65.6,53.2,54.4,62.9,41.7,70C29,77.1,14.5,81.5,0.6,80.6C-13.3,79.7,-26.6,73.5,-39.3,65.8C-52,58.1,-64.2,48.9,-72.4,36.8C-80.7,24.7,-85.1,9.7,-83.6,-4.8C-82,-19.3,-74.5,-33.3,-65.2,-45.2C-55.8,-57.1,-44.5,-66.9,-31.9,-74.2C-19.3,-81.5,-5.8,-86.3,7.2,-87.2C20.2,-88.1,30.9,-82.1,43.4,-74.7Z',
  'M34.4,-58.2C46,-51.6,58,-43.9,65.9,-32.7C73.7,-21.5,77.4,-6.8,75.9,7.3C74.3,21.4,67.4,34.9,58.1,45.9C48.8,57,36.9,65.5,23.9,71.3C10.8,77.1,-3.4,80.2,-16.4,77.1C-29.4,74,-41.3,64.7,-51.2,53.5C-61.2,42.4,-69.2,29.3,-72.8,15C-76.5,0.7,-75.8,-14.8,-70.4,-28.5C-65,-42.2,-54.9,-54.1,-43,-60.3C-31,-66.5,-17.2,-67,-2.8,-63.3C11.6,-59.5,22.8,-64.8,34.4,-58.2Z',
];

// Wave divider paths (viewBox "0 0 1440 80")
const WAVE_PATHS = [
  'M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z',
  'M0,60 C360,0 720,80 1080,20 C1260,0 1380,40 1440,30 L1440,80 L0,80 Z',
  'M0,20 C180,60 360,0 540,40 C720,80 900,10 1080,50 C1260,90 1380,30 1440,50 L1440,80 L0,80 Z',
  'M0,0 C360,70 720,10 1080,60 C1260,85 1380,50 1440,40 L1440,80 L0,80 Z',
];

/** Organic blob shape, colored with primaryColor at low opacity */
function HaikeiBlob({
  color, index = 0, size = 400, opacity = 0.12,
  top, left, right, bottom, rotate = 0, className = '',
}: {
  color: string; index?: number; size?: number; opacity?: number;
  top?: string | number; left?: string | number; right?: string | number;
  bottom?: string | number; rotate?: number; className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden
      className={`absolute pointer-events-none select-none ${className}`}
      style={{ width: size, height: size, top, left, right, bottom,
        transform: `rotate(${rotate}deg)`, opacity, zIndex: 0 }}
    >
      <path d={BLOB_PATHS[index % BLOB_PATHS.length]} fill={color} transform="translate(100 100)" />
    </svg>
  );
}

/** Smooth wave SVG at the bottom (or top) of a section */
function HaikeiWave({
  fill, flip = false, variant = 0, height = 64, className = '',
}: {
  fill: string; flip?: boolean; variant?: number; height?: number; className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`absolute left-0 right-0 pointer-events-none select-none ${className}`}
      style={{ [flip ? 'top' : 'bottom']: 0, height, overflow: 'hidden', zIndex: 1 }}
    >
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none"
        className="w-full h-full block"
        style={flip ? { transform: 'scaleY(-1)' } : undefined}>
        <path d={WAVE_PATHS[variant % WAVE_PATHS.length]} fill={fill} />
      </svg>
    </div>
  );
}

/** Blurred radial gradient spots — Haikei "mesh gradient" style background */
function HaikeiMesh({ color, pageBg }: { color: string; pageBg: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none" aria-hidden style={{ zIndex: 0 }}>
      <div className="absolute" style={{ top: '-12%', left: '-8%',  width: '55%', height: '70%', borderRadius: '50%', background: alpha(color, 0.13), filter: 'blur(80px)' }} />
      <div className="absolute" style={{ top: '15%',  right: '-6%', width: '45%', height: '60%', borderRadius: '50%', background: alpha(color, 0.08), filter: 'blur(72px)' }} />
      <div className="absolute" style={{ bottom: '-10%', left: '28%', width: '42%', height: '55%', borderRadius: '50%', background: alpha(color, 0.10), filter: 'blur(88px)' }} />
    </div>
  );
}

// ── Framer Motion: per-archetype reveal variants ──────────────────────────────
const REVEAL_VARIANTS: Record<AnimArchetype, Variants> = {
  luxury: {
    hidden:  { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.25, 0.1, 0.25, 1] } },
  },
  tech: {
    hidden:  { opacity: 0, x: 28 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  },
  fashion: {
    hidden:  { opacity: 0, y: 20, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
  },
  hype: {
    hidden:  { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 18 } },
  },
  default: {
    hidden:  { opacity: 0, y: 22 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  },
};

// Stagger container — children animate in sequence
const STAGGER_CONTAINER: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const STAGGER_CONTAINER_SLOW: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
};

// ── RevealWrapper — Framer whileInView scroll-triggered reveal ────────────────
function RevealWrapper({
  archetype,
  children,
  className = '',
  style,
}: {
  archetype: AnimArchetype;
  delay?: number;   // kept for API compat, unused (use stagger instead)
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const variants = REVEAL_VARIANTS[archetype] ?? REVEAL_VARIANTS.default;
  return (
    <motion.div
      className={className}
      style={style}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
    >
      {children}
    </motion.div>
  );
}

// ── useParallax — Framer useScroll + useTransform ─────────────────────────────
function useParallax(strength = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [elemTop, setElemTop] = useState(0);
  useEffect(() => {
    if (ref.current) setElemTop(ref.current.getBoundingClientRect().top + window.scrollY);
  }, []);
  const range: [number, number] = [elemTop - 600, elemTop + 600];
  const offset = strength * 120;
  const y = useTransform(scrollY, range, [offset, -offset]);
  return { ref, y };
}

// ── getGlowStyle — pulsing glow for CTA buttons (tech / hype) ────────────────
function getGlowCssVar(primaryColor: string): React.CSSProperties {
  // inject the CSS custom property so the ::after keyframe picks it up
  const r = parseInt(primaryColor.slice(1, 3), 16);
  const g = parseInt(primaryColor.slice(3, 5), 16);
  const b = parseInt(primaryColor.slice(5, 7), 16);
  return { '--sk-glow-color': `rgba(${r},${g},${b},0.45)` } as React.CSSProperties;
}

/** Returns a CSS transition string based on the motion token */
function getMotionTransition(motion?: MotionLevel): string {
  switch (motion) {
    case 'none':       return 'none';
    case 'subtle':     return 'all 150ms ease';
    case 'smooth':     return 'all 300ms ease-in-out';
    case 'expressive': return 'all 500ms cubic-bezier(0.34,1.56,0.64,1)';
    default:           return 'all 200ms ease';
  }
}

/** Returns hover scale based on motion intensity */
function getHoverScale(motion?: MotionLevel): string {
  switch (motion) {
    case 'none':       return 'scale(1)';
    case 'subtle':     return 'scale(1.02)';
    case 'smooth':     return 'scale(1.04)';
    case 'expressive': return 'scale(1.07)';
    default:           return 'scale(1.03)';
  }
}

/** Returns box-shadow CSS string based on elevation token */
function getElevationShadow(elevation?: ElevationLevel, colorHint = 'rgba(0,0,0,1)'): string {
  // extract rgb from hex for colored shadows
  const shadowBase = colorHint.startsWith('#')
    ? `rgba(${parseInt(colorHint.slice(1,3),16)},${parseInt(colorHint.slice(3,5),16)},${parseInt(colorHint.slice(5,7),16)},`
    : 'rgba(0,0,0,';
  switch (elevation) {
    case 'flat':     return 'none';
    case 'subtle':   return `0 1px 3px ${shadowBase}0.06), 0 1px 2px ${shadowBase}0.04)`;
    case 'raised':   return `0 4px 16px ${shadowBase}0.10), 0 2px 6px ${shadowBase}0.06)`;
    case 'floating': return `0 12px 40px ${shadowBase}0.16), 0 4px 12px ${shadowBase}0.08)`;
    default:         return `0 2px 8px ${shadowBase}0.08)`;
  }
}

/** Spacing multiplier: compact=0.6, comfortable=1, spacious=1.5 */
function getSpacingPx(spacing?: string, base = 56): number {
  if (spacing === 'compact')    return Math.round(base * 0.6);
  if (spacing === 'spacious')   return Math.round(base * 1.5);
  return base; // comfortable = default
}

type DensityLevel = 'dense' | 'normal' | 'airy';
interface DensityVars {
  cardAspect: string;
  gridGap: string;
  cardPadY: string;
  fontSize: string;
  showCategory: boolean;
  showDesc: boolean;
  infoGap: string;
}
function getDensityVars(density?: DensityLevel): DensityVars {
  switch (density) {
    case 'dense': return { cardAspect: '4/5', gridGap: 'gap-3', cardPadY: 'pt-2', fontSize: 'text-xs', showCategory: true, showDesc: true, infoGap: 'mt-0.5' };
    case 'airy':  return { cardAspect: '2/3', gridGap: 'gap-6 md:gap-8', cardPadY: 'pt-4', fontSize: 'text-sm', showCategory: false, showDesc: false, infoGap: 'mt-2' };
    default:      return { cardAspect: '3/4', gridGap: 'gap-4 md:gap-5', cardPadY: 'pt-3', fontSize: 'text-sm', showCategory: true, showDesc: false, infoGap: 'mt-1' };
  }
}

type ContentStyleLevel = 'conversational' | 'formal' | 'playful' | 'editorial' | 'minimal';
interface ContentStyleVars {
  /** CSS text-transform for small section labels */
  labelTransform: 'uppercase' | 'none';
  /** CSS letter-spacing for small section labels */
  labelTracking: string;
  /** CSS font-size class for section labels */
  labelSize: string;
  /** CSS text-transform for button text */
  btnTransform: 'uppercase' | 'none';
  /** CSS letter-spacing for button text */
  btnTracking: string;
  /** CSS text-transform for product category tags */
  categoryTransform: 'uppercase' | 'none';
  /** Extra body line-height boost (in addition to bodyLeading token) */
  bodyLoose: boolean;
}
function getContentStyleVars(cs?: ContentStyleLevel): ContentStyleVars {
  switch (cs) {
    case 'conversational': return { labelTransform: 'none',      labelTracking: '0.01em',  labelSize: 'text-xs',    btnTransform: 'none',      btnTracking: '0',        categoryTransform: 'none',      bodyLoose: true  };
    case 'formal':         return { labelTransform: 'none',      labelTracking: '0.04em',  labelSize: 'text-xs',    btnTransform: 'none',      btnTracking: '0.03em',   categoryTransform: 'none',      bodyLoose: false };
    case 'playful':        return { labelTransform: 'none',      labelTracking: '0.01em',  labelSize: 'text-sm',    btnTransform: 'none',      btnTracking: '0',        categoryTransform: 'none',      bodyLoose: true  };
    case 'editorial':      return { labelTransform: 'uppercase', labelTracking: '0.18em',  labelSize: 'text-[10px]',btnTransform: 'uppercase', btnTracking: '0.12em',   categoryTransform: 'uppercase', bodyLoose: false };
    case 'minimal':        return { labelTransform: 'none',      labelTracking: '0.06em',  labelSize: 'text-xs',    btnTransform: 'none',      btnTracking: '0.06em',   categoryTransform: 'none',      bodyLoose: false };
    default:               return { labelTransform: 'uppercase', labelTracking: '0.12em',  labelSize: 'text-[10px]',btnTransform: 'uppercase', btnTracking: '0.08em',   categoryTransform: 'uppercase', bodyLoose: false };
  }
}

// ── headlineSize → rem multiplier ────────────────────────────────────────────
type HeadlineSizeLevel = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

/**
 * Absolute rem table for hero h1 font sizes.
 * These are ABSOLUTE values (not multipliers) so they never stack with headingScale.
 * The default 'md' column mirrors the original per-hero base sizes at headingScale=1.
 */
const HERO_HEADLINE_REM: Record<HeadlineSizeLevel, { mobile: number; desktop: number }> = {
  sm:    { mobile: 1.8,  desktop: 2.6  },
  md:    { mobile: 2.4,  desktop: 3.8  }, // neutral default
  lg:    { mobile: 2.9,  desktop: 4.8  },
  xl:    { mobile: 3.4,  desktop: 5.8  },
  '2xl': { mobile: 3.9,  desktop: 6.6  },
  '3xl': { mobile: 4.4,  desktop: 7.5  },
};

/**
 * Build a heading style for hero h1 elements.
 * - When headlineSize is set: uses the absolute rem table above (no headingScale stacking).
 * - When headlineSize is absent: falls back to headingStyle(tt, baseRem) as before.
 */
function heroHeadingStyle(
  tt: TokenTheme,
  baseRemDesktop: number,
  baseRemMobile: number,
  headlineSize: HeadlineSizeLevel | undefined,
  isMobile: boolean,
  extraOverrides?: React.CSSProperties,
): React.CSSProperties {
  const base = isMobile ? baseRemMobile : baseRemDesktop;
  if (!headlineSize || headlineSize === 'md') {
    // Default: let headingStyle apply headingScale normally
    return headingStyle(tt, base, extraOverrides);
  }
  // Explicit headlineSize: absolute rem, preserve other font tokens
  const rem = isMobile
    ? HERO_HEADLINE_REM[headlineSize].mobile
    : HERO_HEADLINE_REM[headlineSize].desktop;
  return headingStyle(tt, base, { fontSize: `${rem}rem`, ...extraOverrides });
}

// ── Card style → CSS object ───────────────────────────────────────────────────
type CardStyleLevel = 'floating' | 'ghost' | 'bordered' | 'filled';
interface CardStyleVars {
  background: string;
  border: string;
  boxShadow: string;
}
function getCardStyleVars(cardStyle: CardStyleLevel | undefined, tt: TokenTheme): CardStyleVars {
  switch (cardStyle) {
    case 'floating': return {
      background: tt.surfaceBg,
      border: `1px solid transparent`,
      boxShadow: `0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)`,
    };
    case 'ghost': return {
      background: 'transparent',
      border: `1px solid ${tt.surfaceBorder}`,
      boxShadow: 'none',
    };
    case 'bordered': return {
      background: tt.surfaceBg,
      border: `2px solid ${tt.surfaceBorder}`,
      boxShadow: 'none',
    };
    default: return { // 'filled'
      background: tt.surfaceBg,
      border: `1px solid ${tt.surfaceBorder}`,
      boxShadow: `0 2px 8px rgba(0,0,0,0.06)`,
    };
  }
}

// ── Hover style → Framer Motion whileHover object ────────────────────────────
type HoverStyleLevel = 'lift' | 'glow' | 'scale' | 'none';
function getHoverMotion(hoverStyle: HoverStyleLevel | undefined, primaryColor?: string): import('framer-motion').TargetAndTransition {
  switch (hoverStyle) {
    case 'lift':  return { y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.15)' };
    case 'scale': return { scale: 1.03 };
    case 'glow':  return primaryColor
      ? { scale: 1.02, boxShadow: `0 0 24px ${alpha(primaryColor, 0.35)}` }
      : { scale: 1.02 };
    case 'none':  return {};
    default:      return { y: -2 }; // subtle lift by default
  }
}

// ── Known serif heading fonts (for CSS fallback stack) ────────────────────────

const SERIF_FONTS = new Set([
  'Playfair Display', 'Cormorant Garamond', 'DM Serif Display', 'Fraunces',
  'Crimson Pro', 'Libre Baskerville', 'Italiana',
]);

function fontStack(name: string, role: 'heading' | 'body'): string {
  const quoted = `'${name}'`;
  if (role === 'heading') {
    return SERIF_FONTS.has(name)
      ? `${quoted}, Georgia, 'Times New Roman', serif`
      : `${quoted}, system-ui, -apple-system, sans-serif`;
  }
  return `${quoted}, system-ui, -apple-system, sans-serif`;
}

function buildGoogleFontsUrl(heading: string, body: string): string {
  const enc = (f: string) => encodeURIComponent(f).replace(/%20/g, '+');
  const headWeights = SERIF_FONTS.has(heading) ? '300;400;600;700' : '400;600;700;900';
  if (heading === body) {
    return `https://fonts.googleapis.com/css2?family=${enc(heading)}:wght@300;400;600;700;900&display=swap`;
  }
  return `https://fonts.googleapis.com/css2?family=${enc(heading)}:wght@${headWeights}&family=${enc(body)}:wght@300;400;500;600&display=swap`;
}

// ── v2: build theme from raw DesignTokens (Claude-generated values) ───────────

function getTokenThemeV2(dt: DesignTokens, primaryColor: string): TokenTheme {
  return {
    fontFamily:      fontStack(dt.bodyFont, 'body'),
    pageBg:          dt.pageBg,
    headerBg:        dt.headerBg,
    headerBorder:    dt.headerBorder,
    surfaceBg:       dt.surfaceBg,
    surfaceBorder:   dt.surfaceBorder,
    surfaceRadius:   dt.cardRadius,
    btnRadius:       dt.btnRadius,
    inputBg:         dt.pageBg,
    inputBorder:     dt.surfaceBorder,
    inputRadius:     dt.inputRadius,
    textPrimary:     dt.textPrimary,
    textSecondary:   dt.textSecondary,
    textMuted:       dt.textMuted,
    divider:         dt.divider,
    successBg:       dt.successColor ? alpha(dt.successColor, 0.1) : '#f0fdf4',
    successText:     dt.successColor ?? '#16a34a',
    successBorder:   dt.successColor ? alpha(dt.successColor, 0.3) : '#bbf7d0',
    dangerBg:        dt.dangerColor  ? alpha(dt.dangerColor,  0.1) : '#fff1f2',
    dangerText:      dt.dangerColor  ?? '#e11d48',
    primary:         primaryColor,
    primaryContrast: isDark(primaryColor) ? '#ffffff' : '#000000',
    headingFont:     fontStack(dt.headingFont, 'heading'),
    googleFontsUrl:  buildGoogleFontsUrl(dt.headingFont, dt.bodyFont),
    // Typography intelligence — Claude-specified or sensible defaults
    headingScale:    dt.headingScale    ?? 1.0,
    headingWeight:   dt.headingWeight   ?? 800,
    headingTracking: dt.headingTracking ?? '-0.02em',
    headingLeading:  dt.headingLeading  ?? 1.05,
    bodyLeading:     dt.bodyLeading     ?? 1.6,
    bodyTracking:    dt.bodyTracking    ?? '0',
    // Layout mutation
    compositionStyle: dt.compositionStyle ?? 'grid',
    density: dt.density ?? 'normal',
    // Animation archetype context
    personality: dt.personality,
    motion:      dt.motion,
    // Hero background decoration
    heroBg: dt.heroBg,
    // Theme blending
    styleMix: dt.styleMix,
    // Content style
    contentStyle: dt.contentStyle,
    // Card + hover style
    cardStyle:  dt.cardStyle,
    hoverStyle: dt.hoverStyle,
  };
}

// ── Minimal fallback theme (no tokens, no design system) ─────────────────────

function getDefaultTokenTheme(primaryColor: string): TokenTheme {
  const pc = primaryColor || '#10b981';
  return {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    pageBg: '#ffffff', headerBg: '#ffffff', headerBorder: '#f0f0ee',
    surfaceBg: '#f9f9f7', surfaceBorder: '#e5e5e0', surfaceRadius: '16px',
    btnRadius: '12px', inputBg: '#f9f9f7', inputBorder: '#e5e5e0', inputRadius: '12px',
    textPrimary: '#111111', textSecondary: '#555555', textMuted: '#999999', divider: '#f0f0ee',
    successBg: '#f0fdf4', successText: '#16a34a', successBorder: '#bbf7d0',
    dangerBg: '#fff1f2', dangerText: '#e11d48',
    primary: pc, primaryContrast: isDark(pc) ? '#ffffff' : '#000000',
    headingFont: 'system-ui, -apple-system, sans-serif',
    googleFontsUrl: '',
    headingScale: 1.0, headingWeight: 800, headingTracking: '-0.02em',
    headingLeading: 1.05, bodyLeading: 1.6, bodyTracking: '0',
    compositionStyle: 'grid',
    density: 'normal',
    personality: undefined, motion: 'subtle',
  };
}

// ── v1: build theme from bucket DesignSystem (legacy) ────────────────────────

function getTokenThemeV1(ds: DesignSystem, primaryColor: string): TokenTheme {
  const colorBase = COLOR_SCHEMES[ds.colorScheme] ?? COLOR_SCHEMES.light;
  const fonts = FONT_PAIRS[ds.fontPair] ?? FONT_PAIRS['space-inter'];
  const btnR  = BTN_RADIUS[ds.buttonStyle] ?? '12px';
  const surR  = SURFACE_RADIUS[ds.buttonStyle] ?? '16px';
  return {
    ...colorBase,
    fontFamily: fonts.body,
    btnRadius: btnR,
    surfaceRadius: surR,
    inputRadius: btnR === '9999px' ? '20px' : btnR,
    primary: primaryColor,
    primaryContrast: isDark(primaryColor) ? '#ffffff' : '#000000',
    headingFont: fonts.heading,
    googleFontsUrl: fonts.url,
    headingScale: 1.0, headingWeight: 800, headingTracking: '-0.02em',
    headingLeading: 1.05, bodyLeading: 1.6, bodyTracking: '0',
    compositionStyle: 'grid',
    density: 'normal',
    personality: undefined, motion: 'subtle',
  };
}

// ── Typography Intelligence helpers ───────────────────────────────────────────

/**
 * Returns a heading style object incorporating all typography tokens.
 * baseRem: the "neutral" font size in rem (e.g. 3 for a 3rem hero title).
 */
function headingStyle(
  tt: TokenTheme,
  baseRem: number,
  overrides?: React.CSSProperties,
): React.CSSProperties {
  return {
    fontFamily:    tt.headingFont,
    fontSize:      `${(baseRem * tt.headingScale).toFixed(3)}rem`,
    fontWeight:    tt.headingWeight,
    letterSpacing: tt.headingTracking,
    lineHeight:    tt.headingLeading,
    ...overrides,
  };
}

/**
 * Returns a body/paragraph style object with line-height + tracking tokens.
 */
function bodyStyle(tt: TokenTheme, overrides?: React.CSSProperties): React.CSSProperties {
  return {
    lineHeight:    tt.bodyLeading,
    letterSpacing: tt.bodyTracking,
    ...overrides,
  };
}

// ── Font injector ─────────────────────────────────────────────────────────────

function TkFontInjector({ url }: { url: string }) {
  return <style>{`@import url('${url}');`}</style>;
}

// ── Hero section props helpers ────────────────────────────────────────────────

type HeroP = {
  textAlign?:    'left' | 'center' | 'right';
  imageRatio?:   'portrait' | 'square' | 'landscape';
  ctaStyle?:     'filled' | 'outline' | 'text';
  accentLine?:   boolean;
  headlineSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
};

function heroImageAspect(ratio?: HeroP['imageRatio']): string {
  switch (ratio) {
    case 'square':    return '1/1';
    case 'landscape': return '4/3';
    case 'portrait':
    default:          return '3/4';
  }
}

function heroCtaStyle(ctaStyle: HeroP['ctaStyle'] = 'filled', primaryColor: string, btnRadius: string, btnText: string, cv?: ContentStyleVars) {
  const typo = cv ? { textTransform: cv.btnTransform as 'uppercase' | 'none', letterSpacing: cv.btnTracking } : {};
  switch (ctaStyle) {
    case 'outline': return { background: 'transparent', color: primaryColor, border: `2px solid ${primaryColor}`, borderRadius: btnRadius, ...typo };
    case 'text':    return { background: 'transparent', color: primaryColor, borderRadius: btnRadius, padding: '0', ...typo };
    default:        return { background: primaryColor,  color: btnText, borderRadius: btnRadius, ...typo };
  }
}

// ── Hero: CENTERED ────────────────────────────────────────────────────────────

function TkHeroCentered({ design, tt, primaryColor, device, onScrollToProducts, heroProps = {}, editMode, onFieldChange }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void; heroProps?: HeroP;
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
}) {
  const { heroTitle, heroSubtitle, ctaText, products = [], collections = [], tagline } = design;
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  const bgImage = products[0]?.image;
  const arch = getAnimArchetype(tt.personality, tt.motion, tt.styleMix);
  const isLuxury = arch === 'luxury';
  const isTechHype = arch === 'tech' || arch === 'hype';
  const textAlign = heroProps.textAlign ?? 'center';
  const ctaStyleObj = heroCtaStyle(heroProps.ctaStyle, primaryColor, tt.btnRadius, btnText, getContentStyleVars(tt.contentStyle));

  // Framer stagger container — children animate in sequence on mount
  const heroStagger: Variants = {
    hidden:  {},
    visible: { transition: { staggerChildren: isLuxury ? 0.18 : 0.1, delayChildren: 0.1 } },
  };
  const heroItem = REVEAL_VARIANTS[arch] ?? REVEAL_VARIANTS.default;

  return (
    <section className="relative overflow-hidden" style={{ minHeight: isMobile ? '60vh' : '70vh' }}>
      {bgImage && (
        <>
          <div className="absolute inset-0 overflow-hidden">
            {/* Ken-Burns slow zoom for luxury archetype (CSS only — scale doesn't need spring) */}
            <ProductImg src={bgImage} alt=""
              className={`w-full h-full object-cover${isLuxury ? ' sk-ken-burns' : ''}`}
              style={isLuxury ? { transformOrigin: 'center center', animationDuration: '14s' } : undefined} />
          </div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.65) 100%)' }} />
        </>
      )}
      {/* Haikei decorations — only when user explicitly requested via heroBg token */}
      {!bgImage && tt.heroBg === 'blob'     && <><HaikeiBlob color={primaryColor} index={0} size={isMobile ? 280 : 420} opacity={0.10} top="-15%" right="-8%" rotate={25} /><HaikeiBlob color={primaryColor} index={3} size={isMobile ? 220 : 320} opacity={0.07} bottom="-10%" left="-6%" rotate={-15} /></>}
      {!bgImage && tt.heroBg === 'mesh'     && <HaikeiMesh color={primaryColor} pageBg={tt.pageBg} />}
      {!bgImage && tt.heroBg === 'wave'     && <HaikeiWave fill={tt.surfaceBg} variant={1} height={isMobile ? 40 : 56} />}
      {!bgImage && tt.heroBg === 'gradient' && <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${alpha(primaryColor, 0.18)} 0%, transparent 70%)`, zIndex: 0 }} />}
      <motion.div
        className="relative z-10 flex flex-col justify-center px-5"
        style={{ minHeight: isMobile ? '60vh' : '70vh', padding: isMobile ? '60px 20px' : '80px 40px',
          alignItems: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
          textAlign }}
        variants={heroStagger} initial="hidden" animate="visible"
      >
        {tagline && (
          <motion.p variants={heroItem} className="text-xs font-semibold uppercase tracking-[0.3em] mb-4" style={{ color: alpha(primaryColor, 0.9) }}>
            {collections[0]?.emoji} <EditSpan field="tagline" value={tagline} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </motion.p>
        )}
        {heroProps.accentLine && <motion.div variants={heroItem} style={{ width: '40px', height: '3px', background: primaryColor, marginBottom: '16px' }} />}
        <motion.h1 variants={heroItem} className="mb-5" style={{ ...heroHeadingStyle(tt, 4.0, 2.4, heroProps.headlineSize, isMobile), color: bgImage ? '#ffffff' : tt.textPrimary }}>
          <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
        </motion.h1>
        <motion.p variants={heroItem} className="mb-8 max-w-lg" style={{ ...bodyStyle(tt), fontSize: '0.875rem', color: bgImage ? 'rgba(255,255,255,0.82)' : tt.textSecondary }}>
          <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
        </motion.p>
        {/* Glow CTA for tech/hype archetypes */}
        <motion.button
          variants={heroItem}
          onClick={editMode ? undefined : onScrollToProducts}
          whileHover={{ scale: 1.04, opacity: 0.92 }}
          whileTap={{ scale: 0.97 }}
          className={`px-8 py-3.5 text-sm font-bold${isTechHype && heroProps.ctaStyle !== 'outline' && heroProps.ctaStyle !== 'text' ? ' sk-glow-btn' : ''}`}
          style={{ ...ctaStyleObj, ...(isTechHype && !heroProps.ctaStyle ? getGlowCssVar(primaryColor) : {}) }}>
          <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          {!editMode && heroProps.ctaStyle === 'text' && <ArrowRight className="w-3.5 h-3.5 inline ml-1" />}
        </motion.button>
      </motion.div>
    </section>
  );
}

// ── Hero: SPLIT ───────────────────────────────────────────────────────────────

function TkHeroSplit({ design, tt, primaryColor, device, onScrollToProducts, fmtPrice, heroProps = {}, editMode, onFieldChange }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void; fmtPrice: (n: number) => string; heroProps?: HeroP;
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
}) {
  const { heroTitle, heroSubtitle, ctaText, products = [], collections = [], tagline } = design;
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  const arch = getAnimArchetype(tt.personality, tt.motion, tt.styleMix);
  const isLuxury = arch === 'luxury';
  const isTechHype = arch === 'tech' || arch === 'hype';
  const { ref: parallaxRef, y: parallaxY } = useParallax(isLuxury ? 0.08 : 0);
  const ctaStyleObj = heroCtaStyle(heroProps.ctaStyle, primaryColor, tt.btnRadius, btnText, getContentStyleVars(tt.contentStyle));
  const imgAspect = heroImageAspect(heroProps.imageRatio);

  const heroStagger: Variants = {
    hidden:  {},
    visible: { transition: { staggerChildren: isLuxury ? 0.16 : 0.1, delayChildren: 0.08 } },
  };
  const heroItem = REVEAL_VARIANTS[arch] ?? REVEAL_VARIANTS.default;

  return (
    <section className="relative overflow-hidden" style={{ background: tt.pageBg }}>
      {/* Haikei decorations — only when user explicitly requested */}
      {tt.heroBg === 'blob'     && <><HaikeiBlob color={primaryColor} index={1} size={isMobile ? 260 : 440} opacity={0.09} top={isMobile ? '-10%' : '-15%'} right={isMobile ? '-12%' : '-8%'} rotate={20} /><HaikeiBlob color={primaryColor} index={4} size={isMobile ? 180 : 300} opacity={0.06} bottom="-8%" left="-5%" rotate={-30} /></>}
      {tt.heroBg === 'mesh'     && <HaikeiMesh color={primaryColor} pageBg={tt.pageBg} />}
      {tt.heroBg === 'wave'     && <HaikeiWave fill={tt.surfaceBg} variant={0} height={isMobile ? 36 : 52} />}
      {tt.heroBg === 'gradient' && <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 55% at 80% 50%, ${alpha(primaryColor, 0.15)} 0%, transparent 65%)`, zIndex: 0 }} />}
      <div className={`relative z-10 max-w-6xl mx-auto px-5 ${isMobile ? 'py-10 flex flex-col gap-8' : 'py-16 grid grid-cols-2 gap-14 items-center'}`}>
        <motion.div variants={heroStagger} initial="hidden" animate="visible">
          {tagline && (
            <motion.p variants={heroItem} className="text-[10px] font-bold uppercase tracking-[0.3em] mb-5" style={{ color: primaryColor }}>
              {collections[0]?.emoji} <EditSpan field="tagline" value={tagline} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </motion.p>
          )}
          {heroProps.accentLine && <motion.div variants={heroItem} style={{ width: '40px', height: '3px', background: primaryColor, marginBottom: '16px' }} />}
          <motion.h1 variants={heroItem} className="mb-5" style={{ ...heroHeadingStyle(tt, 3.6, 2.4, heroProps.headlineSize, isMobile), color: tt.textPrimary }}>
            <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </motion.h1>
          <motion.p variants={heroItem} className="mb-8 max-w-sm" style={{ ...bodyStyle(tt), fontSize: '0.875rem', color: tt.textSecondary }}>
            <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
          </motion.p>
          <motion.div variants={heroItem} className="flex items-center gap-4">
            <motion.button
              onClick={editMode ? undefined : onScrollToProducts}
              whileHover={{ scale: 1.04, opacity: 0.92 }}
              whileTap={{ scale: 0.97 }}
              className={`px-7 py-3.5 text-sm font-bold${isTechHype && !heroProps.ctaStyle ? ' sk-glow-btn' : ''}`}
              style={{ ...ctaStyleObj, ...(isTechHype && !heroProps.ctaStyle ? getGlowCssVar(primaryColor) : {}) }}>
              <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
              {!editMode && heroProps.ctaStyle === 'text' && <ArrowRight className="w-3.5 h-3.5 inline ml-1" />}
            </motion.button>
            {heroProps.ctaStyle !== 'text' && (
              <button onClick={onScrollToProducts} className="text-xs font-semibold flex items-center gap-1.5 hover:opacity-70 transition-opacity" style={{ color: tt.textMuted }}>
                Explore <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        </motion.div>
        <motion.div className="relative" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}>
          {/* Parallax wrapper — Framer motion.div with y spring transform */}
          <motion.div
            ref={parallaxRef}
            style={{ aspectRatio: imgAspect, borderRadius: tt.surfaceRadius, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', ...(isLuxury ? { y: parallaxY } : {}) }}
          >
            <ProductImg src={products[0]?.image} alt=""
              className={`w-full h-full object-cover${isLuxury ? ' sk-ken-burns' : ''}`}
              style={isLuxury ? { animationDuration: '10s' } : undefined} />
          </motion.div>
          {!isMobile && products[1] && (
            <div className="absolute -bottom-6 -left-8 rounded-2xl p-4 shadow-2xl" style={{ maxWidth: '180px', background: tt.surfaceBg }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0" style={{ background: tt.pageBg }}>
                  <ProductImg src={products[1].image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider truncate" style={{ color: tt.textMuted }}>{products[1].category}</p>
                  <p className="text-xs font-bold truncate" style={{ color: tt.textPrimary }}>{products[1].name}</p>
                  <p className="text-xs font-black mt-0.5" style={{ color: primaryColor }}>{fmtPrice(products[1].price)}</p>
                </div>
              </div>
            </div>
          )}
          {!isMobile && collections[1] && (
            <div className="absolute -top-4 -right-4 rounded-full px-4 py-2 shadow-xl text-xs font-bold" style={{ background: tt.surfaceBg, color: tt.textSecondary }}>
              {collections[1].emoji} {collections[1].name}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

// ── Hero: FULLSCREEN ──────────────────────────────────────────────────────────

function TkHeroFullscreen({ design, tt, primaryColor, device, onScrollToProducts, heroProps = {}, editMode, onFieldChange }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void; heroProps?: HeroP;
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
}) {
  const { heroTitle, heroSubtitle, ctaText, products = [], tagline } = design;
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  const ctaStyleObj = heroCtaStyle(heroProps.ctaStyle, primaryColor, tt.btnRadius, btnText, getContentStyleVars(tt.contentStyle));
  return (
    <section className="relative" style={{ height: isMobile ? '85vh' : '92vh', minHeight: '480px' }}>
      <div className="absolute inset-0">
        <ProductImg src={products[0]?.image} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)' }} />
      </div>
      <div className="relative z-10 flex flex-col justify-end h-full px-8 pb-16">
        {tagline && (
          <p className="text-xs font-semibold uppercase tracking-[0.35em] mb-4" style={{ color: primaryColor }}>
            <EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
        )}
        <h1 className="mb-5 text-white" style={heroHeadingStyle(tt, 5.5, 3.2, heroProps.headlineSize, isMobile)}>
          <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
        </h1>
        <p className="mb-8 max-w-md" style={{ ...bodyStyle(tt), fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)' }}>
          <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
        </p>
        {heroProps.accentLine && <div style={{ width: '40px', height: '3px', background: primaryColor, marginBottom: '16px' }} />}
        <button onClick={editMode ? undefined : onScrollToProducts} className="w-fit px-8 py-3.5 text-sm font-bold hover:opacity-90 transition-opacity" style={ctaStyleObj}>
          <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          {!editMode && <ArrowRight className="w-4 h-4 inline ml-1" />}
        </button>
      </div>
    </section>
  );
}

// ── Hero: MINIMAL ─────────────────────────────────────────────────────────────

function TkHeroMinimal({ design, tt, primaryColor, device, onScrollToProducts, heroProps = {}, editMode, onFieldChange }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void; heroProps?: HeroP;
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
}) {
  const { heroTitle, heroSubtitle, ctaText, tagline, collections = [] } = design;
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  const ctaStyleObj = heroCtaStyle(heroProps.ctaStyle, primaryColor, tt.btnRadius, btnText, getContentStyleVars(tt.contentStyle));
  const textAlign = heroProps.textAlign ?? 'center';
  return (
    <section className="relative overflow-hidden" style={{ background: tt.pageBg, borderBottom: `1px solid ${tt.divider}` }}>
      {/* Haikei decorations — only when user explicitly requested */}
      {tt.heroBg === 'blob'     && <><HaikeiBlob color={primaryColor} index={2} size={isMobile ? 200 : 340} opacity={0.08} top="-20%" right="-5%" rotate={10} /><HaikeiBlob color={primaryColor} index={5} size={isMobile ? 160 : 260} opacity={0.06} bottom="-15%" left="-4%" rotate={-20} /></>}
      {tt.heroBg === 'mesh'     && <HaikeiMesh color={primaryColor} pageBg={tt.pageBg} />}
      {tt.heroBg === 'wave'     && <HaikeiWave fill={tt.surfaceBg} variant={0} height={isMobile ? 36 : 52} />}
      {tt.heroBg === 'gradient' && <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 90% 60% at 50% 0%, ${alpha(primaryColor, 0.14)} 0%, transparent 70%)`, zIndex: 0 }} />}
      <div className="relative z-10 max-w-3xl mx-auto px-5" style={{ padding: isMobile ? '56px 20px' : '80px 40px', textAlign }}>
        {tagline && (
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] mb-5" style={{ color: primaryColor }}>
            {collections[0]?.emoji} <EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
        )}
        {heroProps.accentLine && <div style={{ width: '40px', height: '3px', background: primaryColor, marginBottom: '16px', margin: textAlign === 'center' ? '0 auto 16px' : '0 0 16px' }} />}
        <h1 className="mb-5" style={{ ...heroHeadingStyle(tt, 3.6, 2.2, heroProps.headlineSize, isMobile), color: tt.textPrimary }}>
          <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
        </h1>
        <p className="mb-8 max-w-xl mx-auto" style={{ ...bodyStyle(tt), fontSize: '0.875rem', color: tt.textSecondary }}>
          <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
        </p>
        <button onClick={editMode ? undefined : onScrollToProducts} className="px-8 py-3.5 text-sm font-bold hover:opacity-90 transition-opacity" style={ctaStyleObj}>
          <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          {!editMode && heroProps.ctaStyle === 'text' && <ArrowRight className="w-3.5 h-3.5 inline ml-1" />}
        </button>
      </div>
    </section>
  );
}

// ── Hero: EDITORIAL ───────────────────────────────────────────────────────────
// Magazine-style: giant background text, product image floats on top, off-grid

function TkHeroEditorial({ design, tt, primaryColor, device, onScrollToProducts, heroProps = {}, editMode, onFieldChange }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void; heroProps?: HeroP;
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
}) {
  const { heroTitle, heroSubtitle, ctaText, products = [], tagline } = design;
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  const ctaStyleObj = heroCtaStyle(heroProps.ctaStyle, primaryColor, tt.btnRadius, btnText, getContentStyleVars(tt.contentStyle));
  const imgAspect = heroImageAspect(heroProps.imageRatio);
  const words = heroTitle.split(' ');
  const bigWord = words[0] ?? heroTitle;
  const restWords = words.slice(1).join(' ');

  return (
    <section style={{ background: tt.pageBg, overflow: 'hidden', minHeight: isMobile ? '80vh' : '88vh', position: 'relative' }}>
      {/* Haikei decorations — only when user explicitly requested */}
      {tt.heroBg === 'blob'     && <HaikeiBlob color={primaryColor} index={0} size={isMobile ? 220 : 380} opacity={0.06} bottom="-10%" right="-6%" rotate={40} />}
      {tt.heroBg === 'mesh'     && <HaikeiMesh color={primaryColor} pageBg={tt.pageBg} />}
      {tt.heroBg === 'wave'     && <HaikeiWave fill={tt.surfaceBg} variant={3} height={isMobile ? 36 : 52} />}
      {tt.heroBg === 'gradient' && <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 60% 50% at 70% 50%, ${alpha(primaryColor, 0.12)} 0%, transparent 65%)`, zIndex: 0 }} />}
      {/* Giant ghost word — decorative background text */}
      <div aria-hidden className="absolute select-none pointer-events-none"
        style={{
          fontFamily: tt.headingFont,
          fontSize: isMobile ? '22vw' : '17vw',
          fontWeight: 900,
          lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: `1.5px ${alpha(tt.textPrimary, 0.07)}`,
          top: isMobile ? '-2vw' : '-1vw',
          left: '-1vw',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          letterSpacing: '-0.04em',
        }}>
        {bigWord}
      </div>

      {isMobile ? (
        /* Mobile: stacked */
        <div className="relative z-10 flex flex-col px-6 pt-16 pb-10 gap-8">
          <div>
            {tagline && <p className="text-[10px] uppercase tracking-[0.35em] mb-4" style={{ color: primaryColor }}><EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>}
            <h1 style={{ ...heroHeadingStyle(tt, 2.6, 2.6, heroProps.headlineSize, isMobile), color: tt.textPrimary }}>
              {bigWord}<br /><span style={{ color: primaryColor }}>{restWords}</span>
            </h1>
            <p className="mt-4 mb-6" style={{ ...bodyStyle(tt), fontSize: '0.875rem', color: tt.textSecondary }}><EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} /></p>
            <button onClick={editMode ? undefined : onScrollToProducts} className="px-7 py-3 text-sm font-bold" style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}><EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></button>
          </div>
          {products[0] && (
            <div className="relative mx-auto w-56">
              <div className="overflow-hidden" style={{ aspectRatio: '3/4', borderRadius: tt.surfaceRadius }}>
                <ProductImg src={products[0].image} alt="" className="w-full h-full object-cover" />
              </div>
              {products[1] && (
                <div className="absolute -bottom-4 -right-6 w-24 overflow-hidden shadow-xl" style={{ aspectRatio: '1/1', borderRadius: tt.surfaceRadius }}>
                  <ProductImg src={products[1].image} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Desktop: asymmetric 2-col */
        <div className="relative z-10 grid grid-cols-[1fr_1.2fr] max-w-6xl mx-auto px-10 gap-0" style={{ minHeight: '88vh', alignItems: 'center' }}>
          {/* Text col */}
          <div className="pr-8">
            {tagline && <p className="text-[10px] uppercase tracking-[0.4em] mb-6" style={{ color: primaryColor }}><EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>}
            <h1 style={{ ...heroHeadingStyle(tt, 5.0, 2.6, heroProps.headlineSize, isMobile), color: tt.textPrimary }}>
              {bigWord}<br />
              <span style={{ color: primaryColor }}>{restWords}</span>
            </h1>
            <div style={{ width: '48px', height: '3px', background: primaryColor, margin: '24px 0' }} />
            <p className="mb-8 max-w-xs" style={{ ...bodyStyle(tt), fontSize: '0.875rem', color: tt.textSecondary }}><EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} /></p>
            <div className="flex items-center gap-4">
              <button onClick={editMode ? undefined : onScrollToProducts} className="px-8 py-3.5 text-sm font-bold transition-opacity hover:opacity-85"
                style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}><EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></button>
              <button onClick={editMode ? undefined : onScrollToProducts} className="text-xs font-semibold flex items-center gap-1 hover:opacity-60 transition-opacity" style={{ color: tt.textMuted }}>
                View collection <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {/* Image col — off-grid, bleeds to edge */}
          {products[0] && (
            <div className="relative h-full flex items-center">
              <div className="w-full overflow-hidden" style={{ aspectRatio: '3/4', borderRadius: `${tt.surfaceRadius} 0 0 ${tt.surfaceRadius}`, maxHeight: '80vh' }}>
                <ProductImg src={products[0].image} alt="" className="w-full h-full object-cover" />
              </div>
              {/* Floating mini card */}
              {products[1] && (
                <div className="absolute bottom-12 -left-10 shadow-2xl overflow-hidden" style={{ width: '140px', borderRadius: tt.surfaceRadius }}>
                  <div style={{ aspectRatio: '3/4' }}>
                    <ProductImg src={products[1].image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3" style={{ background: tt.surfaceBg }}>
                    <p className="text-[10px] truncate" style={{ color: tt.textMuted }}>{products[1].category}</p>
                    <p className="text-xs font-black" style={{ color: primaryColor }}>{products[1].name}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Hero: VIDEO ───────────────────────────────────────────────────────────────
// Cinematic dark hero — simulated video with animated gradient + product image

function TkHeroVideo({ design, tt, primaryColor, device, onScrollToProducts, heroProps = {}, editMode, onFieldChange }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void; heroProps?: HeroP;
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
}) {
  const { heroTitle, heroSubtitle, ctaText, products = [], tagline } = design;
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  const ctaStyleObj = heroCtaStyle(heroProps.ctaStyle, primaryColor, tt.btnRadius, btnText, getContentStyleVars(tt.contentStyle));
  const pc = primaryColor;
  const isLight = !isDark(pc);
  return (
    <section className="relative overflow-hidden" style={{ height: isMobile ? '88vh' : '96vh', minHeight: '520px' }}>
      <style>{`
        @keyframes storee-video-bg {
          0%   { transform: scale(1.0) translateX(0px); }
          50%  { transform: scale(1.08) translateX(-20px); }
          100% { transform: scale(1.0) translateX(0px); }
        }
        @keyframes storee-pulse-ring {
          0%   { box-shadow: 0 0 0 0 ${alpha(pc, 0.5)}; }
          70%  { box-shadow: 0 0 0 12px ${alpha(pc, 0)}; }
          100% { box-shadow: 0 0 0 0 ${alpha(pc, 0)}; }
        }
      `}</style>

      {/* Animated background — product image with ken-burns effect */}
      {products[0] && (
        <div className="absolute inset-0" style={{ animation: 'storee-video-bg 14s ease-in-out infinite' }}>
          <ProductImg src={products[0].image} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Dark cinematic overlay with gradient */}
      <div className="absolute inset-0" style={{
        background: `linear-gradient(135deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 55%, ${alpha(pc, 0.25)} 100%)`,
      }} />

      {/* Grain texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        backgroundSize: '180px',
      }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full px-8 pb-16 max-w-4xl">
        {tagline && (
          <div className="flex items-center gap-2 mb-5">
            <div style={{ width: '24px', height: '2px', background: pc }} />
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/70"><EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>
          </div>
        )}
        <h1 className="mb-5 text-white" style={heroHeadingStyle(tt, 6.0, 3.5, heroProps.headlineSize, isMobile)}>
          <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
        </h1>
        <p className="mb-8 max-w-sm" style={{ ...bodyStyle(tt), fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
          <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
        </p>
        <div className="flex items-center gap-5">
          <button onClick={editMode ? undefined : onScrollToProducts}
            className="px-8 py-3.5 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
            style={{ background: pc, color: isDark(pc) ? '#fff' : '#000', borderRadius: tt.btnRadius }}>
            <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </button>
          {/* Play button */}
          <button className="flex items-center gap-3 text-white/70 hover:text-white transition-colors">
            <div className="w-11 h-11 rounded-full border border-white/30 flex items-center justify-center"
              style={{ animation: 'storee-pulse-ring 2.5s cubic-bezier(0.455,0.03,0.515,0.955) infinite' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest">Watch Film</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Hero: STACKED ─────────────────────────────────────────────────────────────
// Mood-board: 3 product images stacked/rotated, text alongside

function TkHeroStacked({ design, tt, primaryColor, device, onScrollToProducts, heroProps = {}, editMode, onFieldChange }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void; heroProps?: HeroP;
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
}) {
  const { heroTitle, heroSubtitle, ctaText, products = [], tagline, collections = [] } = design;
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  const ctaStyleObj = heroCtaStyle(heroProps.ctaStyle, primaryColor, tt.btnRadius, btnText, getContentStyleVars(tt.contentStyle));
  const imgAspect = heroImageAspect(heroProps.imageRatio);
  const rotations = [-4, 2, -1.5];

  return (
    <section className="relative" style={{ background: tt.pageBg, overflow: 'hidden' }}>
      {/* Haikei decorations — only when user explicitly requested */}
      {tt.heroBg === 'blob'     && <HaikeiBlob color={primaryColor} index={3} size={isMobile ? 240 : 400} opacity={0.09} top={isMobile ? '-5%' : '-10%'} right={isMobile ? '-10%' : '-6%'} rotate={-10} />}
      {tt.heroBg === 'mesh'     && <HaikeiMesh color={primaryColor} pageBg={tt.pageBg} />}
      {tt.heroBg === 'wave'     && <HaikeiWave fill={tt.surfaceBg} variant={2} height={isMobile ? 36 : 50} />}
      {tt.heroBg === 'gradient' && <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 75% 60% at 60% 40%, ${alpha(primaryColor, 0.13)} 0%, transparent 70%)`, zIndex: 0 }} />}
      <div className={`relative z-10 max-w-6xl mx-auto px-6 ${isMobile ? 'py-12 flex flex-col gap-10' : 'py-16 grid grid-cols-2 gap-12 items-center'}`}>
        {/* Text side */}
        <div className={isMobile ? 'order-2' : ''}>
          {tagline && (
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] mb-5" style={{ color: primaryColor }}>
              {collections[0]?.emoji} <EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </p>
          )}
          <h1 className="mb-5" style={{ ...heroHeadingStyle(tt, 3.8, 2.4, heroProps.headlineSize, isMobile), color: tt.textPrimary }}>
            <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </h1>
          <p className="mb-8 max-w-sm" style={{ ...bodyStyle(tt), fontSize: '0.875rem', color: tt.textSecondary }}><EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} /></p>
          <div className="flex flex-wrap items-center gap-4">
            <button onClick={editMode ? undefined : onScrollToProducts}
              className="px-7 py-3.5 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
              style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}>
              <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </button>
            {/* Collection pills */}
            {collections.slice(0, 2).map(c => (
              <span key={c.name} className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: alpha(primaryColor, 0.1), color: primaryColor }}>
                {editMode ? <><StyleOnlySpan field={`collections.${i}.emojiHtml`} value={c.emoji} htmlValue={c.emojiHtml} editMode={editMode} onFieldChange={onFieldChange} /> <StyleOnlySpan field={`collections.${i}.nameHtml`} value={c.name} htmlValue={c.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /></> : `${c.emoji} ${c.name}`}
              </span>
            ))}
          </div>
        </div>

        {/* Stacked images side */}
        <div className={`relative flex items-center justify-center ${isMobile ? 'order-1 h-64' : 'h-96'}`}>
          {products.slice(0, 3).map((p, i) => (
            <div key={p.id}
              className="absolute shadow-2xl overflow-hidden"
              style={{
                width: isMobile ? `${140 - i * 18}px` : `${220 - i * 28}px`,
                aspectRatio: '3/4',
                borderRadius: tt.surfaceRadius,
                transform: `rotate(${rotations[i]}deg) translateX(${(i - 1) * (isMobile ? 28 : 42)}px) translateY(${i * 4}px)`,
                zIndex: 3 - i,
                transition: 'transform 0.3s ease',
              }}>
              <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
              {/* Top label on front card */}
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }}>
                  <p className="text-white text-[10px] font-bold truncate">{p.name}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Hero: ASYMMETRICAL ────────────────────────────────────────────────────────
// ZARA/luxury: image bleeds edge-to-edge on left, slim text column on right

function TkHeroAsymmetrical({ design, tt, primaryColor, device, onScrollToProducts, heroProps = {}, editMode, onFieldChange }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void; heroProps?: HeroP;
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
}) {
  const { heroTitle, heroSubtitle, ctaText, products = [], tagline } = design;
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  const ctaStyleObj = heroCtaStyle(heroProps.ctaStyle, primaryColor, tt.btnRadius, btnText, getContentStyleVars(tt.contentStyle));

  if (isMobile) {
    // Mobile: full-bleed image with bottom text overlay
    return (
      <section className="relative overflow-hidden" style={{ height: '90vh', minHeight: '500px' }}>
        {products[0] && (
          <div className="absolute inset-0">
            <ProductImg src={products[0].image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 55%)' }} />
          </div>
        )}
        <div className="relative z-10 absolute bottom-0 left-0 right-0 px-6 pb-10">
          {tagline && <p className="text-[9px] uppercase tracking-[0.35em] mb-3 text-white/60"><EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>}
          <h1 className="mb-3 text-white" style={heroHeadingStyle(tt, 2.6, 2.6, heroProps.headlineSize, isMobile)}><EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h1>
          <p className="text-xs mb-5 max-w-xs" style={{ ...bodyStyle(tt), color: 'rgba(255,255,255,0.65)' }}><EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} /></p>
          <button onClick={editMode ? undefined : onScrollToProducts} className="px-6 py-3 text-xs font-bold uppercase tracking-wider"
            style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}><EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></button>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden relative" style={{ height: '92vh', minHeight: '560px', display: 'flex' }}>
      {/* Haikei decorations — only when user explicitly requested */}
      {tt.heroBg === 'blob'     && <HaikeiBlob color={primaryColor} index={4} size={320} opacity={0.08} bottom="-10%" right="-4%" rotate={15} />}
      {tt.heroBg === 'mesh'     && <HaikeiMesh color={primaryColor} pageBg={tt.pageBg} />}
      {tt.heroBg === 'gradient' && <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 45% 70% at 85% 50%, ${alpha(primaryColor, 0.10)} 0%, transparent 60%)`, zIndex: 0 }} />}
      {/* Image — takes 62% width, bleeds to left edge */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ width: '62%' }}>
        {products[0] && <ProductImg src={products[0].image} alt="" className="w-full h-full object-cover" />}
        {/* Subtle right-edge fade into pageBg */}
        <div className="absolute inset-y-0 right-0 w-24" style={{ background: `linear-gradient(to right, transparent, ${tt.pageBg})` }} />
        {/* Floating badge */}
        {products[0]?.badge && (
          <div className="absolute top-8 left-8 px-3 py-1.5 text-xs font-black uppercase tracking-wider"
            style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}>
            {products[0].badge}
          </div>
        )}
      </div>

      {/* Text column — slim, vertical centering */}
      <div className="flex flex-col justify-center px-12 flex-1" style={{ minWidth: 0 }}>
        {tagline && (
          <p className="text-[9px] uppercase tracking-[0.5em] mb-8" style={{ color: tt.textMuted }}><EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>
        )}
        <h1 className="mb-6" style={{ ...heroHeadingStyle(tt, 3.6, 2.6, heroProps.headlineSize, isMobile), color: tt.textPrimary, fontSize: 'clamp(2rem, 4vw, 5rem)' }}>
          <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
        </h1>
        <div style={{ width: '32px', height: '2px', background: primaryColor, marginBottom: '20px' }} />
        <p className="mb-10 text-xs" style={{ ...bodyStyle(tt), color: tt.textSecondary, maxWidth: '28ch' }}><EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} /></p>
        <button onClick={editMode ? undefined : onScrollToProducts}
          className="w-fit px-8 py-3.5 text-xs font-black uppercase tracking-widest transition-all hover:opacity-85"
          style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}><EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></button>
        {/* Scroll hint */}
        <div className="mt-auto pt-12 flex items-center gap-2">
          <div style={{ width: '20px', height: '1px', background: tt.divider }} />
          <p className="text-[9px] uppercase tracking-[0.4em]" style={{ color: tt.textMuted }}>Scroll</p>
        </div>
      </div>
    </section>
  );
}

// ── Hero: CINEMATIC ───────────────────────────────────────────────────────────

function TkHeroCinematic({ design, tt, primaryColor, device, onScrollToProducts, heroProps = {}, editMode, onFieldChange }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void; heroProps?: HeroP;
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
}) {
  const { heroTitle, heroSubtitle, ctaText, products = [], tagline } = design;
  const isMobile = device === 'mobile';
  const bg = products[0]?.image || products[1]?.image;
  const heroH = isMobile ? '85vh' : '92vh';

  return (
    <section style={{ position: 'relative', height: heroH, minHeight: isMobile ? '500px' : '600px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
      {/* Background image */}
      {bg && <ProductImg src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      {/* Dark overlay gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.15) 100%)' }} />
      {/* Optional film grain */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none', backgroundImage: 'repeating-radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)', backgroundSize: '3px 3px' }} />
      {/* Text — bottom-left third */}
      <div style={{ position: 'relative', zIndex: 1, padding: isMobile ? '0 24px 48px' : '0 72px 80px', maxWidth: isMobile ? '100%' : '55%' }}>
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}>
          {tagline && (
            <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55em', color: 'rgba(255,255,255,0.5)', marginBottom: '20px', fontWeight: 400, fontFamily: tt.headingFont }}><EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>
          )}
          <h1 style={{ ...heroHeadingStyle(tt, 4.0, 2.4, heroProps.headlineSize, isMobile, { lineHeight: 1.0, fontWeight: 900 }), color: '#fff', marginBottom: '20px' }}><EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '36px', maxWidth: '40ch', lineHeight: 1.6 }}><EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} /></p>
          {/* Minimal text+arrow CTA */}
          <button onClick={editMode ? undefined : onScrollToProducts}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: 0 }}>
            <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            {!editMode && <span style={{ display: 'inline-block', transition: 'transform 0.25s' }}>→</span>}
          </button>
        </motion.div>
      </div>
    </section>
  );
}

// ── Hero: CHAT ────────────────────────────────────────────────────────────────

function TkHeroChat({ design, tt, primaryColor, device, onScrollToProducts, heroProps = {} }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void; heroProps?: HeroP;
}) {
  const { heroTitle, ctaText, products = [] } = design;
  const isMobile = device === 'mobile';
  const pc = primaryColor;
  const pcText = isDark(pc) ? '#fff' : '#000';
  const product = products[0];

  type ChatMsg = { id: number; side: 'store' | 'user'; type: 'text' | 'product' | 'cta'; text?: string; visible: boolean };
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 0, side: 'store', type: 'text',    text: heroTitle,                         visible: false },
    { id: 1, side: 'user',  type: 'text',    text: 'Show me what you have 👀',         visible: false },
    { id: 2, side: 'store', type: 'product', text: product ? product.name : 'Product', visible: false },
    { id: 3, side: 'store', type: 'cta',     text: ctaText,                            visible: false },
  ]);

  useEffect(() => {
    const delays = [400, 1200, 2200, 3200];
    delays.forEach((d, i) => {
      const t = setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === i ? { ...m, visible: true } : m));
      }, d);
      return () => clearTimeout(t);
    });
  }, []);

  return (
    <section style={{ background: tt.pageBg, padding: isMobile ? '48px 20px 64px' : '80px 40px 96px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map(msg => !msg.visible ? null : (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: msg.side === 'store' ? 'flex-end' : 'flex-start' }}>
            {msg.type === 'text' && (
              <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: '20px', background: msg.side === 'store' ? pc : tt.surfaceBg, color: msg.side === 'store' ? pcText : tt.textPrimary, fontSize: '14px', lineHeight: 1.5, border: msg.side === 'user' ? `1px solid ${tt.surfaceBorder}` : 'none' }}>
                {msg.text}
              </div>
            )}
            {msg.type === 'product' && product && (
              <div style={{ width: '220px', borderRadius: '16px', overflow: 'hidden', background: tt.surfaceBg, border: `1px solid ${alpha(pc, 0.25)}` }}>
                <div style={{ height: '140px', overflow: 'hidden' }}>
                  <ProductImg src={product.image} alt={product.name} fallback={product.imageFallback} className="w-full h-full object-cover" />
                </div>
                <div style={{ padding: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: tt.textPrimary, marginBottom: '4px' }}>{product.name}</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: pc }}>{product.price}</p>
                </div>
              </div>
            )}
            {msg.type === 'cta' && (
              <button onClick={onScrollToProducts}
                style={{ padding: '12px 24px', background: pc, color: pcText, borderRadius: '20px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', letterSpacing: '0.04em' }}>
                {msg.text} →
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── Hero: FASHION ─────────────────────────────────────────────────────────────

function TkHeroFashion({ design, tt, primaryColor, device, onScrollToProducts, heroProps = {}, editMode, onFieldChange }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void; heroProps?: HeroP;
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
}) {
  const { heroTitle, ctaText, products = [], tagline } = design;
  const isMobile = device === 'mobile';
  const pc = primaryColor;
  const btnText = isDark(pc) ? '#fff' : '#000';
  const heroH = isMobile ? '70vh' : '90vh';

  if (isMobile) {
    return (
      <section style={{ position: 'relative', height: heroH, minHeight: '480px', overflow: 'hidden' }}>
        {products[0] && <ProductImg src={products[0].image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 55%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 24px 40px', zIndex: 1 }}>
          {tagline && <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.55)', marginBottom: '10px', fontWeight: 400 }}><EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>}
          <h1 style={{ ...heroHeadingStyle(tt, 2.2, 2.2, heroProps.headlineSize, isMobile), color: '#fff', marginBottom: '20px' }}><EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h1>
          <button onClick={editMode ? undefined : onScrollToProducts} style={{ padding: '12px 28px', background: pc, color: btnText, borderRadius: tt.btnRadius, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}><EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></button>
        </div>
      </section>
    );
  }

  return (
    <section style={{ height: heroH, minHeight: '600px', display: 'flex', overflow: 'hidden', position: 'relative' }}>
      {/* Left: big product image 60% */}
      <div style={{ width: '60%', position: 'relative', overflow: 'hidden', padding: '8px 4px 8px 8px' }}>
        {products[0] && (
          <div style={{ width: '100%', height: '100%', borderRadius: tt.surfaceRadius, overflow: 'hidden', position: 'relative' }}>
            <ProductImg src={products[0].image} alt="" className="w-full h-full object-cover" />
            {/* Bottom scrim for text */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.0) 50%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 40px 40px', zIndex: 1 }}>
              {tagline && <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.55)', marginBottom: '12px', fontWeight: 400 }}><EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>}
              <h1 style={{ ...heroHeadingStyle(tt, 3.2, 2.2, heroProps.headlineSize, isMobile), color: '#fff', marginBottom: '24px', maxWidth: '18ch' }}><EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h1>
              <button onClick={editMode ? undefined : onScrollToProducts} style={{ padding: '13px 32px', background: pc, color: btnText, borderRadius: tt.btnRadius, fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}><EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /></button>
            </div>
          </div>
        )}
      </div>
      {/* Right: two stacked images 40% */}
      <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 8px 8px 4px' }}>
        <div style={{ flex: 1, borderRadius: tt.surfaceRadius, overflow: 'hidden', position: 'relative' }}>
          {products[1] && <ProductImg src={products[1].image} alt="" className="w-full h-full object-cover" />}
          <div style={{ position: 'absolute', inset: 0, border: `1px solid ${alpha('#fff', 0.08)}`, borderRadius: tt.surfaceRadius, pointerEvents: 'none' }} />
        </div>
        <div style={{ flex: 1, borderRadius: tt.surfaceRadius, overflow: 'hidden', position: 'relative', marginTop: '4px' }}>
          {products[2] && <ProductImg src={products[2].image} alt="" className="w-full h-full object-cover" />}
          <div style={{ position: 'absolute', inset: 0, border: `1px solid ${alpha('#fff', 0.08)}`, borderRadius: tt.surfaceRadius, pointerEvents: 'none' }} />
        </div>
      </div>
    </section>
  );
}

// ── Layout Mutation: STAGGERED ────────────────────────────────────────────────
// Cards offset vertically in alternating rhythm — visual flow, not static grid

function TkGridStaggered({ products, tt, primaryColor, device, onProductClick, onAddToCart, onToggleWishlist, wishlist, fmtPrice, editMode, onFieldChange }: {
  products: RichProduct[]; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onProductClick: (p: RichProduct) => void; onAddToCart: (p: RichProduct, r?: DOMRect) => void;
  onToggleWishlist: (id: string) => void; wishlist: Set<string>; fmtPrice: (n: number) => string;
  editMode?: boolean; onFieldChange?: (field: string, value: string) => void;
}) {
  const isMobile = device === 'mobile';
  const cols = isMobile ? 2 : 3;
  const offsets = [0, 32, 16, 48, 8, 40]; // px vertical offset per card
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '20px', alignItems: 'start' }}>
      {products.map((p, i) => (
        <motion.div key={p.id} className="group cursor-pointer"
          style={{ marginTop: isMobile ? 0 : `${offsets[i % offsets.length]}px`, ...(tt.cardStyle ? { ...getCardStyleVars(tt.cardStyle, tt), borderRadius: tt.surfaceRadius, overflow: 'hidden' } : {}) }}
          onClick={() => onProductClick(p)}
          whileHover={getHoverMotion(tt.hoverStyle, primaryColor)}
        >
          <div className="relative overflow-hidden mb-3" style={{ aspectRatio: i % 3 === 1 ? '4/5' : '3/4', borderRadius: tt.cardStyle ? 0 : tt.surfaceRadius, background: tt.cardStyle ? 'transparent' : tt.surfaceBg }}>
            <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            {p.badge && <span className="absolute top-3 left-3 text-[10px] font-black uppercase px-2.5 py-1 text-white" style={{ background: primaryColor, borderRadius: tt.btnRadius }}><StyleOnlySpan field={`products.${p.id}.badgeHtml`} value={p.badge} htmlValue={p.badgeHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>}
            <button data-wishlist-btn="" onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
              className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
              <Heart className={`w-3.5 h-3.5 ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(p.id) ? undefined : { color: tt.textMuted }} />
            </button>
            <div className="absolute bottom-0 inset-x-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
              <button onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }}
                className="w-full py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg"
                style={{ background: primaryColor, borderRadius: tt.btnRadius }}>+ Add to Cart</button>
            </div>
          </div>
          <div style={tt.cardStyle ? { padding: '0 10px 10px' } : undefined}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: tt.textMuted }}><StyleOnlySpan field={`products.${p.id}.categoryHtml`} value={p.category} htmlValue={p.categoryHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
            <p className="text-sm font-bold truncate" style={{ color: tt.textPrimary }}><StyleOnlySpan field={`products.${p.id}.nameHtml`} value={p.name} htmlValue={p.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-black" style={{ color: primaryColor }}><StyleOnlySpan field={`products.${p.id}.priceHtml`} value={fmtPrice(p.price)} htmlValue={p.priceHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>
              {p.originalPrice && <span className="text-xs line-through" style={{ color: tt.textMuted }}>{fmtPrice(p.originalPrice)}</span>}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Layout Mutation: OVERLAPPING ──────────────────────────────────────────────
// Cards overlap each other with z-index depth layers — premium layered feel

function TkGridOverlapping({ products, tt, primaryColor, device, onProductClick, onAddToCart, onToggleWishlist, wishlist, fmtPrice, editMode, onFieldChange }: {
  products: RichProduct[]; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onProductClick: (p: RichProduct) => void; onAddToCart: (p: RichProduct, r?: DOMRect) => void;
  onToggleWishlist: (id: string) => void; wishlist: Set<string>; fmtPrice: (n: number) => string;
  editMode?: boolean; onFieldChange?: (field: string, value: string) => void;
}) {
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  // Group into rows of 3, each row has slight x-overlap on desktop
  const rows = [];
  for (let i = 0; i < products.length; i += 3) rows.push(products.slice(i, i + 3));

  return (
    <div className="space-y-8">
      {rows.map((row, ri) => (
        <div key={ri} style={isMobile ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } : {
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0',
          position: 'relative',
        }}>
          {row.map((p, ci) => (
            <div key={p.id}
              className="group cursor-pointer flex-shrink-0"
              style={isMobile ? {} : {
                width: '36%',
                marginLeft: ci === 0 ? '0' : '-4%',
                zIndex: ci + 1,
                transition: 'transform 0.25s ease, z-index 0s',
              }}
              onClick={() => onProductClick(p)}
              onMouseEnter={e => { if (isMobile) return; (e.currentTarget as HTMLElement).style.transform = 'scale(1.04) translateY(-8px)'; (e.currentTarget as HTMLElement).style.zIndex = '10'; }}
              onMouseLeave={e => { if (isMobile) return; (e.currentTarget as HTMLElement).style.transform = 'scale(1) translateY(0)'; (e.currentTarget as HTMLElement).style.zIndex = String(ci + 1); }}
            >
              <div className="relative overflow-hidden" style={{ aspectRatio: '3/4', borderRadius: tt.surfaceRadius, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', background: tt.surfaceBg }}>
                <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
                {p.badge && <span className="absolute top-3 left-3 text-[10px] font-black uppercase px-2.5 py-1 text-white" style={{ background: primaryColor, borderRadius: tt.btnRadius }}><StyleOnlySpan field={`products.${p.id}.badgeHtml`} value={p.badge} htmlValue={p.badgeHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>}
                {/* Bottom overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                  <p className="text-white text-xs font-bold truncate"><StyleOnlySpan field={`products.${p.id}.nameHtml`} value={p.name} htmlValue={p.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-white text-sm font-black"><StyleOnlySpan field={`products.${p.id}.priceHtml`} value={fmtPrice(p.price)} htmlValue={p.priceHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>
                    <button onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }}
                      className="px-3 py-1.5 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}>Add</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Layout Mutation: ASYMMETRIC ───────────────────────────────────────────────
// Unequal column widths — 60/40 alternating, editorial rhythm

function TkGridAsymmetric({ products, tt, primaryColor, device, onProductClick, onAddToCart, onToggleWishlist, wishlist, fmtPrice, editMode, onFieldChange }: {
  products: RichProduct[]; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onProductClick: (p: RichProduct) => void; onAddToCart: (p: RichProduct, r?: DOMRect) => void;
  onToggleWishlist: (id: string) => void; wishlist: Set<string>; fmtPrice: (n: number) => string;
  editMode?: boolean; onFieldChange?: (field: string, value: string) => void;
}) {
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  const pairs = [];
  for (let i = 0; i < products.length; i += 2) pairs.push([products[i], products[i + 1]] as [RichProduct, RichProduct | undefined]);

  const ProductCard = ({ p, aspect }: { p: RichProduct; aspect: string }) => (
    <div className="group cursor-pointer" onClick={() => onProductClick(p)}>
      <div className="relative overflow-hidden mb-3" style={{ aspectRatio: aspect, borderRadius: tt.surfaceRadius, background: tt.surfaceBg }}>
        <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        {p.badge && <span className="absolute top-3 left-3 text-[10px] font-black uppercase px-2.5 py-1 text-white" style={{ background: primaryColor, borderRadius: tt.btnRadius }}><StyleOnlySpan field={`products.${p.id}.badgeHtml`} value={p.badge} htmlValue={p.badgeHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>}
        <button data-wishlist-btn="" onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
          className="absolute top-3 right-3 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
          <Heart className={`w-3 h-3 ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(p.id) ? undefined : { color: tt.textMuted }} />
        </button>
        <div className="absolute bottom-0 inset-x-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <button onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }}
            className="w-full py-2 text-[11px] font-bold uppercase tracking-wider text-white"
            style={{ background: primaryColor, borderRadius: tt.btnRadius }}>+ Add</button>
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: tt.textMuted }}><StyleOnlySpan field={`products.${p.id}.categoryHtml`} value={p.category} htmlValue={p.categoryHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
      <p className="text-sm font-bold truncate" style={{ color: tt.textPrimary }}><StyleOnlySpan field={`products.${p.id}.nameHtml`} value={p.name} htmlValue={p.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
      <span className="text-sm font-black" style={{ color: primaryColor }}><StyleOnlySpan field={`products.${p.id}.priceHtml`} value={fmtPrice(p.price)} htmlValue={p.priceHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>
    </div>
  );

  if (isMobile) {
    // Mobile: 2-col standard grid
    return (
      <div className="grid grid-cols-2 gap-4">
        {products.map(p => <ProductCard key={p.id} p={p} aspect="3/4" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pairs.map(([a, b], ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: ri % 2 === 0 ? '3fr 2fr' : '2fr 3fr', gap: '16px', alignItems: 'end' }}>
          <ProductCard p={a} aspect={ri % 2 === 0 ? '4/5' : '3/4'} />
          {b && <ProductCard p={b} aspect={ri % 2 === 0 ? '1/1' : '4/5'} />}
        </div>
      ))}
    </div>
  );
}

// ── Product grid: STANDARD (3-col) ────────────────────────────────────────────

function TkGridStandard({ products, tt, primaryColor, device, onProductClick, onAddToCart, onToggleWishlist, wishlist, fmtPrice, editMode, onFieldChange }: {
  products: RichProduct[]; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onProductClick: (p: RichProduct) => void; onAddToCart: (p: RichProduct, r?: DOMRect) => void;
  onToggleWishlist: (id: string) => void; wishlist: Set<string>; fmtPrice: (n: number) => string;
  editMode?: boolean; onFieldChange?: (field: string, value: string) => void;
}) {
  const isMobile = device === 'mobile';
  const arch = getAnimArchetype(tt.personality, tt.motion, tt.styleMix);
  const doStagger = arch === 'fashion' || arch === 'hype' || arch === 'luxury';
  const cardVariant = REVEAL_VARIANTS[arch] ?? REVEAL_VARIANTS.default;
  const staggerContainer: Variants = {
    hidden:  {},
    visible: { transition: { staggerChildren: arch === 'luxury' ? 0.1 : 0.07, delayChildren: 0.05 } },
  };
  const dv = getDensityVars(tt.density);
  const cv = getContentStyleVars(tt.contentStyle);
  const cs = getCardStyleVars(tt.cardStyle, tt);
  const hasCardWrapper = !!tt.cardStyle;
  return (
    <motion.div
      className={`grid ${gridCols(device)} ${dv.gridGap}`}
      variants={doStagger ? staggerContainer : undefined}
      initial={doStagger ? 'hidden' : undefined}
      whileInView={doStagger ? 'visible' : undefined}
      viewport={{ once: true, margin: '-30px' }}
    >
      {products.map((p) => (
        <motion.div key={p.id} className="group cursor-pointer" variants={doStagger ? cardVariant : undefined} onClick={() => onProductClick(p)}
          whileHover={getHoverMotion(tt.hoverStyle, primaryColor)}
          style={hasCardWrapper ? { ...cs, borderRadius: tt.surfaceRadius, overflow: 'hidden' } : undefined}
        >
          <div className="relative overflow-hidden mb-3" style={{ aspectRatio: dv.cardAspect, borderRadius: hasCardWrapper ? 0 : tt.surfaceRadius, background: hasCardWrapper ? 'transparent' : tt.surfaceBg }}>
            <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            {p.badge && (
              <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 text-white" style={{ background: primaryColor, borderRadius: tt.btnRadius }}>
                <StyleOnlySpan field={`products.${p.id}.badgeHtml`} value={p.badge} htmlValue={p.badgeHtml} editMode={editMode} onFieldChange={onFieldChange} />
              </span>
            )}
            <div className={`absolute bottom-0 inset-x-0 p-3 transition-transform duration-200 ${isMobile ? '' : 'translate-y-full group-hover:translate-y-0'}`}>
              <button
                onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }}
                className="w-full py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg"
                style={{ background: primaryColor, borderRadius: tt.btnRadius }}
              >
                + Add to Cart
              </button>
            </div>
            <button
              data-wishlist-btn=""
              onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
              className={`absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow transition-all hover:scale-110 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <Heart className={`w-3.5 h-3.5 ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(p.id) ? undefined : { color: tt.textMuted }} />
            </button>
          </div>
          <div className={dv.cardPadY} style={hasCardWrapper ? { paddingLeft: '12px', paddingRight: '12px' } : undefined}>
            {dv.showCategory && <p className={`${dv.fontSize} font-medium mb-0.5`} style={{ color: tt.textMuted, textTransform: cv.categoryTransform, letterSpacing: cv.labelTracking }}><StyleOnlySpan field={`products.${p.id}.categoryHtml`} value={p.category} htmlValue={p.categoryHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>}
            <p className={`${dv.fontSize} font-bold truncate ${dv.infoGap}`} style={{ color: tt.textPrimary }}><StyleOnlySpan field={`products.${p.id}.nameHtml`} value={p.name} htmlValue={p.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
            {dv.showDesc && p.description && (
              <p className="text-[11px] line-clamp-2 mt-0.5" style={{ color: tt.textSecondary }}><StyleOnlySpan field={`products.${p.id}.descriptionHtml`} value={p.description} htmlValue={p.descriptionHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
            )}
            <div className={`flex items-center gap-2 ${dv.infoGap}`}>
              <span className={`${dv.fontSize} font-black`} style={{ color: tt.primary }}><StyleOnlySpan field={`products.${p.id}.priceHtml`} value={fmtPrice(p.price)} htmlValue={p.priceHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>
              {p.originalPrice && <span className="text-xs line-through" style={{ color: tt.textMuted }}>{fmtPrice(p.originalPrice)}</span>}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── Product grid: MAGAZINE (first product featured) ───────────────────────────

function TkGridMagazine({ products, tt, primaryColor, device, onProductClick, onAddToCart, onToggleWishlist, wishlist, fmtPrice, editMode, onFieldChange }: {
  products: RichProduct[]; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onProductClick: (p: RichProduct) => void; onAddToCart: (p: RichProduct, r?: DOMRect) => void;
  onToggleWishlist: (id: string) => void; wishlist: Set<string>; fmtPrice: (n: number) => string;
  editMode?: boolean; onFieldChange?: (field: string, value: string) => void;
}) {
  const isMobile = device === 'mobile';
  const [featured, ...rest] = products;
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  if (!featured) return null;
  return (
    <div className={`${isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-3 gap-5'}`}>
      {/* Featured product — spans 2 cols */}
      <div
        className="group cursor-pointer relative overflow-hidden"
        style={{ borderRadius: tt.surfaceRadius, ...(isMobile ? { aspectRatio: '4/3' } : { gridColumn: 'span 2', aspectRatio: '16/9' }) }}
        onClick={() => onProductClick(featured)}
      >
        <ProductImg src={featured.image} alt={featured.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 55%)' }} />
        {featured.badge && (
          <span className="absolute top-4 left-4 text-[10px] font-black uppercase tracking-wider px-3 py-1 text-white" style={{ background: primaryColor, borderRadius: tt.btnRadius }}>
            <StyleOnlySpan field={`products.${featured.id}.badgeHtml`} value={featured.badge} htmlValue={featured.badgeHtml} editMode={editMode} onFieldChange={onFieldChange} />
          </span>
        )}
        <div className="absolute bottom-0 inset-x-0 p-5">
          <p className="text-[10px] uppercase tracking-widest text-white/60 mb-1"><StyleOnlySpan field={`products.${featured.id}.categoryHtml`} value={featured.category} htmlValue={featured.categoryHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
          <p className="text-lg font-black text-white mb-1" style={{ fontFamily: tt.headingFont }}><StyleOnlySpan field={`products.${featured.id}.nameHtml`} value={featured.name} htmlValue={featured.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
          <div className="flex items-center justify-between">
            <span className="text-base font-black" style={{ color: primaryColor }}><StyleOnlySpan field={`products.${featured.id}.priceHtml`} value={fmtPrice(featured.price)} htmlValue={featured.priceHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>
            <button
              onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(featured, getProductImgRect(btn)); }}
              className="px-4 py-2 text-xs font-bold"
              style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}
            >
              Add to Cart
            </button>
          </div>
        </div>
        <button
          data-wishlist-btn=""
          onClick={e => { e.stopPropagation(); onToggleWishlist(featured.id); }}
          className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow"
        >
          <Heart className={`w-3.5 h-3.5 ${wishlist.has(featured.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(featured.id) ? undefined : { color: tt.textMuted }} />
        </button>
      </div>

      {/* Remaining products */}
      {rest.slice(0, isMobile ? 4 : 4).map(p => (
        <motion.div key={p.id} className="group cursor-pointer" onClick={() => onProductClick(p)}
          whileHover={getHoverMotion(tt.hoverStyle, primaryColor)}
          style={tt.cardStyle ? { ...getCardStyleVars(tt.cardStyle, tt), borderRadius: tt.surfaceRadius, overflow: 'hidden' } : undefined}
        >
          <div className="relative overflow-hidden mb-3" style={{ aspectRatio: '1/1', borderRadius: tt.cardStyle ? 0 : tt.surfaceRadius, background: tt.cardStyle ? 'transparent' : tt.surfaceBg }}>
            <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            {p.badge && (
              <span className="absolute top-2 left-2 text-[9px] font-black uppercase px-2 py-0.5 text-white" style={{ background: primaryColor, borderRadius: tt.btnRadius }}>
                <StyleOnlySpan field={`products.${p.id}.badgeHtml`} value={p.badge} htmlValue={p.badgeHtml} editMode={editMode} onFieldChange={onFieldChange} />
              </span>
            )}
            <button data-wishlist-btn="" onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }} className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
              <Heart className={`w-3 h-3 ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(p.id) ? undefined : { color: tt.textMuted }} />
            </button>
          </div>
          <div style={tt.cardStyle ? { paddingLeft: '10px', paddingRight: '10px', paddingBottom: '10px' } : undefined}>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: tt.textMuted }}><StyleOnlySpan field={`products.${p.id}.categoryHtml`} value={p.category} htmlValue={p.categoryHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
            <p className="text-xs font-bold truncate mb-1" style={{ color: tt.textPrimary }}><StyleOnlySpan field={`products.${p.id}.nameHtml`} value={p.name} htmlValue={p.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black" style={{ color: tt.primary }}><StyleOnlySpan field={`products.${p.id}.priceHtml`} value={fmtPrice(p.price)} htmlValue={p.priceHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>
              <button
                onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }}
                className="text-[10px] font-bold px-2.5 py-1 text-white flex-shrink-0"
                style={{ background: primaryColor, borderRadius: tt.btnRadius }}
              >Add</button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Product grid: LIST ────────────────────────────────────────────────────────

function TkGridList({ products, tt, primaryColor, onProductClick, onAddToCart, onToggleWishlist, wishlist, fmtPrice, editMode, onFieldChange }: {
  products: RichProduct[]; tt: TokenTheme; primaryColor: string;
  onProductClick: (p: RichProduct) => void; onAddToCart: (p: RichProduct, r?: DOMRect) => void;
  onToggleWishlist: (id: string) => void; wishlist: Set<string>; fmtPrice: (n: number) => string;
  editMode?: boolean; onFieldChange?: (field: string, value: string) => void;
}) {
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  const dv = getDensityVars(tt.density);
  const cv = getContentStyleVars(tt.contentStyle);
  const rowPad = tt.density === 'dense' ? '10px' : tt.density === 'airy' ? '20px' : '16px';
  const imgSize = tt.density === 'dense' ? 'w-20 h-20' : tt.density === 'airy' ? 'w-36 h-36' : 'w-28 h-28';
  return (
    <div className={tt.density === 'dense' ? 'space-y-2' : tt.density === 'airy' ? 'space-y-6' : 'space-y-4'}>
      {products.map(p => {
        const lcs = getCardStyleVars(tt.cardStyle, tt);
        return (
        <motion.div
          key={p.id}
          className="group flex gap-5 cursor-pointer"
          style={{ ...lcs, borderRadius: tt.surfaceRadius, padding: rowPad }}
          onClick={() => onProductClick(p)}
          whileHover={getHoverMotion(tt.hoverStyle, primaryColor)}
        >
          <div className={`${imgSize} flex-shrink-0 overflow-hidden`} style={{ borderRadius: tt.surfaceRadius, background: tt.inputBg }}>
            <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {p.badge && (
                <span className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 mb-2 text-white" style={{ background: primaryColor, borderRadius: tt.btnRadius }}>
                  <StyleOnlySpan field={`products.${p.id}.badgeHtml`} value={p.badge} htmlValue={p.badgeHtml} editMode={editMode} onFieldChange={onFieldChange} />
                </span>
              )}
              {dv.showCategory && <p className={`${dv.fontSize} font-medium mb-1`} style={{ color: tt.textMuted, textTransform: cv.categoryTransform, letterSpacing: cv.labelTracking }}><StyleOnlySpan field={`products.${p.id}.categoryHtml`} value={p.category} htmlValue={p.categoryHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>}
              <p className={`${dv.fontSize} font-bold truncate`} style={{ color: tt.textPrimary }}><StyleOnlySpan field={`products.${p.id}.nameHtml`} value={p.name} htmlValue={p.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
              {(dv.showDesc || tt.density === 'normal') && <p className="text-xs leading-relaxed mt-1 line-clamp-2" style={{ color: tt.textSecondary }}><StyleOnlySpan field={`products.${p.id}.descriptionHtml`} value={p.description} htmlValue={p.descriptionHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>}
            </div>
            <div className="flex items-center justify-between mt-3 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-black" style={{ color: tt.primary }}><StyleOnlySpan field={`products.${p.id}.priceHtml`} value={fmtPrice(p.price)} htmlValue={p.priceHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>
                {p.originalPrice && <span className="text-xs line-through" style={{ color: tt.textMuted }}>{fmtPrice(p.originalPrice)}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button data-wishlist-btn="" onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }} className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center" style={{ background: tt.surfaceBg }}>
                  <Heart className={`w-3.5 h-3.5 ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={{ color: wishlist.has(p.id) ? undefined : tt.textMuted }} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }}
                  className="px-4 py-2 text-xs font-bold flex-shrink-0"
                  style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}
                >
                  <StyleOnlySpan field="addToCartLabel" value="Add to Cart" editMode={editMode} tipMessage="Button label can be changed in Theme settings" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        );
      })}
    </div>
  );
}

// ── Product grid: CAROUSEL ────────────────────────────────────────────────────
// Horizontal scroll snap carousel — one card at a time on mobile, peek on desktop

function TkGridCarousel({ products, tt, primaryColor, device, onProductClick, onAddToCart, onToggleWishlist, wishlist, fmtPrice, editMode, onFieldChange }: {
  products: RichProduct[]; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onProductClick: (p: RichProduct) => void; onAddToCart: (p: RichProduct, r?: DOMRect) => void;
  onToggleWishlist: (id: string) => void; wishlist: Set<string>; fmtPrice: (n: number) => string;
  editMode?: boolean; onFieldChange?: (field: string, value: string) => void;
}) {
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  const cardW = isMobile ? '72vw' : '260px';
  return (
    <div style={{ marginLeft: '-20px', marginRight: '-20px' }}>
      <div className="flex gap-4 overflow-x-auto pb-4 px-5"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {products.map(p => (
          <motion.div key={p.id}
            className="group cursor-pointer flex-shrink-0"
            style={{ scrollSnapAlign: 'start', width: cardW, ...(tt.cardStyle ? { ...getCardStyleVars(tt.cardStyle, tt), borderRadius: tt.surfaceRadius, overflow: 'hidden' } : {}) }}
            onClick={() => onProductClick(p)}
            whileHover={getHoverMotion(tt.hoverStyle, primaryColor)}
          >
            <div className="relative overflow-hidden mb-3" style={{ aspectRatio: '3/4', borderRadius: tt.cardStyle ? 0 : tt.surfaceRadius }}>
              <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              {p.badge && (
                <span className="absolute top-3 left-3 text-[10px] font-black uppercase px-2.5 py-1 text-white"
                  style={{ background: primaryColor, borderRadius: tt.btnRadius }}><StyleOnlySpan field={`products.${p.id}.badgeHtml`} value={p.badge} htmlValue={p.badgeHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>
              )}
              <button data-wishlist-btn="" onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow">
                <Heart className={`w-3.5 h-3.5 ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(p.id) ? undefined : { color: tt.textMuted }} />
              </button>
              <div className={`absolute bottom-0 inset-x-0 p-3 transition-transform duration-200 ${isMobile ? '' : 'translate-y-full group-hover:translate-y-0'}`}>
                <button onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }}
                  className="w-full py-2.5 text-[11px] font-bold uppercase tracking-wider text-white"
                  style={{ background: primaryColor, borderRadius: tt.btnRadius }}>+ Add to Cart</button>
              </div>
            </div>
            <div style={tt.cardStyle ? { padding: '0 10px 10px' } : undefined}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: tt.textMuted }}><StyleOnlySpan field={`products.${p.id}.categoryHtml`} value={p.category} htmlValue={p.categoryHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
              <p className="text-sm font-bold truncate" style={{ color: tt.textPrimary }}><StyleOnlySpan field={`products.${p.id}.nameHtml`} value={p.name} htmlValue={p.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-black" style={{ color: primaryColor }}><StyleOnlySpan field={`products.${p.id}.priceHtml`} value={fmtPrice(p.price)} htmlValue={p.priceHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>
                {p.originalPrice && <span className="text-xs line-through" style={{ color: tt.textMuted }}>{fmtPrice(p.originalPrice)}</span>}
              </div>
            </div>
          </motion.div>
        ))}
        {/* Trailing padding card */}
        <div className="flex-shrink-0" style={{ width: '4px' }} />
      </div>
    </div>
  );
}

// ── Product grid: SPOTLIGHT ───────────────────────────────────────────────────
// Featured big card + 4-col mini grid — editorial/premium feel

function TkGridSpotlight({ products, tt, primaryColor, device, onProductClick, onAddToCart, onToggleWishlist, wishlist, fmtPrice, editMode, onFieldChange }: {
  products: RichProduct[]; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onProductClick: (p: RichProduct) => void; onAddToCart: (p: RichProduct, r?: DOMRect) => void;
  onToggleWishlist: (id: string) => void; wishlist: Set<string>; fmtPrice: (n: number) => string;
  editMode?: boolean; onFieldChange?: (field: string, value: string) => void;
}) {
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  const featured = products[0];
  const rest = products.slice(1, isMobile ? 5 : 7);
  return (
    <div className="space-y-5">
      {/* Featured hero card */}
      {featured && (
        <div className="group relative overflow-hidden cursor-pointer"
          style={{ aspectRatio: isMobile ? '3/2' : '21/9', borderRadius: tt.surfaceRadius }}
          onClick={() => onProductClick(featured)}>
          <ProductImg src={featured.image} alt={featured.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }} />
          {featured.badge && (
            <span className="absolute top-4 left-4 text-[10px] font-black uppercase px-2.5 py-1 text-white"
              style={{ background: primaryColor, borderRadius: tt.btnRadius }}><StyleOnlySpan field={`products.${featured.id}.badgeHtml`} value={featured.badge} htmlValue={featured.badgeHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>
          )}
          <button data-wishlist-btn="" onClick={e => { e.stopPropagation(); onToggleWishlist(featured.id); }}
            className="absolute top-4 right-4 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow">
            <Heart className={`w-4 h-4 ${wishlist.has(featured.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(featured.id) ? undefined : { color: tt.textMuted }} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
            <div>
              <p className="text-white/70 text-[10px] uppercase tracking-wider mb-1"><StyleOnlySpan field={`products.${featured.id}.categoryHtml`} value={featured.category} htmlValue={featured.categoryHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
              <p className="text-white font-bold text-lg leading-tight"><StyleOnlySpan field={`products.${featured.id}.nameHtml`} value={featured.name} htmlValue={featured.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-white font-black text-base"><StyleOnlySpan field={`products.${featured.id}.priceHtml`} value={fmtPrice(featured.price)} htmlValue={featured.priceHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>
                {featured.originalPrice && <span className="text-white/50 text-xs line-through">{fmtPrice(featured.originalPrice)}</span>}
              </div>
            </div>
            <button onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(featured, getProductImgRect(btn)); }}
              className="px-5 py-2.5 text-xs font-bold"
              style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}>Add to Cart</button>
          </div>
        </div>
      )}
      {/* Rest in 4-col grid */}
      <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-4`}>
        {rest.map(p => (
          <motion.div key={p.id} className="group cursor-pointer" onClick={() => onProductClick(p)}
            whileHover={getHoverMotion(tt.hoverStyle, primaryColor)}
            style={tt.cardStyle ? { ...getCardStyleVars(tt.cardStyle, tt), borderRadius: tt.surfaceRadius, overflow: 'hidden' } : undefined}
          >
            <div className="relative overflow-hidden mb-2" style={{ aspectRatio: '1/1', borderRadius: tt.cardStyle ? 0 : tt.surfaceRadius, background: tt.cardStyle ? 'transparent' : tt.surfaceBg }}>
              <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {p.badge && <span className="absolute top-2 left-2 text-[8px] font-black uppercase px-1.5 py-0.5 text-white"
                style={{ background: primaryColor, borderRadius: tt.btnRadius }}><StyleOnlySpan field={`products.${p.id}.badgeHtml`} value={p.badge} htmlValue={p.badgeHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>}
              <button onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }}
                className={`absolute bottom-2 right-2 w-7 h-7 flex items-center justify-center text-white font-bold rounded-full shadow-md ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                style={{ background: primaryColor }}>+</button>
            </div>
            <div style={tt.cardStyle ? { padding: '6px 8px 8px' } : undefined}>
              <p className="text-xs font-bold truncate" style={{ color: tt.textPrimary }}><StyleOnlySpan field={`products.${p.id}.nameHtml`} value={p.name} htmlValue={p.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
              <p className="text-xs font-black mt-0.5" style={{ color: primaryColor }}><StyleOnlySpan field={`products.${p.id}.priceHtml`} value={fmtPrice(p.price)} htmlValue={p.priceHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── SCROLLING BANNER SECTION ──────────────────────────────────────────────────
// Auto-scrolling marquee strip — energetic, fashion/lifestyle brand accent

function ScrollingBannerSection({ design, primaryColor, tt }: { design: StoreDesign; primaryColor: string; tt: TokenTheme }) {
  const pc = primaryColor;
  const pcText = isDark(pc) ? '#ffffff' : '#000000';

  // Use scrollingItems if provided, else generate from product names + brand phrases
  const rawItems: string[] = (design as StoreDesign & { scrollingItems?: string[] }).scrollingItems
    ?? design.products.slice(0, 6).map(p => p.name).concat(
      design.features?.slice(0, 3).map(f => f.title) ?? []
    );
  // Duplicate items enough to fill a seamless loop
  const items = rawItems.length < 4 ? [...rawItems, ...rawItems, ...rawItems] : [...rawItems, ...rawItems];

  return (
    <div style={{ background: pc, overflow: 'hidden', paddingTop: '12px', paddingBottom: '12px', position: 'relative' }}>
      <style>{`
        @keyframes storee-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .storee-marquee-track {
          display: flex;
          width: max-content;
          animation: storee-marquee 28s linear infinite;
        }
        .storee-marquee-track:hover { animation-play-state: paused; }
      `}</style>
      <div className="storee-marquee-track">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-0 flex-shrink-0">
            <span className="text-sm font-bold uppercase tracking-widest px-6 whitespace-nowrap"
              style={{ color: pcText }}>{item}</span>
            <span style={{ color: pcText, opacity: 0.45, fontSize: '10px' }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── INSTAGRAM FEED SECTION ────────────────────────────────────────────────────
// Lifestyle photo grid — square images with like/comment counts, profile header

function InstagramFeedSection({ design, primaryColor, tt, device, onProductClick }: {
  design: StoreDesign; primaryColor: string; tt: TokenTheme; device: string;
  onProductClick: (p: RichProduct) => void;
}) {
  const pc = primaryColor;
  const pcText = isDark(pc) ? '#ffffff' : '#000000';
  const isMobile = device === 'mobile';

  type InstaPost = { caption: string; likes: number; comments: number };
  const posts: InstaPost[] = (design as StoreDesign & { instagramPosts?: InstaPost[] }).instagramPosts
    ?? design.products.slice(0, 9).map((p, i) => ({
      caption: p.description,
      likes: 800 + i * 317 + (p.price % 500),
      comments: 12 + i * 7,
    }));

  const cols = isMobile ? 3 : 4;
  const displayPosts = posts.slice(0, cols === 3 ? 9 : 8);
  const productForPost = (i: number) => design.products[i % design.products.length];

  return (
    <section style={{ background: tt.pageBg, borderTop: `1px solid ${tt.divider}` }}>
      <div className="max-w-6xl mx-auto px-5 py-10">
        {/* Section header — looks like an IG profile strip */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black"
            style={{ background: `linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)`, color: '#fff' }}>
            {(design.products[0]?.name?.[0] ?? '✦')}
          </div>
          <div>
            <p className="text-sm font-black" style={{ color: tt.textPrimary }}>@{design.products[0]?.category?.toLowerCase().replace(/\s+/g, '_') ?? 'store'}</p>
            <p className="text-xs" style={{ color: tt.textMuted }}>Shop our latest posts</p>
          </div>
          <a href="#" className="ml-auto text-xs font-bold px-4 py-2 rounded-full border transition-all hover:opacity-75"
            style={{ borderColor: pc, color: pc }}>Follow</a>
        </div>

        {/* Photo grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '3px' }}>
          {displayPosts.map((post, i) => {
            const prod = productForPost(i);
            return (
              <div key={i} className="relative group cursor-pointer overflow-hidden"
                style={{ aspectRatio: '1/1' }}
                onClick={() => onProductClick(prod)}
              >
                <ProductImg src={prod.image} alt={prod.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                {/* Hover overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <p className="text-white text-xs font-semibold text-center px-2 leading-tight line-clamp-2">{post.caption}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-white text-xs flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-white" /> {post.likes.toLocaleString()}
                    </span>
                    <span className="text-white text-xs flex items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      {post.comments}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View more link */}
        <div className="flex items-center justify-center mt-6">
          <button className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity"
            style={{ color: tt.textMuted }}>
            View more on Instagram <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

type SectionVariants = NonNullable<import('../../../src/lib/claudeApi').DesignTokens['sectionVariants']>;

// ── Features variants ─────────────────────────────────────────────────────────

function FeaturesSection({ features, tt, primaryColor, device, motion: motionLevel, elevation, sectionPy, variant, columns, editMode, onFieldChange }: {
  features: Array<{ icon: string; title: string; description: string }>;
  tt: TokenTheme; primaryColor: string; device: DeviceMode;
  motion: MotionLevel; elevation: ElevationLevel; sectionPy: number;
  variant: SectionVariants['features'];
  columns?: 2 | 3 | 4;
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
}) {
  const isMobile = device === 'mobile';
  const pc = primaryColor;
  const arch = getAnimArchetype(tt.personality, tt.motion, tt.styleMix);
  const featureCardVariant = REVEAL_VARIANTS[arch] ?? REVEAL_VARIANTS.default;
  const featureStagger: Variants = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
  };

  if (variant === 'alternating') {
    return (
      <section className="max-w-5xl mx-auto px-5" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
        <div className="space-y-12">
          <DraggableList items={features} field="features" editMode={editMode}>
            {(f, i) => (
            <div key={i}
              className={`flex ${isMobile ? 'flex-col gap-5' : i % 2 === 0 ? 'flex-row gap-14' : 'flex-row-reverse gap-14'} items-center`}>
              {/* Big emoji block */}
              <div className="flex-shrink-0 flex items-center justify-center"
                style={{ width: isMobile ? '80px' : '120px', height: isMobile ? '80px' : '120px',
                  background: alpha(pc, 0.1), borderRadius: '24px' }}>
                <EmojiIcon emoji={f.icon} size={isMobile ? 36 : 52} color={pc} strokeWidth={1.5} />
              </div>
              {/* Text */}
              <div className={isMobile ? 'text-center' : ''}>
                <div style={{ width: '32px', height: '3px', background: pc, marginBottom: '12px', margin: isMobile ? '0 auto 12px' : '0 0 12px' }} />
                <h3 className="mb-3" style={{ ...headingStyle(tt, 1.0), color: tt.textPrimary }}><EditSpan field={`features.${i}.title`} value={f.title} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h3>
                <p className="text-sm max-w-sm" style={{ ...bodyStyle(tt), color: tt.textSecondary }}><EditSpan field={`features.${i}.description`} value={f.description} editMode={editMode} onFieldChange={onFieldChange} /></p>
              </div>
            </div>
            )}
          </DraggableList>
        </div>
      </section>
    );
  }

  if (variant === 'bento') {
    // Bento: first card spans 2 cols
    const bentoSizes = ['col-span-2', 'col-span-1', 'col-span-1'];
    return (
      <section className="max-w-6xl mx-auto px-5" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-4'}`}>
          <DraggableList items={features} field="features" editMode={editMode}>
            {(f, i) => (
            <div key={i}
              className={`p-7 ${!isMobile ? bentoSizes[i] ?? 'col-span-1' : ''}`}
              style={{
                background: i === 0 ? pc : tt.surfaceBg,
                border: `1px solid ${i === 0 ? 'transparent' : tt.surfaceBorder}`,
                borderRadius: tt.surfaceRadius,
                boxShadow: getElevationShadow(elevation),
                transition: getMotionTransition(motionLevel),
              }}
              onMouseEnter={e => { if (editMode || motionLevel === 'none') return; (e.currentTarget as HTMLElement).style.transform = getHoverScale(motionLevel); }}
              onMouseLeave={e => { if (editMode) return; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}>
              <div style={{ marginBottom: '12px' }}>
                <EmojiIcon emoji={f.icon} size={i === 0 ? 40 : 28} color={i === 0 ? (isDark(pc) ? '#fff' : '#000') : pc} strokeWidth={1.5} />
              </div>
              <h3 className="mb-2" style={{ ...headingStyle(tt, i === 0 ? 1.0 : 0.875), color: i === 0 ? (isDark(pc) ? '#fff' : '#000') : tt.textPrimary }}><EditSpan field={`features.${i}.title`} value={f.title} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h3>
              <p className="text-xs" style={{ ...bodyStyle(tt), color: i === 0 ? (isDark(pc) ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)') : tt.textSecondary }}><EditSpan field={`features.${i}.description`} value={f.description} editMode={editMode} onFieldChange={onFieldChange} /></p>
            </div>
            )}
          </DraggableList>
        </div>
      </section>
    );
  }

  // Default: icons
  const dv = getDensityVars(tt.density);
  const cardPad = tt.density === 'dense' ? 'p-3' : tt.density === 'airy' ? 'p-8' : 'p-6';
  const iconGap = tt.density === 'dense' ? 'gap-3' : tt.density === 'airy' ? 'gap-5' : 'gap-4';
  const gridGap = tt.density === 'dense' ? 'gap-3' : tt.density === 'airy' ? 'gap-8' : 'gap-6';
  return (
    <section className="max-w-6xl mx-auto px-5" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
      <motion.div
        className={`grid ${isMobile ? 'grid-cols-1 gap-4' : `grid-cols-${columns ?? 3} ${gridGap}`}`}
        variants={motionLevel !== 'none' ? featureStagger : undefined}
        initial={motionLevel !== 'none' ? 'hidden' : undefined}
        whileInView={motionLevel !== 'none' ? 'visible' : undefined}
        viewport={{ once: true, margin: '-30px' }}
      >
        <DraggableList items={features} field="features" editMode={editMode}>
          {(f, i) => (
          <motion.div key={i} className={`flex items-start ${iconGap} ${cardPad}`}
            variants={motionLevel !== 'none' ? featureCardVariant : undefined}
            whileHover={motionLevel !== 'none' ? { scale: parseFloat(getHoverScale(motionLevel).replace('scale(','').replace(')','')) } : undefined}
            style={{ background: tt.surfaceBg, border: `1px solid ${tt.surfaceBorder}`, borderRadius: tt.surfaceRadius,
              boxShadow: getElevationShadow(elevation), transition: getMotionTransition(motionLevel) }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: alpha(pc, 0.1) }}>
              <EmojiIcon emoji={f.icon} size={20} color={pc} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-sm mb-1" style={{ ...headingStyle(tt, 0.875), color: tt.textPrimary }}><EditSpan field={`features.${i}.title`} value={f.title} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h3>
              {(tt.density !== 'dense') && <p className="text-xs" style={{ ...bodyStyle(tt), color: tt.textSecondary }}><EditSpan field={`features.${i}.description`} value={f.description} editMode={editMode} onFieldChange={onFieldChange} /></p>}
              {tt.density === 'dense' && <p className="text-[11px] line-clamp-1" style={{ ...bodyStyle(tt), color: tt.textSecondary }}><EditSpan field={`features.${i}.description`} value={f.description} editMode={editMode} onFieldChange={onFieldChange} /></p>}
            </div>
          </motion.div>
          )}
        </DraggableList>
      </motion.div>
    </section>
  );
}

// ── Testimonials variants ─────────────────────────────────────────────────────

function TestimonialsSection({ testimonials, tt, primaryColor, device, sectionPy, variant, editMode, onFieldChange }: {
  testimonials: Array<{ text: string; author: string; role: string; rating: number }>;
  tt: TokenTheme; primaryColor: string; device: DeviceMode; sectionPy: number;
  variant: SectionVariants['testimonials'];
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
}) {
  const isMobile = device === 'mobile';
  const pc = primaryColor;
  const [active, setActive] = useState(0);

  if (variant === 'carousel') {
    const t = testimonials[active];
    return (
      <section style={{ background: tt.surfaceBg, borderTop: `1px solid ${tt.divider}`, borderBottom: `1px solid ${tt.divider}` }}>
        <div className="max-w-3xl mx-auto px-5 text-center" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
          <p className="text-[10px] uppercase tracking-[0.25em] mb-8" style={{ color: tt.textMuted }}>Customer Reviews</p>
          {/* Big quote mark */}
          <div className="text-6xl font-black leading-none mb-4 select-none" style={{ color: alpha(pc, 0.2), fontFamily: 'Georgia, serif' }}>"</div>
          <p className={`${isMobile ? 'text-base' : 'text-xl'} font-medium italic mb-8`}
            style={{ ...bodyStyle(tt), color: tt.textPrimary }}><EditSpan field={`testimonials.${active}.text`} value={t.text} editMode={editMode} onFieldChange={onFieldChange} /></p>
          <Stars n={t.rating} />
          <div className="mt-4">
            <p className="text-sm font-black" style={{ color: tt.textPrimary }}><EditSpan field={`testimonials.${active}.author`} value={t.author} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>
            <p className="text-xs mt-0.5" style={{ color: tt.textMuted }}><EditSpan field={`testimonials.${active}.role`} value={t.role} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>
          </div>
          {/* Dot nav */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setActive(i)}
                className="rounded-full transition-all duration-200"
                style={{ width: active === i ? '24px' : '8px', height: '8px', background: active === i ? pc : alpha(pc, 0.25) }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'wall') {
    const rotations = [-1.5, 0.8, -0.5, 1.2, -0.9, 0.4];
    return (
      <section style={{ background: tt.surfaceBg, borderTop: `1px solid ${tt.divider}`, borderBottom: `1px solid ${tt.divider}` }}>
        <div className="max-w-6xl mx-auto px-5" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
          <p className="text-[10px] uppercase tracking-[0.25em] mb-2 text-center" style={{ color: tt.textMuted }}>What People Say</p>
          <h2 className="text-center mb-10" style={{ ...headingStyle(tt, 1.25), color: tt.textPrimary }}>Real Reviews</h2>
          <div className={`${isMobile ? 'columns-1' : 'columns-3'} gap-4`}>
            <DraggableList items={testimonials} field="testimonials" editMode={editMode}>
              {(t, i) => (
              <div key={i}
                className="break-inside-avoid mb-4 p-5 inline-block w-full"
                style={{
                  background: i % 3 === 0 ? pc : tt.pageBg,
                  borderRadius: tt.surfaceRadius,
                  border: `1px solid ${i % 3 === 0 ? 'transparent' : tt.surfaceBorder}`,
                  transform: isMobile ? 'none' : `rotate(${rotations[i % rotations.length]}deg)`,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                }}>
                <Stars n={t.rating} />
                <p className="text-sm mt-2 mb-3 italic"
                  style={{ ...bodyStyle(tt), color: i % 3 === 0 ? (isDark(pc) ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)') : tt.textSecondary }}>
                  "<EditSpan field={`testimonials.${i}.text`} value={t.text} editMode={editMode} onFieldChange={onFieldChange} />"
                </p>
                <p className="text-xs font-black"
                  style={{ color: i % 3 === 0 ? (isDark(pc) ? '#fff' : '#000') : tt.textPrimary }}>
                  <EditSpan field={`testimonials.${i}.author`} value={t.author} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                </p>
                <p className="text-[10px] mt-0.5"
                  style={{ color: i % 3 === 0 ? (isDark(pc) ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)') : tt.textMuted }}>
                  <EditSpan field={`testimonials.${i}.role`} value={t.role} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                </p>
              </div>
              )}
            </DraggableList>
          </div>
        </div>
      </section>
    );
  }

  // Default: cards
  return (
    <section style={{ background: tt.surfaceBg, borderTop: `1px solid ${tt.divider}`, borderBottom: `1px solid ${tt.divider}` }}>
      <div className="max-w-6xl mx-auto px-5" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
        <p className="text-[10px] uppercase tracking-[0.25em] mb-2 text-center" style={{ color: tt.textMuted }}>Reviews</p>
        <h2 className="text-center mb-9" style={{ ...headingStyle(tt, 1.25), color: tt.textPrimary }}>What Customers Say</h2>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-5`}>
          <DraggableList items={testimonials} field="testimonials" editMode={editMode}>
            {(t, i) => (
            <div key={i} className="p-6" style={{ background: tt.pageBg, border: `1px solid ${tt.surfaceBorder}`, borderRadius: tt.surfaceRadius }}>
              <Stars n={t.rating} />
              <p className="text-sm mt-3 mb-5 italic" style={{ ...bodyStyle(tt), color: tt.textSecondary }}>"<EditSpan field={`testimonials.${i}.text`} value={t.text} editMode={editMode} onFieldChange={onFieldChange} />"</p>
              <div className="flex items-center gap-3 pt-3" style={{ borderTop: `1px solid ${tt.divider}` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: pc }}>{t.author[0]}</div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide" style={{ color: tt.textPrimary }}><EditSpan field={`testimonials.${i}.author`} value={t.author} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>
                  <p className="text-[10px] mt-0.5" style={{ color: tt.textMuted }}><EditSpan field={`testimonials.${i}.role`} value={t.role} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>
                </div>
              </div>
            </div>
            )}
          </DraggableList>
        </div>
      </div>
    </section>
  );
}

// ── Stats variants ────────────────────────────────────────────────────────────

function StatsSection({ stats, primaryColor, device, tt, sectionPy, variant }: {
  stats: Array<{ value: string; label: string }>;
  primaryColor: string; device: DeviceMode; tt: TokenTheme; sectionPy: number;
  variant: SectionVariants['stats'];
}) {
  const isMobile = device === 'mobile';
  const pc = primaryColor;
  const statIcons = ['📈', '⭐', '🚚', '🎯', '💬', '🏆'];

  if (variant === 'cards') {
    return (
      <section style={{ background: tt.pageBg, borderTop: `1px solid ${tt.divider}` }}>
        <div className="max-w-6xl mx-auto px-5" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-5`}>
            {stats.map((s, i) => (
              <div key={i} className="p-7 flex flex-col gap-3"
                style={{ background: tt.surfaceBg, border: `1px solid ${tt.surfaceBorder}`, borderRadius: tt.surfaceRadius, borderTop: `3px solid ${pc}` }}>
                <span className="text-2xl">{statIcons[i % statIcons.length]}</span>
                <div>
                  <p className="text-3xl font-black tracking-tight" style={{ color: pc, fontFamily: tt.headingFont }}>{s.value}</p>
                  <p className="text-xs uppercase tracking-widest mt-1" style={{ color: tt.textMuted }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Default: numbers row
  return <StatsRow stats={stats} primaryColor={pc} device={device} />;
}

// ── BrandStory variants ───────────────────────────────────────────────────────

function BrandStorySection({ brandStory, products, tt, primaryColor, device, sectionPy, variant, editMode, onFieldChange }: {
  brandStory: string; products: RichProduct[];
  tt: TokenTheme; primaryColor: string; device: DeviceMode; sectionPy: number;
  variant: SectionVariants['brandStory'];
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
}) {
  const isMobile = device === 'mobile';
  const pc = primaryColor;

  if (variant === 'split') {
    return (
      <section style={{ background: tt.surfaceBg, borderTop: `1px solid ${tt.divider}` }}>
        <div className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-10 flex flex-col gap-8' : 'grid grid-cols-2 gap-12 items-center'}`}
          style={isMobile ? {} : { paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
          {/* Image */}
          <div className="overflow-hidden" style={{ aspectRatio: '4/3', borderRadius: tt.surfaceRadius }}>
            <ProductImg src={products[0]?.image} alt="" className="w-full h-full object-cover" />
          </div>
          {/* Text */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] mb-4" style={{ color: pc }}>Our Story</p>
            <div style={{ width: '40px', height: '3px', background: pc, marginBottom: '20px' }} />
            <p style={{ ...bodyStyle(tt), color: tt.textSecondary, fontSize: isMobile ? '0.95rem' : '1.05rem' }}><EditSpan field="brandStory" value={brandStory} editMode={editMode} onFieldChange={onFieldChange} /></p>
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'timeline') {
    // Split story into ≤3 sentences
    const sentences = brandStory.match(/[^.!?]+[.!?]+/g)?.slice(0, 3) ?? [brandStory];
    const stepIcons = ['🌱', '🚀', '⭐'];
    return (
      <section style={{ background: tt.surfaceBg, borderTop: `1px solid ${tt.divider}` }}>
        <div className="max-w-5xl mx-auto px-5" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
          <p className="text-[10px] uppercase tracking-[0.35em] text-center mb-10" style={{ color: pc }}>Our Journey</p>
          <div className={`${isMobile ? 'flex flex-col gap-8' : 'grid grid-cols-3 gap-8 relative'}`}>
            {/* connector line */}
            {!isMobile && <div className="absolute top-6 left-[calc(16.666%+12px)] right-[calc(16.666%+12px)] h-px" style={{ background: alpha(pc, 0.2) }} />}
            {sentences.map((s, i) => (
              <div key={i} className={`flex ${isMobile ? 'flex-row gap-4 items-start' : 'flex-col items-center text-center gap-3'}`}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0 z-10"
                  style={{ background: i === 0 ? pc : tt.pageBg, border: `2px solid ${pc}`, fontSize: '1.3rem' }}>
                  {stepIcons[i]}
                </div>
                <p className="text-sm" style={{ ...bodyStyle(tt), color: tt.textSecondary }}>{s.trim()}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Default: quote
  return (
    <section style={{ background: tt.surfaceBg, borderTop: `1px solid ${tt.divider}` }}>
      <div className="max-w-2xl mx-auto px-5 text-center" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
        <div className="text-4xl mb-5 opacity-20 select-none" style={{ color: pc, fontFamily: tt.headingFont }}>"</div>
        <p className={`${isMobile ? 'text-base' : 'text-lg'} font-medium italic`} style={{ ...bodyStyle(tt), color: tt.textSecondary }}><EditSpan field="brandStory" value={brandStory} editMode={editMode} onFieldChange={onFieldChange} /></p>
      </div>
    </section>
  );
}

// ── FAQ variants ──────────────────────────────────────────────────────────────

function FaqSection({ faq, tt, primaryColor, device, sectionPy, variant, editMode, onFieldChange, sectionHeadings }: {
  faq: Array<{ q: string; a: string }>;
  tt: TokenTheme; primaryColor: string; device: DeviceMode; sectionPy: number;
  variant: SectionVariants['faq'];
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
  sectionHeadings?: { faq?: string; [key: string]: string | undefined };
}) {
  const isMobile = device === 'mobile';
  const pc = primaryColor;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (variant === 'grid') {
    return (
      <section style={{ background: tt.surfaceBg, borderTop: `1px solid ${tt.divider}` }}>
        <div className="max-w-6xl mx-auto px-5" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-center mb-2" style={{ color: tt.textMuted }}>FAQ</p>
          <h2 className="text-center mb-9" style={{ ...headingStyle(tt, 1.25), color: tt.textPrimary }}><EditSpan field="sectionHeadings.faq" value={sectionHeadings?.faq ?? 'Common Questions'} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h2>
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            {faq.map((item, i) => (
              <div key={i} className="p-5" style={{ background: tt.pageBg, border: `1px solid ${tt.surfaceBorder}`, borderRadius: tt.surfaceRadius, borderLeft: `3px solid ${pc}` }}>
                <p className="text-sm font-black mb-2" style={{ color: tt.textPrimary }}><EditSpan field={`faq.${i}.q`} value={item.q} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>
                <p className="text-xs" style={{ ...bodyStyle(tt), color: tt.textSecondary }}><EditSpan field={`faq.${i}.a`} value={item.a} editMode={editMode} onFieldChange={onFieldChange} /></p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Default: accordion
  return (
    <section style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
      <div className="max-w-3xl mx-auto px-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-center mb-2" style={{ color: tt.textMuted }}>FAQ</p>
        <h2 className="text-center mb-9" style={{ ...headingStyle(tt, 1.25), color: tt.textPrimary }}><EditSpan field="sectionHeadings.faq" value={sectionHeadings?.faq ?? 'Frequently Asked'} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h2>
        <div className="space-y-2">
          {faq.map((item, i) => (
            <div key={i} className="overflow-hidden cursor-pointer"
              style={{ background: tt.surfaceBg, border: `1px solid ${tt.surfaceBorder}`, borderRadius: tt.surfaceRadius }}>
              <button onClick={editMode ? undefined : () => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left gap-4">
                <EditSpan field={`faq.${i}.q`} value={item.q} editMode={editMode} onFieldChange={onFieldChange} singleLine
                  className="text-sm font-semibold" style={{ color: tt.textPrimary }} />
                <span className="text-lg flex-shrink-0 transition-transform duration-200 font-light"
                  style={{ color: pc, display: 'inline-block', transform: openIndex === i ? 'rotate(45deg)' : 'none' }}>+</span>
              </button>
              {(openIndex === i || editMode) && (
                <div className="px-5 pb-5 text-sm" style={{ ...bodyStyle(tt), color: tt.textSecondary }}><EditSpan field={`faq.${i}.a`} value={item.a} editMode={editMode} onFieldChange={onFieldChange} /></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Newsletter variants ───────────────────────────────────────────────────────

function NewsletterSectionV2({ newsletter, tt, primaryColor, device, sectionPy, variant, editMode, onFieldChange }: {
  newsletter: { headline: string; subtext: string };
  tt: TokenTheme; primaryColor: string; device: DeviceMode; sectionPy: number;
  variant: SectionVariants['newsletter'];
  editMode?: boolean; onFieldChange?: (f: string, v: string) => void;
}) {
  const isMobile = device === 'mobile';
  const pc = primaryColor;
  const pcText = isDark(pc) ? '#fff' : '#000';
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitBtn = (
    <button onClick={() => email && setSubmitted(true)}
      className="px-6 py-3 text-sm font-bold flex-shrink-0 transition-opacity hover:opacity-90"
      style={{ background: pc, color: pcText, borderRadius: tt.btnRadius }}>
      {submitted ? '✓ Subscribed!' : 'Subscribe'}
    </button>
  );
  const emailInput = (invert: boolean) => (
    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address"
      className="flex-1 px-4 py-3 text-sm outline-none"
      style={{
        background: invert ? 'rgba(255,255,255,0.15)' : tt.surfaceBg,
        border: `1px solid ${invert ? 'rgba(255,255,255,0.25)' : tt.surfaceBorder}`,
        color: invert ? '#fff' : tt.textPrimary,
        borderRadius: tt.btnRadius,
      }} />
  );

  if (variant === 'banner') {
    return (
      <section data-editor-section="newsletter" style={{ background: pc }}>
        <div className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-10 flex flex-col gap-6' : 'flex items-center justify-between gap-10'}`}
          style={isMobile ? {} : { paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
          <div>
            <h2 style={{ ...headingStyle(tt, isMobile ? 1.25 : 1.5), color: isDark(pc) ? '#fff' : '#000' }}><EditSpan field="newsletter.headline" value={newsletter.headline} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h2>
            <p className="text-sm mt-1" style={{ color: isDark(pc) ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}><EditSpan field="newsletter.subtext" value={newsletter.subtext} editMode={editMode} onFieldChange={onFieldChange} /></p>
          </div>
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2 ${isMobile ? '' : 'min-w-[380px]'}`}>
            {emailInput(isDark(pc))}
            {submitted ? <div className="px-4 py-3 text-sm font-bold" style={{ color: isDark(pc) ? '#fff' : '#000' }}>✓ You're in!</div> : submitBtn}
          </div>
        </div>
      </section>
    );
  }

  // Default: centered card
  return (
    <section data-editor-section="newsletter" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
      <div className="max-w-xl mx-auto px-5">
        <div className={`rounded-3xl ${isMobile ? 'p-5' : 'p-8'} text-center`}
          style={{ background: `linear-gradient(135deg, ${alpha(pc, 0.09)}, ${alpha(pc, 0.04)})`, border: `1px solid ${alpha(pc, 0.12)}` }}>
          <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mb-3`} style={{ color: tt.textPrimary }}><EditSpan field="newsletter.headline" value={newsletter.headline} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>
          <p className={`text-sm ${isMobile ? 'mb-5' : 'mb-7'} leading-relaxed`} style={{ color: tt.textSecondary }}><EditSpan field="newsletter.subtext" value={newsletter.subtext} editMode={editMode} onFieldChange={onFieldChange} /></p>
          <div className={`flex ${isMobile ? 'flex-col' : ''} gap-2`}>
            {emailInput(false)}
            {submitted ? <div className="py-3 text-sm font-semibold" style={{ color: pc }}>✓ You're on the list!</div> : submitBtn}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── EDITORIAL BANNER SECTION ─────────────────────────────────────────────────

function EditorialBannerSection({ design, tt, primaryColor, device, variant = 'center', sectionPy }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string;
  device: DeviceMode; variant?: string; sectionPy: number;
}) {
  const isMobile = device === 'mobile';
  const pc = primaryColor;
  const btnText = isDark(pc) ? '#fff' : '#000';
  const { heroTitle, heroSubtitle, ctaText, tagline, products = [] } = design;
  const bgImg = products[0]?.image;
  const heroH = isMobile ? '400px' : '520px';

  if (variant === 'left' && !isMobile) {
    return (
      <section style={{ display: 'flex', height: heroH, overflow: 'hidden' }}>
        {/* Left: text */}
        <div style={{ width: '50%', background: tt.pageBg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 56px' }}>
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            {tagline && <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', color: pc, marginBottom: '16px', fontWeight: 700 }}>{tagline}</p>}
            <h2 style={{ ...headingStyle(tt, 2.4), color: tt.textPrimary, marginBottom: '16px' }}>{heroTitle}</h2>
            <p style={{ ...bodyStyle(tt), color: tt.textSecondary, marginBottom: '32px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{heroSubtitle}</p>
            <button onClick={() => {}} style={{ alignSelf: 'flex-start', padding: '12px 28px', background: pc, color: btnText, borderRadius: tt.btnRadius, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>{ctaText}</button>
          </motion.div>
        </div>
        {/* Right: image */}
        <div style={{ width: '50%', position: 'relative', overflow: 'hidden' }}>
          {bgImg && <ProductImg src={bgImg} alt="" className="w-full h-full object-cover" />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.25), transparent)' }} />
        </div>
      </section>
    );
  }

  if (variant === 'overlay') {
    return (
      <section style={{ position: 'relative', height: heroH, overflow: 'hidden' }}>
        {bgImg && <ProductImg src={bgImg} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.62)' }} />
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          style={{ position: 'absolute', bottom: '10%', left: 0, right: 0, padding: isMobile ? '0 24px' : '0 60px' }}>
          {tagline && <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', color: alpha(pc, 0.9), marginBottom: '12px', fontWeight: 700 }}>{tagline}</p>}
          <h2 style={{ ...headingStyle(tt, isMobile ? 2 : 2.8), color: '#fff', marginBottom: '12px', maxWidth: '20ch' }}>{heroTitle}</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '28px', maxWidth: '45ch', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{heroSubtitle}</p>
          <button onClick={() => {}} style={{ padding: '12px 28px', background: pc, color: btnText, borderRadius: tt.btnRadius, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>{ctaText}</button>
        </motion.div>
      </section>
    );
  }

  // center (default)
  return (
    <section style={{ position: 'relative', height: heroH, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {bgImg && <ProductImg src={bgImg} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)' }} />
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
        style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: isMobile ? '0 24px' : '0 60px', maxWidth: '700px' }}>
        {tagline && <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', color: alpha(pc, 0.9), marginBottom: '12px', fontWeight: 700 }}>{tagline}</p>}
        <h2 style={{ ...headingStyle(tt, isMobile ? 2 : 2.8), color: '#fff', marginBottom: '12px' }}>{heroTitle}</h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '28px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{heroSubtitle}</p>
        <button onClick={() => {}} style={{ padding: '12px 32px', background: pc, color: btnText, borderRadius: tt.btnRadius, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>{ctaText}</button>
      </motion.div>
    </section>
  );
}

// ── COUNTDOWN SECTION ─────────────────────────────────────────────────────────

function CountdownSection({ design, tt, primaryColor, device, variant = 'centered', sectionPy }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string;
  device: DeviceMode; variant?: string; sectionPy: number;
}) {
  const isMobile = device === 'mobile';
  const pc = primaryColor;
  const pcText = isDark(pc) ? '#fff' : '#000';
  const { promoBar } = design;

  const [timeLeft, setTimeLeft] = useState(() => {
    const endMs = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const diff = endMs - Date.now();
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      endMs,
    };
  });

  useEffect(() => {
    const id = setInterval(() => {
      const diff = Math.max(0, timeLeft.endMs - Date.now());
      setTimeLeft(prev => ({
        ...prev,
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      }));
    }, 1000);
    return () => clearInterval(id);
  }, [timeLeft.endMs]);

  const units = [
    { label: 'Days',    value: timeLeft.days },
    { label: 'Hours',   value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  const heading = promoBar || 'Limited Time Offer';

  if (variant === 'banner') {
    return (
      <section style={{ background: pc, paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
        <div className="max-w-4xl mx-auto px-5 text-center">
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.25em', color: isDark(pc) ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)', marginBottom: '8px', fontWeight: 600 }}>Ends in</p>
          <h2 style={{ ...headingStyle(tt, isMobile ? 1.1 : 1.4), color: pcText, marginBottom: '28px' }}>{heading}</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? '12px' : '24px' }}>
            {units.map(u => (
              <div key={u.label} style={{ textAlign: 'center', minWidth: isMobile ? '56px' : '72px' }}>
                <motion.span key={u.value} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                  style={{ display: 'block', fontSize: isMobile ? '2.2rem' : '3rem', fontWeight: 900, lineHeight: 1, color: pcText, fontFamily: tt.headingFont }}>
                  {String(u.value).padStart(2, '0')}
                </motion.span>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: isDark(pc) ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)', fontWeight: 600 }}>{u.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'minimal') {
    return (
      <section style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
        <div className="max-w-4xl mx-auto px-5 text-center">
          <h2 style={{ ...headingStyle(tt, isMobile ? 1.0 : 1.2), color: tt.textPrimary, marginBottom: '24px' }}>{heading}</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? '16px' : '32px', alignItems: 'baseline' }}>
            {units.map(u => (
              <div key={u.label} style={{ textAlign: 'center' }}>
                <motion.span key={u.value} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                  style={{ display: 'block', fontSize: isMobile ? '2.8rem' : '4rem', fontWeight: 900, lineHeight: 1, color: pc, fontFamily: tt.headingFont }}>
                  {String(u.value).padStart(2, '0')}
                </motion.span>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: tt.textMuted, fontWeight: 600, marginTop: '6px', display: 'block' }}>{u.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // centered (default)
  return (
    <section style={{ background: tt.surfaceBg, paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
      <div className="max-w-4xl mx-auto px-5 text-center">
        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.25em', color: pc, marginBottom: '8px', fontWeight: 700 }}>Ends in</p>
        <h2 style={{ ...headingStyle(tt, isMobile ? 1.1 : 1.4), color: tt.textPrimary, marginBottom: '32px' }}>{heading}</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? '10px' : '20px' }}>
          {units.map(u => (
            <div key={u.label} style={{ textAlign: 'center' }}>
              <div style={{ width: isMobile ? '64px' : '88px', height: isMobile ? '64px' : '88px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: tt.pageBg, border: `1px solid ${tt.surfaceBorder}`, borderRadius: tt.surfaceRadius }}>
                <motion.span key={u.value} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                  style={{ fontSize: isMobile ? '1.7rem' : '2.4rem', fontWeight: 900, lineHeight: 1, color: tt.textPrimary, fontFamily: tt.headingFont }}>
                  {String(u.value).padStart(2, '0')}
                </motion.span>
              </div>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: tt.textMuted, fontWeight: 600, marginTop: '8px', display: 'block' }}>{u.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CATEGORY SPOTLIGHT SECTION ────────────────────────────────────────────────

function CategorySpotlightSection({ design, tt, primaryColor, device, variant = 'editorial', sectionPy, onProductClick }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string;
  device: DeviceMode; variant?: string; sectionPy: number;
  onProductClick: (p: RichProduct) => void;
}) {
  const isMobile = device === 'mobile';
  const pc = primaryColor;
  const btnText = isDark(pc) ? '#fff' : '#000';
  const { products = [], collections = [], tagline, ctaText } = design;
  const collection = collections[0];
  const spotlightProducts = products.slice(0, 4);

  if (variant === 'split') {
    return (
      <section style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: isMobile ? 'auto' : '520px', overflow: 'hidden' }}>
        {/* Left: big image */}
        <div style={{ flex: isMobile ? 'none' : '1 1 50%', position: 'relative', height: isMobile ? '280px' : 'auto', overflow: 'hidden' }}>
          {spotlightProducts[0] && <ProductImg src={spotlightProducts[0].image} alt={spotlightProducts[0].name} fallback={spotlightProducts[0].imageFallback} className="w-full h-full object-cover" />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, rgba(0,0,0,0.15))' }} />
        </div>
        {/* Right: product list */}
        <div style={{ flex: isMobile ? 'none' : '1 1 50%', background: tt.surfaceBg, padding: isMobile ? '32px 24px' : '48px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {collection && <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.25em', color: pc, marginBottom: '8px', fontWeight: 700 }}>{collection.emoji} {collection.name}</p>}
          <h2 style={{ ...headingStyle(tt, isMobile ? 1.4 : 1.8), color: tt.textPrimary, marginBottom: '28px' }}>{tagline || 'Discover the Collection'}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {spotlightProducts.slice(1, 4).map(p => (
              <div key={p.id} onClick={() => onProductClick(p)} style={{ display: 'flex', gap: '16px', cursor: 'pointer', padding: '12px', borderRadius: tt.surfaceRadius, border: `1px solid ${tt.surfaceBorder}`, background: tt.pageBg, transition: 'transform 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                <div style={{ width: '60px', height: '60px', borderRadius: tt.surfaceRadius, overflow: 'hidden', flexShrink: 0 }}>
                  <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: tt.textPrimary, marginBottom: '4px' }}>{p.name}</p>
                  <p style={{ fontSize: '12px', color: pc, fontWeight: 700 }}>{p.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'immersive') {
    return (
      <section style={{ position: 'relative', background: isDark(tt.pageBg) ? tt.pageBg : '#0a0a0a', overflow: 'hidden', padding: `${sectionPy}px 0` }}>
        {/* Huge background text */}
        {collection && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0 }}>
            <span style={{ fontSize: 'clamp(6rem, 18vw, 16rem)', fontWeight: 900, fontFamily: tt.headingFont, color: 'rgba(255,255,255,0.04)', textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '-0.04em' }}>{collection.name}</span>
          </div>
        )}
        <div className="max-w-6xl mx-auto px-5" style={{ position: 'relative', zIndex: 1 }}>
          {collection && <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3em', color: pc, marginBottom: '12px', fontWeight: 700, textAlign: 'center' }}>{collection.emoji} {collection.name}</p>}
          <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? '12px' : '20px', flexWrap: isMobile ? 'wrap' : 'nowrap', alignItems: 'flex-end' }}>
            {spotlightProducts.slice(0, 4).map((p, i) => {
              const offsets = [0, -24, -12, -36];
              return (
                <motion.div key={p.id} onClick={() => onProductClick(p)} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.6 }}
                  style={{ cursor: 'pointer', flexShrink: 0, width: isMobile ? 'calc(50% - 6px)' : '200px', marginBottom: isMobile ? 0 : `${offsets[i]}px`, borderRadius: tt.surfaceRadius, overflow: 'hidden', border: `1px solid rgba(255,255,255,0.08)` }}>
                  <div style={{ height: isMobile ? '180px' : '280px', overflow: 'hidden' }}>
                    <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginBottom: '2px' }}>{p.name}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // editorial (default)
  return (
    <section style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
      <div className="max-w-6xl mx-auto px-5">
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '32px' : '60px', alignItems: isMobile ? 'flex-start' : 'center' }}>
          {/* Left: editorial text */}
          <div style={{ flex: '0 0 auto', maxWidth: isMobile ? '100%' : '300px' }}>
            {collection && <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.35em', color: pc, marginBottom: '12px', fontWeight: 700 }}>{collection.emoji} {collection.name}</p>}
            <h2 style={{ ...headingStyle(tt, isMobile ? 1.6 : 2.2), color: tt.textPrimary, marginBottom: '16px' }}>{tagline || 'The Collection'}</h2>
            <div style={{ width: '32px', height: '2px', background: pc, marginBottom: '16px' }} />
            <p style={{ ...bodyStyle(tt), color: tt.textSecondary, marginBottom: '28px', lineHeight: 1.7 }}>{collection?.name ? `Explore our ${collection.name} range` : 'Handpicked for you'}</p>
            <button onClick={() => {}} style={{ padding: '10px 24px', background: pc, color: btnText, borderRadius: tt.btnRadius, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>{ctaText || 'Shop Now'}</button>
          </div>
          {/* Right: 2-col micro-grid */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {spotlightProducts.slice(0, 4).map((p, i) => (
              <motion.div key={p.id} onClick={() => onProductClick(p)} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                style={{ cursor: 'pointer', borderRadius: tt.surfaceRadius, overflow: 'hidden', position: 'relative' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                <div style={{ aspectRatio: '3/4', overflow: 'hidden', background: tt.surfaceBg }}>
                  <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
                </div>
                <div style={{ padding: '10px 0 4px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: tt.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── TOKEN LAYOUT — main component ─────────────────────────────────────────────

function TokenLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen, wishlist, onToggleWishlist, onWishlistClick, editMode, onFieldChange }: LayoutProps) {
  // v2: designTokens (raw CSS values from Claude) takes priority over v1 buckets
  const dt = design.designTokens;
  const ds = design.designSystem;
  const tt: TokenTheme = dt
    ? getTokenThemeV2(dt, primaryColor)
    : getTokenThemeV1(ds!, primaryColor);

  // Resolve layout structure from whichever token set is active
  const heroStyle   = dt?.heroStyle   ?? ds?.heroLayout   ?? 'split';
  const productGrid = dt?.productGrid ?? ds?.productGrid  ?? 'standard';

  // ── Unified sections resolution (new → legacy fallback → default) ────────
  type SectionEntry = {
    type: string; variant?: string | null;
    props?: Partial<import('../../lib/claudeApi').HeroSectionProps & import('../../lib/claudeApi').FeaturesSectionProps & import('../../lib/claudeApi').ProductsSectionProps>;
  };
  const DEFAULT_SECTION_TYPES = ['hero','trust','collections','products','features','testimonials','stats','brandStory','faq','newsletter'];

  const resolvedSections: SectionEntry[] = (() => {
    // 1. New format: dt.sections array
    if (dt?.sections?.length) return dt.sections;
    // 2. Legacy: sectionOrder + sectionVariants
    const legacyOrder = dt?.sectionOrder ?? ds?.sectionOrder;
    if (legacyOrder?.length) {
      return legacyOrder.map(type => ({
        type,
        variant: dt?.sectionVariants?.[type as keyof NonNullable<typeof dt.sectionVariants>] ?? null,
      }));
    }
    // 3. Default order
    return DEFAULT_SECTION_TYPES.map(type => ({ type, variant: null }));
  })();

  // Phase 3: motion & elevation from tokens
  const motion    = (dt?.motion    ?? 'subtle')     as MotionLevel;
  const elevation = (dt?.elevation ?? 'subtle')     as ElevationLevel;
  const spacing   = dt?.spacing ?? 'comfortable';
  const sectionPy = getSpacingPx(spacing, 56);

  // Animation archetype — drives scroll-reveal style, glow, parallax
  const animArch  = getAnimArchetype(dt?.personality, dt?.motion);

  const isMobile = device === 'mobile';
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCol, setSelectedCol] = useState(0);
  const productsRef = useRef<HTMLDivElement>(null);
  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth' });

  const { navLinks = [], products = [], collections = [], features = [], testimonials = [],
          tagline, faq = [], stats = [], promoBar, newsletter, trustBadges = [], brandStory,
          sectionHeadings } = design;

  const displayed = selectedCol === 0 ? products : products.filter((_, i) => i % collections.length === selectedCol % collections.length);

  // ── Section renderers ─────────────────────────────────────────────────────

  const renderSection = ({ type: section, variant, props: sProps = {} }: SectionEntry): React.ReactNode => {
    // hero variant: prefer inline variant from sections[], fallback to heroStyle token
    const heroVariant = variant ?? heroStyle;
    // products variant: prefer inline variant, fallback to productGrid token
    const gridVariant = variant ?? productGrid;

    // Typed section props helpers
    const heroProps = sProps as { textAlign?: 'left'|'center'|'right'; imageRatio?: 'portrait'|'square'|'landscape'; ctaStyle?: 'filled'|'outline'|'text'; accentLine?: boolean };
    const featProps = sProps as { columns?: 2|3|4 };
    const prodProps = sProps as { title?: string; label?: string };
    // Content style vars — drives label/button/category text presentation
    const cv = getContentStyleVars(tt.contentStyle);

    switch (section) {
      case 'hero':
        switch (heroVariant) {
          case 'centered':      return <TkHeroCentered      key="hero" design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} heroProps={heroProps} editMode={editMode} onFieldChange={onFieldChange} />;
          case 'fullscreen':    return <TkHeroFullscreen    key="hero" design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} heroProps={heroProps} editMode={editMode} onFieldChange={onFieldChange} />;
          case 'minimal':       return <TkHeroMinimal       key="hero" design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} heroProps={heroProps} editMode={editMode} onFieldChange={onFieldChange} />;
          case 'editorial':     return <TkHeroEditorial     key="hero" design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} heroProps={heroProps} editMode={editMode} onFieldChange={onFieldChange} />;
          case 'video':         return <TkHeroVideo         key="hero" design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} heroProps={heroProps} editMode={editMode} onFieldChange={onFieldChange} />;
          case 'stacked':       return <TkHeroStacked       key="hero" design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} heroProps={heroProps} editMode={editMode} onFieldChange={onFieldChange} />;
          case 'asymmetrical':  return <TkHeroAsymmetrical  key="hero" design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} heroProps={heroProps} editMode={editMode} onFieldChange={onFieldChange} />;
          case 'cinematic':    return <TkHeroCinematic    key="hero" design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} heroProps={heroProps} editMode={editMode} onFieldChange={onFieldChange} />;
          case 'chat':         return <TkHeroChat         key="hero" design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} heroProps={heroProps} />;
          case 'fashion':      return <TkHeroFashion      key="hero" design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} heroProps={heroProps} editMode={editMode} onFieldChange={onFieldChange} />;
          default:              return <TkHeroSplit          key="hero" design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} fmtPrice={fmtPrice} heroProps={heroProps} editMode={editMode} onFieldChange={onFieldChange} />;
        }

      case 'trust':
        if (!trustBadges.length) return null;
        return <TrustBadgesRow key="trust" badges={trustBadges} primaryColor={primaryColor} device={device} editMode={editMode} onFieldChange={onFieldChange} />;

      case 'collections':
        if (!collections.length) return null;
        return (
          <div key="collections" style={{ borderTop: `1px solid ${tt.divider}`, borderBottom: `1px solid ${tt.divider}`, background: tt.headerBg }}>
            <div className="max-w-6xl mx-auto px-5 py-3 flex gap-2.5 overflow-x-auto">
              {[{ name: 'All', emoji: '✨' }, ...collections].map((c, i) => (
                <button key={i} onClick={() => setSelectedCol(i)} className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-all"
                  style={selectedCol === i ? { background: primaryColor, color: isDark(primaryColor) ? '#fff' : '#000', borderRadius: tt.btnRadius } : { background: tt.surfaceBg, color: tt.textSecondary, borderRadius: tt.btnRadius }}>
                  <span>{editMode ? <StyleOnlySpan field={`collections.${i}.emojiHtml`} value={c.emoji} htmlValue={c.emojiHtml} editMode={editMode} onFieldChange={onFieldChange} /> : c.emoji}</span>
              <span>{editMode ? <StyleOnlySpan field={`collections.${i}.nameHtml`} value={c.name} htmlValue={c.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /> : c.name}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'products': {
        // Full-width wrapper so bg covers edge-to-edge; inner section stays max-w constrained
        const prodSectionBg = elevation === 'raised' || elevation === 'floating'
          ? tt.surfaceBg : tt.pageBg;
        return (
          <div key="products" style={{ background: prodSectionBg }}>
          <section ref={productsRef} className="max-w-6xl mx-auto px-5" style={{ paddingTop: isMobile ? '2rem' : `${sectionPy}px`, paddingBottom: isMobile ? '2rem' : `${sectionPy}px` }}>
            <div className="flex items-end justify-between mb-7">
              <div>
                {/* Accent line above heading — driven by primaryColor */}
                <div className="h-0.5 w-8 mb-3 rounded-full" style={{ background: primaryColor, opacity: 0.8 }} />
                <p className={`${cv.labelSize} font-semibold mb-1.5`} style={{ color: tt.textMuted, textTransform: cv.labelTransform, letterSpacing: cv.labelTracking }}>{prodProps.label ?? 'Curated Selection'}</p>
                <h2 style={{ ...headingStyle(tt, isMobile ? 1.25 : 1.6), color: tt.textPrimary }}>{prodProps.title ?? 'Featured Products'}</h2>
              </div>
              <button onClick={scrollToProducts} className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:gap-2.5 transition-all" style={{ color: primaryColor }}>
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {gridVariant === 'magazine'  ? (
              <TkGridMagazine  products={displayed} tt={tt} primaryColor={primaryColor} device={device} onProductClick={onProductClick} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlist={wishlist} fmtPrice={fmtPrice} />
            ) : gridVariant === 'list' ? (
              <TkGridList      products={displayed} tt={tt} primaryColor={primaryColor} onProductClick={onProductClick} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlist={wishlist} fmtPrice={fmtPrice} />
            ) : gridVariant === 'carousel' ? (
              <TkGridCarousel  products={displayed} tt={tt} primaryColor={primaryColor} device={device} onProductClick={onProductClick} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlist={wishlist} fmtPrice={fmtPrice} />
            ) : gridVariant === 'spotlight' ? (
              <TkGridSpotlight products={displayed} tt={tt} primaryColor={primaryColor} device={device} onProductClick={onProductClick} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlist={wishlist} fmtPrice={fmtPrice} />
            ) : tt.compositionStyle === 'staggered' ? (
              <TkGridStaggered  products={displayed} tt={tt} primaryColor={primaryColor} device={device} onProductClick={onProductClick} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlist={wishlist} fmtPrice={fmtPrice} />
            ) : tt.compositionStyle === 'overlapping' ? (
              <TkGridOverlapping products={displayed} tt={tt} primaryColor={primaryColor} device={device} onProductClick={onProductClick} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlist={wishlist} fmtPrice={fmtPrice} />
            ) : tt.compositionStyle === 'asymmetric' ? (
              <TkGridAsymmetric  products={displayed} tt={tt} primaryColor={primaryColor} device={device} onProductClick={onProductClick} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlist={wishlist} fmtPrice={fmtPrice} />
            ) : (
              <TkGridStandard  products={displayed} tt={tt} primaryColor={primaryColor} device={device} onProductClick={onProductClick} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlist={wishlist} fmtPrice={fmtPrice} />
            )}
          </section>
          </div>
        );
      }

      case 'features':
        if (!features.length) return null;
        return <FeaturesSection key="features" features={features} tt={tt} primaryColor={primaryColor} device={device} motion={motion} elevation={elevation} sectionPy={sectionPy} variant={variant as SectionVariants['features']} columns={featProps.columns} editMode={editMode} onFieldChange={onFieldChange} />;

      case 'testimonials':
        if (!testimonials.length) return null;
        return <TestimonialsSection key="testimonials" testimonials={testimonials} tt={tt} primaryColor={primaryColor} device={device} sectionPy={sectionPy} variant={variant as SectionVariants['testimonials']} editMode={editMode} onFieldChange={onFieldChange} />;

      case 'stats':
        if (!stats.length) return null;
        return <StatsSection key="stats" stats={stats} primaryColor={primaryColor} device={device} tt={tt} sectionPy={sectionPy} variant={variant as SectionVariants['stats']} />;

      case 'brandStory':
        if (!brandStory) return null;
        return <BrandStorySection key="brandStory" brandStory={brandStory} products={products} tt={tt} primaryColor={primaryColor} device={device} sectionPy={sectionPy} variant={variant as SectionVariants['brandStory']} editMode={editMode} onFieldChange={onFieldChange} />;

      case 'faq':
        if (!faq.length) return null;
        return <FaqSection key="faq" faq={faq} tt={tt} primaryColor={primaryColor} device={device} sectionPy={sectionPy} variant={variant as SectionVariants['faq']} editMode={editMode} onFieldChange={onFieldChange} sectionHeadings={sectionHeadings} />;

      case 'newsletter':
        if (!newsletter) return null;
        return <NewsletterSectionV2 key="newsletter" newsletter={newsletter} tt={tt} primaryColor={primaryColor} device={device} sectionPy={sectionPy} variant={variant as SectionVariants['newsletter']} editMode={editMode} onFieldChange={onFieldChange} />;

      case 'scrollingBanner':
        return <ScrollingBannerSection key="scrollingBanner" design={design} primaryColor={primaryColor} tt={tt} />;

      case 'instagramFeed':
        return <InstagramFeedSection key="instagramFeed" design={design} primaryColor={primaryColor} tt={tt} device={device} onProductClick={onProductClick} />;

      case 'editorialBanner':
        return <EditorialBannerSection key="editorialBanner" design={design} tt={tt} primaryColor={primaryColor} device={device} variant={variant ?? undefined} sectionPy={sectionPy} />;

      case 'countdown':
        return <CountdownSection key="countdown" design={design} tt={tt} primaryColor={primaryColor} device={device} variant={variant ?? undefined} sectionPy={sectionPy} />;

      case 'categorySpotlight':
        return <CategorySpotlightSection key="categorySpotlight" design={design} tt={tt} primaryColor={primaryColor} device={device} variant={variant ?? undefined} sectionPy={sectionPy} onProductClick={onProductClick} />;

      default:
        return null;
    }
  };

  // resolvedSections declared above — nothing to compute here

  // Detect dark/warm palette for FAQ and Newsletter tone
  const isDarkPalette = tt.pageBg.startsWith('#0') || tt.pageBg.startsWith('#1') || parseInt(tt.pageBg.replace('#',''), 16) < 0x333333;
  const isWarmPalette = (() => {
    const bg = tt.pageBg.toLowerCase();
    return bg.includes('f9f') || bg.includes('faf') || bg.includes('fdf') || bg.includes('f6f') || bg.includes('f5f');
  })();

  return (
    <div style={{ fontFamily: tt.fontFamily, background: tt.pageBg, color: tt.textPrimary }}>
      <TkFontInjector url={tt.googleFontsUrl} />
      <AnimationInjector />
      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={navLinks} primaryColor={primaryColor} storeName={storeName} onScrollToProducts={scrollToProducts} />

      {/* Sticky wrapper — PromoBar + header stack together, no overlap */}
      <div className={`sticky top-0 z-40${animArch === 'tech' ? ' sk-grad-header' : ''}`}
        style={{
          background: animArch === 'tech'
            ? `linear-gradient(135deg, ${tt.headerBg}, ${tt.primary}22, ${tt.headerBg})`
            : tt.headerBg + 'f5',
        }}>
        {promoBar && <PromoBar text={promoBar} primaryColor={primaryColor} editMode={editMode} onFieldChange={onFieldChange} />}

        {/* Header */}
        <header
          className="backdrop-blur-sm"
          style={{
            borderBottom: `1px solid ${tt.headerBorder}`,
            height: '56px',
          }}>
        <div className="max-w-6xl mx-auto px-5 h-full flex items-center justify-between">
          <span className="text-sm font-black tracking-[0.18em] uppercase" style={{ fontFamily: tt.headingFont, color: tt.textPrimary }}>
            <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </span>
          {!isMobile ? (
            <nav className="flex gap-7">
              {navLinks.map((l, li) => (
                <a key={li} onClick={editMode ? undefined : scrollToProducts} className="text-xs uppercase tracking-wider font-medium cursor-pointer transition-opacity hover:opacity-60" style={{ color: tt.textSecondary }}>
                  <EditSpan field={`navLinks.${li}`} value={l} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                </a>
              ))}
            </nav>
          ) : (
            <button onClick={() => setMenuOpen(true)} className="p-2 rounded-lg" style={{ color: tt.textSecondary }}><Menu className="w-5 h-5" /></button>
          )}
          <div className="flex items-center gap-1">
            {!isMobile && <button onClick={onSearchOpen} className="p-2 rounded-lg transition-opacity hover:opacity-60" style={{ color: tt.textSecondary }}><Search className="w-4 h-4" /></button>}
            <button data-wishlist-nav="" onClick={onWishlistClick} className="relative p-2 rounded-lg transition-opacity hover:opacity-60" style={{ color: tt.textSecondary }}>
              <Heart className="w-4 h-4" />
              {wishlist.size > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center bg-rose-500">{wishlist.size}</span>}
            </button>
            <button data-cart-btn onClick={onCartClick} className="relative p-2 rounded-lg transition-opacity hover:opacity-60" style={{ color: tt.textSecondary }}>
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: primaryColor }}>{cartCount}</span>}
            </button>
            <UserProfileMenu buyerEmail={buyerEmail} onUserClick={onUserClick} onWishlistClick={onWishlistClick} wishlistCount={wishlist.size} iconColor={tt.textSecondary} />
          </div>
        </div>
        </header>
      </div>

      {/* Sections rendered in Claude-specified order with per-section variants */}
      {resolvedSections.map((entry) => {
        const node = renderSection(entry);
        if (!node) return null;
        // Hero, trust, scrollingBanner — skip reveal (above fold or already animated)
        const noReveal = ['hero', 'trust', 'scrollingBanner'].includes(entry.type);
        const content = noReveal || motion === 'none' ? node : (
          <RevealWrapper archetype={animArch} delay={0}>
            {node}
          </RevealWrapper>
        );
        return (
          <div key={entry.type} data-editor-section={entry.type}>
            {content}
          </div>
        );
      })}

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${tt.divider}`, background: tt.headerBg, paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm font-black uppercase tracking-[0.18em]" style={{ fontFamily: tt.headingFont, color: tt.textPrimary }}>
            <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </span>
          <p className="text-xs italic" style={{ color: tt.textMuted }}>
            <EditSpan field="tagline" value={design.tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
          <p className="text-xs" style={{ color: tt.textMuted }}>
            <EditSpan field="footerNote" value={design.footerNote ?? `© 2026 ${storeName} · All rights reserved`} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── APP-LIKE LAYOUT ───────────────────────────────────────────────────────────
// Mobile-app skeleton: story circles, product list rows, fixed bottom nav
// Personality: WhatsApp-like, Discord-like, Spotify-like

function AppLikeLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen, wishlist, onToggleWishlist, onWishlistClick, editMode, onFieldChange }: LayoutProps) {
  const dt = design.designTokens;
  const tt: TokenTheme = dt ? getTokenThemeV2(dt, primaryColor) : getDefaultTokenTheme(primaryColor);

  const { products = [], collections = [], features = [], testimonials = [],
          tagline, promoBar, trustBadges = [], brandStory, heroTitle, heroSubtitle, ctaText, appNav, sectionHeadings } = design;

  const isMobile = device === 'mobile';
  const [selectedCol, setSelectedCol] = useState(0);
  const [searchVal, setSearchVal] = useState('');
  const [activePage, setActivePage] = useState<'home' | 'catalog' | 'profile'>('home');
  const productsRef = useRef<HTMLDivElement>(null);

  const pc = primaryColor || '#075E54';
  const pcText = isDark(pc) ? '#ffffff' : '#000000';

  const displayed = selectedCol === 0
    ? products
    : products.filter((_, i) => i % collections.length === selectedCol % collections.length);

  const filtered = searchVal.trim()
    ? displayed.filter(p => p.name.toLowerCase().includes(searchVal.toLowerCase()) || p.category.toLowerCase().includes(searchVal.toLowerCase()))
    : displayed;

  return (
    <div style={{ background: tt.pageBg, fontFamily: tt.fontFamily, minHeight: '100vh', paddingBottom: '64px', position: 'relative' }}>
      <TkFontInjector url={tt.googleFontsUrl} />

      {promoBar && <PromoBar text={promoBar} primaryColor={pc} editMode={editMode} onFieldChange={onFieldChange} />}

      {/* ── Header ── */}
      <header style={{ background: pc, position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="flex items-center justify-between px-4" style={{ height: '56px' }}>
          <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine className="text-base font-bold text-white truncate max-w-[160px]" />
          <div className="flex items-center gap-1">
            <button data-wishlist-nav="" onClick={onWishlistClick} className="relative p-2 text-white/70 hover:text-white">
              <Heart className="w-5 h-5" />
              {wishlist.size > 0 && <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 text-[8px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center">{wishlist.size}</span>}
            </button>
            <button data-cart-btn onClick={onCartClick} className="relative p-2 text-white/70 hover:text-white">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 text-[8px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: alpha(pc, 0.9), border: '1.5px solid rgba(255,255,255,0.5)' }}>{cartCount}</span>}
            </button>
          </div>
        </div>
        {/* Search bar */}
        <div className="px-3 pb-2.5">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.18)' }}>
            <Search className="w-4 h-4 text-white/70 flex-shrink-0" />
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Search products..."
              className="bg-transparent text-sm text-white placeholder:text-white/55 outline-none flex-1"
            />
          </div>
        </div>
      </header>


      {/* All sections — reorderable via designTokens.sections */}
      {(() => {
        const sectionOrder = (design.designTokens?.sections as Array<{ type: string }> | undefined)
          ?.map(s => s.type).filter(t => ['trust','collections','products','features','testimonials','brandStory'].includes(t))
          ?? ['trust', 'collections', 'products', 'features', 'testimonials', 'brandStory'];

        const sectionMap: Record<string, React.ReactNode> = {
          trust: trustBadges.length > 0 ? (
            <div key="trust" data-editor-section="trust">
              <TrustBadgesRow badges={trustBadges} primaryColor={pc} device={device} editMode={editMode} onFieldChange={onFieldChange} />
            </div>
          ) : null,

          collections: collections.length > 0 ? (
            <div key="collections" data-editor-section="collections" style={{ background: tt.surfaceBg, borderBottom: `1px solid ${tt.divider}` }}>
              <div className="flex gap-3 px-3 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {[{ name: 'All', emoji: '✨' }, ...collections].map((c, i) => (
                  <button key={i} onClick={() => setSelectedCol(i)} className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[56px]">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: selectedCol === i ? pc : tt.pageBg, border: `2px solid ${selectedCol === i ? pc : tt.divider}` }}>{c.emoji}</div>
                    <span className="text-[10px] font-medium text-center truncate max-w-[56px]" style={{ color: selectedCol === i ? pc : tt.textMuted }}>
                      {i === 0 ? c.name : <EditSpan field={`collections.${i - 1}.name`} value={c.name} editMode={editMode} onFieldChange={onFieldChange} singleLine />}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null,

          products: (
            <div key="products" ref={productsRef} data-editor-section="products" style={{ background: tt.pageBg }}>
              {dt?.personality?.includes('spotify') ? (
                <div className="px-4 py-3 space-y-2">
                  {displayed.map(p => { const pi = products.indexOf(p); return (
                    <div key={p.id} className="flex items-center gap-3 py-2 cursor-pointer group" onClick={() => onProductClick(p)}>
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: tt.textPrimary }}>
                          {pi >= 0 ? <EditSpan field={`products.${pi}.name`} value={p.name} editMode={editMode} onFieldChange={onFieldChange} singleLine /> : p.name}
                        </p>
                        <p className="text-xs" style={{ color: tt.textMuted }}>
                          {pi >= 0 ? <EditSpan field={`products.${pi}.category`} value={p.category} editMode={editMode} onFieldChange={onFieldChange} singleLine /> : p.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black" style={{ color: pc }}>
                          {pi >= 0 ? <EditSpan field={`products.${pi}.price`} value={fmtPrice(p.price)} editMode={editMode} onFieldChange={onFieldChange} singleLine /> : fmtPrice(p.price)}
                        </span>
                        <button onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }} className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold" style={{ background: pc, color: isDark(pc) ? '#fff' : '#000' }}>+</button>
                      </div>
                    </div>
                  ); })}
                </div>
              ) : (
                <div className={`grid gap-3 p-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {displayed.map(p => { const pi = products.indexOf(p); return (
                    <div key={p.id} className="cursor-pointer" onClick={() => onProductClick(p)}>
                      <div className="relative overflow-hidden" style={{ aspectRatio: '1/1', borderRadius: tt.surfaceRadius, background: tt.surfaceBg }}>
                        <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
                        {p.badge && <span className="absolute top-2 left-2 text-[9px] font-black uppercase px-2 py-0.5" style={{ background: pc, color: isDark(pc) ? '#fff' : '#000', borderRadius: '999px' }}>
                          {pi >= 0 ? <EditSpan field={`products.${pi}.badge`} value={p.badge} editMode={editMode} onFieldChange={onFieldChange} singleLine /> : p.badge}
                        </span>}
                        <button data-wishlist-btn="" onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }} className="absolute top-2 right-2 w-6 h-6 bg-white/80 backdrop-blur flex items-center justify-center rounded-full">
                          <Heart className={`w-3 h-3 ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(p.id) ? undefined : { color: tt.textMuted }} />
                        </button>
                      </div>
                      <div className="mt-2 px-0.5">
                        <p className="text-xs font-semibold truncate" style={{ color: tt.textPrimary }}>
                          {pi >= 0 ? <EditSpan field={`products.${pi}.name`} value={p.name} editMode={editMode} onFieldChange={onFieldChange} singleLine /> : p.name}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-black" style={{ color: pc }}>
                            {pi >= 0 ? <EditSpan field={`products.${pi}.price`} value={fmtPrice(p.price)} editMode={editMode} onFieldChange={onFieldChange} singleLine /> : fmtPrice(p.price)}
                          </span>
                          <button onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }} className="w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold" style={{ background: pc, color: isDark(pc) ? '#fff' : '#000' }}>+</button>
                        </div>
                      </div>
                    </div>
                  ); })}
                </div>
              )}
            </div>
          ),

            features: features.length > 0 ? (
              <div key="features" data-editor-section="features" className="px-4 pt-6 pb-4 space-y-3" style={{ borderTop: `4px solid ${tt.divider}` }}>
                {features.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-start gap-3 py-2">
                    <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl" style={{ background: tt.surfaceBg }}>
                      <EmojiIcon emoji={f.icon} size={18} color={pc} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: tt.textPrimary }}>
                        <EditSpan field={`features.${i}.title`} value={f.title} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                      </p>
                      <p className="text-xs leading-relaxed mt-0.5" style={{ color: tt.textSecondary }}>
                        <EditSpan field={`features.${i}.description`} value={f.description} editMode={editMode} onFieldChange={onFieldChange} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null,

            testimonials: testimonials.length > 0 ? (
              <div key="testimonials" data-editor-section="testimonials" className="px-4 pt-4 pb-4 space-y-3" style={{ borderTop: `4px solid ${tt.divider}` }}>
                {testimonials.slice(0, 3).map((t, i) => (
                  <div key={i} className="rounded-2xl p-4" style={{ background: tt.surfaceBg }}>
                    <Stars n={t.rating} />
                    <p className="text-sm leading-relaxed mt-2 mb-2" style={{ color: tt.textSecondary }}>
                      "<EditSpan field={`testimonials.${i}.text`} value={t.text} editMode={editMode} onFieldChange={onFieldChange} />"
                    </p>
                    <p className="text-xs font-bold" style={{ color: tt.textPrimary }}>
                      - <EditSpan field={`testimonials.${i}.author`} value={t.author} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                    </p>
                  </div>
                ))}
              </div>
            ) : null,

            brandStory: brandStory ? (
              <div key="brandStory" data-editor-section="brandStory" className="px-4 py-5" style={{ borderTop: `4px solid ${tt.divider}`, background: tt.surfaceBg }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: pc }}>
                  <EditSpan field="sectionHeadings.brandStory" value={sectionHeadings?.brandStory ?? 'Our Story'} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                </p>
                <p className="text-sm leading-relaxed" style={{ color: tt.textSecondary }}>
                  <EditSpan field="brandStory" value={brandStory} editMode={editMode} onFieldChange={onFieldChange} />
                </p>
              </div>
            ) : null,
          };

          return [
            ...sectionOrder.map(type => sectionMap[type] ?? null),
            <div key="footer" className="py-4 text-center">
              <p className="text-[10px]" style={{ color: tt.textMuted }}>
                <EditSpan field="footerNote" value={design.footerNote ?? `© 2026 ${storeName} · All rights reserved`} editMode={editMode} onFieldChange={onFieldChange} singleLine />
              </p>
            </div>,
            <nav key="bottom-nav" className="fixed bottom-0 left-0 right-0 z-50 flex items-center" style={{ background: tt.surfaceBg, borderTop: `1px solid ${tt.divider}`, height: '60px' }}>
              {[
                { id: 'home',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>, label: 'Home' },
                { id: 'catalog', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><rect x={3} y={3} width={7} height={7}/><rect x={14} y={3} width={7} height={7}/><rect x={14} y={14} width={7} height={7}/><rect x={3} y={14} width={7} height={7}/></svg>, label: 'Catalog' },
                { id: 'cart',    icon: <ShoppingCart className="w-5 h-5" />, label: 'Cart', badge: cartCount },
                { id: 'profile', icon: <User className="w-5 h-5" />, label: 'Profile' },
              ].map(item => (
                <button key={item.id} onClick={() => {
                  if (item.id === 'cart') onCartClick();
                  else if (item.id === 'profile') onUserClick();
                  else if (item.id === 'home') setActivePage('home');
                  else setActivePage('catalog');
                }}
                  className="flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors"
                  style={{ color: activePage === item.id || (item.id === 'cart' && cartCount > 0) ? pc : tt.textMuted }}>
                  <div className="relative">
                    {item.icon}
                    {(item.badge ?? 0) > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 text-[8px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: pc }}>{item.badge}</span>
                    )}
                  </div>
                  <span className="text-[9px] font-semibold">
                    {editMode
                      ? <EditSpan field={`appNav.${item.id}`} value={appNav?.[item.id as 'home' | 'catalog' | 'cart' | 'profile'] ?? item.label} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                      : (appNav?.[item.id as 'home' | 'catalog' | 'cart' | 'profile'] ?? item.label)}
                  </span>
                </button>
              ))}
            </nav>
          ];
        })()}

      </div>
  );
}

// ── EDITORIAL LAYOUT ──────────────────────────────────────────────────────────
// Magazine skeleton: asymmetric grid, big typography, minimal UI chrome
// Personality: Apple-like, Notion-like, editorial fashion

function EditorialLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen, wishlist, onToggleWishlist, onWishlistClick, editMode, onFieldChange }: LayoutProps) {
  const dt = design.designTokens;
  const tt: TokenTheme = dt ? getTokenThemeV2(dt, primaryColor) : getDefaultTokenTheme(primaryColor);

  const { products = [], collections = [], features = [], testimonials = [],
          tagline, promoBar, trustBadges = [], brandStory, heroTitle, heroSubtitle, ctaText, navLinks = [], faq = [], stats = [], newsletter, sectionHeadings } = design;

  const isMobile = device === 'mobile';
  const [selectedCol, setSelectedCol] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth' });

  const pc = primaryColor || '#0071e3';

  const displayed = selectedCol === 0
    ? products
    : products.filter((_, i) => i % collections.length === selectedCol % collections.length);

  const isDarkPalette = tt.pageBg.startsWith('#0') || tt.pageBg.startsWith('#1');

  // Token-driven layout selectors
  const heroStyle   = dt?.heroStyle   ?? 'editorial';
  const productGrid = dt?.productGrid ?? 'editorial';
  const cardVars    = getCardStyleVars(dt?.cardStyle as CardStyleLevel | undefined, tt);
  const hoverMotion = getHoverMotion(dt?.hoverStyle as HoverStyleLevel | undefined, pc);
  const spacing     = dt?.spacing ?? 'comfortable';
  const sectionPy   = getSpacingPx(spacing, 56);

  // Hero: 3 variants based on heroStyle token
  const renderEditorialHero = () => {
    // ── Split: image right, large text left ──
    if (heroStyle === 'split' || heroStyle === 'asymmetrical') {
      return (
        <section style={{ background: tt.pageBg, overflow: 'hidden' }}>
          <div className="max-w-7xl mx-auto px-6 w-full" style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '2rem' : '4rem',
            alignItems: 'center',
            paddingTop: isMobile ? '3rem' : '5rem',
            paddingBottom: isMobile ? '3rem' : '5rem',
          }}>
            {/* Text — minWidth:0 prevents text from overflowing grid column */}
            <div style={{ minWidth: 0 }}>
              <p className="text-xs uppercase tracking-[0.3em] mb-5" style={{ color: pc }}>{tagline}</p>
              <h1 style={{ ...headingStyle(tt, isMobile ? 2.2 : 3.6), color: tt.textPrimary, lineHeight: 0.93, marginBottom: '1.25rem', maxWidth: '16ch' }}>
                <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
              </h1>
              {!isMobile && <p className="text-sm leading-relaxed mb-8" style={{ color: tt.textSecondary, maxWidth: '36ch' }}>
                <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
              </p>}
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={editMode ? undefined : scrollToProducts}
                  className="text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                  style={{ background: pc, color: isDark(pc) ? '#fff' : '#000', borderRadius: tt.btnRadius, padding: '0.75rem 1.5rem' }}>
                  <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                </button>
                <button onClick={scrollToProducts}
                  className="text-sm font-medium transition-colors hover:opacity-70"
                  style={{ border: `1.5px solid ${tt.surfaceBorder}`, color: tt.textPrimary, borderRadius: tt.btnRadius, padding: '0.75rem 1.5rem' }}>
                  Explore ↓
                </button>
              </div>
            </div>
            {/* Image — minWidth:0 + maxHeight prevents overflow */}
            {!isMobile && products[0]?.image && (
              <div style={{ minWidth: 0, position: 'relative', maxHeight: '60vh', borderRadius: tt.surfaceRadius, overflow: 'hidden' }}>
                <ProductImg src={products[0].image} alt={products[0].name ?? ''} className="w-full h-full object-cover" style={{ maxHeight: '60vh' }} />
                {products[1]?.image && (
                  <div className="absolute bottom-4 right-4 overflow-hidden"
                    style={{ width: '34%', aspectRatio: '1/1', borderRadius: tt.surfaceRadius, border: `3px solid ${tt.pageBg}`, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
                    <ProductImg src={products[1].image} alt={products[1].name ?? ''} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      );
    }

    // ── Minimal / Centered: large text, light/dark bg, no hero image ──
    if (heroStyle === 'minimal' || heroStyle === 'centered' || heroStyle === 'stacked') {
      return (
        <section style={{ background: tt.surfaceBg, minHeight: isMobile ? '52vh' : '62vh', display: 'flex', alignItems: 'center' }}>
          <div className="max-w-7xl mx-auto px-6 w-full text-center" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
            <p className="text-xs uppercase tracking-[0.35em] mb-6" style={{ color: pc }}>{tagline}</p>
            <h1 style={{ ...headingStyle(tt, isMobile ? 2.8 : 5.2), color: tt.textPrimary, lineHeight: 0.9, marginBottom: '1.5rem', maxWidth: '16ch', marginLeft: 'auto', marginRight: 'auto' }}>
              <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </h1>
            {!isMobile && (
              <p className="text-sm leading-relaxed mb-10 mx-auto" style={{ color: tt.textSecondary, maxWidth: '45ch' }}>
                <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
              </p>
            )}
            <button onClick={editMode ? undefined : scrollToProducts}
              className="text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{ background: pc, color: isDark(pc) ? '#fff' : '#000', borderRadius: tt.btnRadius, padding: '0.875rem 2rem' }}>
              <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </button>
          </div>
        </section>
      );
    }

    // ── Default / Editorial: full-bleed image, text at bottom ──
    return (
      <section className="relative overflow-x-hidden" style={{ minHeight: isMobile ? '70vh' : '85vh', display: 'flex', alignItems: 'flex-end' }}>
        {products[0]?.image && (
          <div className="absolute inset-0">
            <ProductImg src={products[0].image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: isDarkPalette
              ? 'linear-gradient(to top, rgba(0,0,0,0.92) 40%, rgba(0,0,0,0.3) 100%)'
              : 'linear-gradient(to top, rgba(0,0,0,0.75) 30%, rgba(0,0,0,0.1) 100%)' }} />
          </div>
        )}
        <div className="relative max-w-7xl mx-auto px-6 py-14 w-full">
          <p className="text-xs uppercase tracking-[0.3em] mb-5 text-white/60">{tagline}</p>
          <h1 className="font-black text-white leading-[0.95] mb-6"
            style={{ fontFamily: tt.headingFont, fontSize: isMobile ? 'clamp(2.5rem, 12vw, 4rem)' : 'clamp(4rem, 8vw, 7rem)', letterSpacing: '-0.02em', maxWidth: '12ch' }}>
            <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </h1>
          {!isMobile && (
            <p className="text-white/65 text-sm max-w-sm mb-10 leading-relaxed">
              <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
            </p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={editMode ? undefined : scrollToProducts}
              className="px-7 py-3.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{ background: pc, color: isDark(pc) ? '#fff' : '#000', borderRadius: tt.btnRadius }}>
              <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </button>
            <button onClick={scrollToProducts}
              className="px-7 py-3.5 text-sm font-semibold text-white border border-white/30 hover:bg-white/10 transition-colors"
              style={{ borderRadius: tt.btnRadius }}>
              Explore ↓
            </button>
          </div>
        </div>
      </section>
    );
  };

  // Product grid: switch based on productGrid token
  const renderProductsGrid = () => {
    const sharedProps = { products: displayed, tt, primaryColor: pc, device, onProductClick, onAddToCart, onToggleWishlist, wishlist, fmtPrice, editMode, onFieldChange };
    switch (productGrid) {
      case 'magazine':  return <TkGridMagazine  {...sharedProps} />;
      case 'list':      return <TkGridList      {...sharedProps} />;
      case 'carousel':  return <TkGridCarousel  {...sharedProps} />;
      case 'spotlight': return <TkGridSpotlight {...sharedProps} />;
      case 'standard':  return <TkGridStandard  {...sharedProps} />;
      default: // editorial asymmetric grid
        return isMobile ? (
          <div className="grid grid-cols-2 gap-3">
            {displayed.map(p => (
              <EditorialProductCard key={p.id} p={p} tt={tt} pc={pc} fmtPrice={fmtPrice} onProductClick={onProductClick} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlist={wishlist} cardVars={cardVars} hoverMotion={hoverMotion} editMode={editMode} onFieldChange={onFieldChange} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {displayed.map((p, idx) => idx === 0 ? (
              <div key={p.id} className="col-span-2 row-span-1">
                <EditorialProductCard p={p} tt={tt} pc={pc} fmtPrice={fmtPrice} onProductClick={onProductClick} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlist={wishlist} featured cardVars={cardVars} hoverMotion={hoverMotion} editMode={editMode} onFieldChange={onFieldChange} />
              </div>
            ) : (
              <EditorialProductCard key={p.id} p={p} tt={tt} pc={pc} fmtPrice={fmtPrice} onProductClick={onProductClick} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlist={wishlist} cardVars={cardVars} hoverMotion={hoverMotion} editMode={editMode} onFieldChange={onFieldChange} />
            ))}
          </div>
        );
    }
  };

  return (
    <div style={{ background: tt.pageBg, fontFamily: tt.fontFamily, color: tt.textPrimary }}>
      <TkFontInjector url={tt.googleFontsUrl} />
      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={navLinks} primaryColor={pc} storeName={storeName} onScrollToProducts={scrollToProducts} />

      {/* Sticky wrapper — keeps PromoBar + header stacked without overlap */}
      <div className="sticky top-0 z-40">
        {promoBar && <PromoBar text={promoBar} primaryColor={pc} />}
        {/* ── Header — minimal, transparent ── */}
        <header className="backdrop-blur-md"
          style={{ background: tt.headerBg + 'e8', borderBottom: `1px solid ${tt.divider}`, height: '52px' }}>
          <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
            {/* Brand */}
            <span className="text-sm font-black tracking-wider uppercase" style={{ fontFamily: tt.headingFont, color: tt.textPrimary }}><EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine /></span>

            {/* Nav — desktop only */}
            {!isMobile && (
              <nav className="flex gap-8">
                {navLinks.map((l, li) => (
                  <a key={li} onClick={editMode ? undefined : scrollToProducts} className="text-xs uppercase tracking-widest font-medium cursor-pointer transition-opacity hover:opacity-50"
                    style={{ color: tt.textSecondary, letterSpacing: '0.1em' }}><EditSpan field={`navLinks.${li}`} value={l} editMode={editMode} onFieldChange={onFieldChange} singleLine /></a>
                ))}
              </nav>
            )}

            {/* Icons */}
            <div className="flex items-center gap-1">
              {!isMobile && <button onClick={onSearchOpen} className="p-2 transition-opacity hover:opacity-60" style={{ color: tt.textSecondary }}><Search className="w-4 h-4" /></button>}
              <button data-wishlist-nav="" onClick={onWishlistClick} className="relative p-2 transition-opacity hover:opacity-60" style={{ color: tt.textSecondary }}>
                <Heart className="w-4 h-4" />
                {wishlist.size > 0 && <span className="absolute top-0 right-0 w-3.5 h-3.5 text-[8px] font-bold text-white bg-rose-500 rounded-full flex items-center justify-center">{wishlist.size}</span>}
              </button>
              <button data-cart-btn onClick={onCartClick} className="relative p-2 transition-opacity hover:opacity-60" style={{ color: tt.textSecondary }}>
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && <span className="absolute top-0 right-0 w-3.5 h-3.5 text-[8px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: pc }}>{cartCount}</span>}
              </button>
              {isMobile && <button onClick={() => setMenuOpen(true)} className="p-2" style={{ color: tt.textSecondary }}><Menu className="w-5 h-5" /></button>}
            </div>
          </div>
        </header>
      </div>

      {/* ── Hero — variant by heroStyle token ── */}

      {/* All sections rendered via sectionOrder from designTokens.sections */}
      {(() => {
        const sectionOrder = (design.designTokens?.sections as Array<{ type: string }> | undefined)
          ?.map(s => s.type)
          ?? ['hero', 'collections', 'trust', 'products', 'features', 'testimonials', 'brandStory', 'stats', 'faq', 'newsletter'];

        const sectionMap: Record<string, React.ReactNode> = {
          hero: (
            <div key="hero" data-editor-section="hero">
              {renderEditorialHero()}
            </div>
          ),

          collections: collections.length > 0 ? (
            <div key="collections" data-editor-section="collections" style={{ borderBottom: `1px solid ${tt.divider}`, background: tt.headerBg }}>
              <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {[{ name: 'All', emoji: '✦' }, ...collections].map((c, i) => (
                  <button key={i} onClick={() => setSelectedCol(i)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all"
                    style={selectedCol === i
                      ? { background: tt.textPrimary, color: tt.pageBg, borderRadius: tt.btnRadius }
                      : { background: 'transparent', color: tt.textSecondary, border: `1px solid ${tt.divider}`, borderRadius: tt.btnRadius }}>
                    <span>{editMode ? <StyleOnlySpan field={`collections.${i}.emojiHtml`} value={c.emoji} htmlValue={c.emojiHtml} editMode={editMode} onFieldChange={onFieldChange} /> : c.emoji}</span>
              <span>{editMode ? <StyleOnlySpan field={`collections.${i}.nameHtml`} value={c.name} htmlValue={c.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /> : c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null,

          trust: trustBadges.length > 0 ? (
            <div key="trust" data-editor-section="trust">
              <TrustBadgesRow badges={trustBadges} primaryColor={pc} device={device} editMode={editMode} onFieldChange={onFieldChange} />
            </div>
          ) : null,

          products: (
            <section key="products" ref={productsRef} data-editor-section="products" className="max-w-7xl mx-auto px-6" style={{ paddingTop: isMobile ? '2.5rem' : `${sectionPy}px`, paddingBottom: isMobile ? '2.5rem' : `${sectionPy}px` }}>
              <div className="flex items-end justify-between mb-8">
                <h2 className="font-black tracking-tight" style={{ ...headingStyle(tt, isMobile ? 1.1 : 1.35), color: tt.textPrimary }}><EditSpan field="sectionHeadings.products" value={sectionHeadings?.products ?? 'Featured Products'} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h2>
                <button onClick={scrollToProducts} className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 hover:gap-3 transition-all" style={{ color: pc }}>
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {renderProductsGrid()}
            </section>
          ),

          features: features.length > 0 ? (
            <section key="features" data-editor-section="features" style={{ borderTop: `1px solid ${tt.divider}`, background: tt.surfaceBg }}>
              <div className="max-w-7xl mx-auto px-6" style={{ paddingTop: isMobile ? '2.5rem' : '5rem', paddingBottom: isMobile ? '2.5rem' : '5rem' }}>
                <h2 className="font-black tracking-tight mb-10" style={{ fontFamily: tt.headingFont, color: tt.textPrimary, fontSize: isMobile ? '1.25rem' : '1.75rem' }}><EditSpan field="sectionHeadings.features" value={sectionHeadings?.features ?? 'Why us'} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h2>
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-3 gap-10'}`}>
                  <DraggableList items={features} field="features" editMode={editMode}>
                    {(f, i) => (
                    <div key={i} className="flex flex-col gap-3">
                      <div className="h-px w-12" style={{ background: pc }} />
                      <EmojiIcon emoji={f.icon} size={28} color={pc} strokeWidth={1.5} />
                      <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: tt.textPrimary }}><EditSpan field={`features.${i}.title`} value={f.title} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h3>
                      <p className="text-xs leading-relaxed" style={{ color: tt.textSecondary }}><EditSpan field={`features.${i}.description`} value={f.description} editMode={editMode} onFieldChange={onFieldChange} /></p>
                    </div>
                    )}
                  </DraggableList>
                </div>
              </div>
            </section>
          ) : null,

          testimonials: testimonials.length > 0 ? (
            <section key="testimonials" data-editor-section="testimonials" style={{ borderTop: `1px solid ${tt.divider}` }}>
              <div className="max-w-7xl mx-auto px-6" style={{ paddingTop: isMobile ? '2.5rem' : '5rem', paddingBottom: isMobile ? '2.5rem' : '5rem' }}>
                <h2 className="font-black tracking-tight mb-10 text-center" style={{ fontFamily: tt.headingFont, color: tt.textPrimary, fontSize: isMobile ? '1.25rem' : '1.75rem' }}><EditSpan field="sectionHeadings.testimonials" value={sectionHeadings?.testimonials ?? 'What they say'} editMode={editMode} onFieldChange={onFieldChange} singleLine /></h2>
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-5' : 'grid-cols-3 gap-8'}`}>
                  <DraggableList items={testimonials} field="testimonials" editMode={editMode}>
                    {(t, i) => (
                    <div key={i} className="flex flex-col gap-3">
                      <Stars n={t.rating} />
                      <p className="text-sm leading-relaxed italic flex-1" style={{ color: tt.textSecondary }}><EditSpan field={`testimonials.${i}.text`} value={t.text} editMode={editMode} onFieldChange={onFieldChange} /></p>
                      <div className="h-px" style={{ background: tt.divider }} />
                      <p className="text-xs font-black uppercase tracking-wide" style={{ color: tt.textPrimary }}><EditSpan field={`testimonials.${i}.author`} value={t.author} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>
                      <p className="text-[10px]" style={{ color: tt.textMuted }}><EditSpan field={`testimonials.${i}.role`} value={t.role} editMode={editMode} onFieldChange={onFieldChange} singleLine /></p>
                    </div>
                    )}
                  </DraggableList>
                </div>
              </div>
            </section>
          ) : null,

          brandStory: brandStory ? (
            <section key="brandStory" data-editor-section="brandStory" style={{ background: tt.surfaceBg, borderTop: `1px solid ${tt.divider}` }}>
              <div className="max-w-3xl mx-auto px-6 text-center" style={{ paddingTop: isMobile ? '2.5rem' : '5rem', paddingBottom: isMobile ? '2.5rem' : '5rem' }}>
                <p className="text-4xl mb-6 opacity-20" style={{ color: pc, fontFamily: tt.headingFont }}>&ldquo;</p>
                <p className="text-base leading-relaxed italic font-medium" style={{ color: tt.textSecondary }}><EditSpan field="brandStory" value={brandStory} editMode={editMode} onFieldChange={onFieldChange} /></p>
              </div>
            </section>
          ) : null,

          stats: stats && stats.length > 0 ? (
            <div key="stats" data-editor-section="stats">
              <StatsRow stats={stats} primaryColor={pc} device={device} dark={isDarkPalette} editMode={editMode} onFieldChange={onFieldChange} />
            </div>
          ) : null,

          faq: faq && faq.length > 0 ? (
            <div key="faq" data-editor-section="faq">
              <FAQSection faq={faq} primaryColor={pc} device={device} dark={isDarkPalette} editMode={editMode} onFieldChange={onFieldChange} sectionHeadings={sectionHeadings} />
            </div>
          ) : null,

          newsletter: newsletter ? (
            <div key="newsletter" data-editor-section="newsletter">
              <NewsletterSection newsletter={newsletter} primaryColor={pc} device={device} dark={isDarkPalette} editMode={editMode} onFieldChange={onFieldChange} />
            </div>
          ) : null,
        };

        return sectionOrder.map(type => sectionMap[type] ?? null);
      })()}

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${tt.divider}`, paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm font-black uppercase tracking-widest" style={{ fontFamily: tt.headingFont, color: tt.textPrimary }}>
            <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </span>
          <p className="text-xs italic" style={{ color: tt.textMuted }}>
            <EditSpan field="tagline" value={design.tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
          <p className="text-xs" style={{ color: tt.textMuted }}>
            <EditSpan field="footerNote" value={design.footerNote ?? `© 2026 ${storeName} · All rights reserved`} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
        </div>
      </footer>
    </div>
  );
}

// Editorial product card helper — token-aware (cardVars + hoverMotion)
function EditorialProductCard({ p, tt, pc, fmtPrice, onProductClick, onAddToCart, onToggleWishlist, wishlist, featured = false, cardVars, hoverMotion, editMode, onFieldChange }: {
  p: RichProduct; tt: TokenTheme; pc: string; fmtPrice: (n: number) => string; featured?: boolean;
  cardVars?: CardStyleVars;
  hoverMotion?: import('framer-motion').TargetAndTransition;
  onProductClick: (p: RichProduct) => void;
  onAddToCart: (p: RichProduct, rect?: DOMRect) => void;
  onToggleWishlist: (id: string) => void;
  wishlist: Set<string>;
  editMode?: boolean; onFieldChange?: (field: string, value: string) => void;
}) {
  const cv = cardVars ?? { background: 'transparent', border: 'none', boxShadow: 'none' };
  const wh = hoverMotion ?? { y: -2 };
  return (
    <motion.div
      className="group cursor-pointer"
      onClick={() => onProductClick(p)}
      whileHover={wh}
      transition={{ duration: 0.22 }}
      style={{ borderRadius: tt.surfaceRadius, ...cv }}>
      <div className="relative overflow-hidden" style={{ aspectRatio: featured ? '16/9' : '3/4', borderRadius: tt.surfaceRadius }}>
        <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        {p.badge && (
          <span className="absolute top-3 left-3 text-[9px] font-black uppercase tracking-wider px-2.5 py-1"
            style={{ background: pc, color: isDark(pc) ? '#fff' : '#000', borderRadius: '999px' }}><StyleOnlySpan field={`products.${p.id}.badgeHtml`} value={p.badge} htmlValue={p.badgeHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>
        )}
        <button
          data-wishlist-btn=""
          onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur flex items-center justify-center transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
          style={{ borderRadius: '50%' }}>
          <Heart className={`w-3.5 h-3.5 ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(p.id) ? undefined : { color: tt.textMuted }} />
        </button>
        {/* Add to cart — slide up on hover */}
        <div className="absolute bottom-0 inset-x-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <button
            onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }}
            className="w-full py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
            style={{ background: pc, borderRadius: tt.btnRadius }}>
            Add to bag
          </button>
        </div>
      </div>
      <div className="mt-3 px-0.5">
        <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: tt.textMuted }}><StyleOnlySpan field={`products.${p.id}.categoryHtml`} value={p.category} htmlValue={p.categoryHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
        <p className={`font-bold truncate ${featured ? 'text-base' : 'text-sm'}`} style={{ color: tt.textPrimary }}><StyleOnlySpan field={`products.${p.id}.nameHtml`} value={p.name} htmlValue={p.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-black" style={{ color: tt.textPrimary }}><StyleOnlySpan field={`products.${p.id}.priceHtml`} value={fmtPrice(p.price)} htmlValue={p.priceHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>
          {p.originalPrice && <span className="text-xs line-through" style={{ color: tt.textMuted }}>{fmtPrice(p.originalPrice)}</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ── MASONRY LAYOUT ────────────────────────────────────────────────────────────
// Pinterest-style columns, varied card heights, image-first
// Personality: pinterest-like, airbnb-like, art/craft/handmade stores

function MasonryLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen, wishlist, onToggleWishlist, onWishlistClick, editMode, onFieldChange }: LayoutProps) {
  const dt = design.designTokens;
  const tt: TokenTheme = dt ? getTokenThemeV2(dt, primaryColor) : getDefaultTokenTheme(primaryColor);

  const motion    = dt?.motion    as MotionLevel    | undefined;
  const elevation = dt?.elevation as ElevationLevel | undefined;
  const spacing   = dt?.spacing;

  const { products = [], collections = [], features = [], testimonials = [],
          tagline, promoBar, trustBadges = [], brandStory, heroTitle, heroSubtitle,
          ctaText, navLinks = [], faq = [], stats = [], newsletter, sectionHeadings } = design;

  const isMobile = device === 'mobile';
  const [selectedCol, setSelectedCol] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth' });

  const pc = primaryColor || '#e60023';
  const pcText = isDark(pc) ? '#ffffff' : '#000000';

  const displayed = selectedCol === 0
    ? products
    : products.filter((_, i) => i % collections.length === selectedCol % collections.length);

  const sectionPy = getSpacingPx(spacing, 56);

  const isInstagram = dt?.personality?.includes('instagram');
  // Instagram: all square; Masonry: varied heights
  const aspectRatios = isInstagram
    ? Array(20).fill('1/1')
    : ['4/5', '3/4', '1/1', '4/3', '3/4', '4/5', '1/1', '3/4', '4/5', '4/3'];

  return (
    <div style={{ background: tt.pageBg, fontFamily: tt.fontFamily }}>
      <TkFontInjector url={tt.googleFontsUrl} />
      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={navLinks} primaryColor={pc} storeName={storeName} onScrollToProducts={scrollToProducts} />

      {/* Sticky wrapper — PromoBar + header stack together, no overlap */}
      <div className="sticky top-0 z-40" style={{ background: tt.headerBg + 'f0' }}>
        {promoBar && <PromoBar text={promoBar} primaryColor={pc} editMode={editMode} onFieldChange={onFieldChange} />}
        {/* ── Header ── */}
        <header className="backdrop-blur-sm"
          style={{ borderBottom: `1px solid ${tt.divider}`, height: '56px' }}>
          <div className="max-w-6xl mx-auto px-5 h-full flex items-center justify-between">
            <span className="font-black text-sm tracking-wider" style={{ fontFamily: tt.headingFont, color: tt.textPrimary }}>
              <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
            </span>
            {!isMobile ? (
              <nav className="flex gap-6">
                {navLinks.map((l, li) => (
                  <a key={li} onClick={scrollToProducts} className="text-xs font-medium cursor-pointer uppercase tracking-wide transition-opacity hover:opacity-50"
                    style={{ color: tt.textSecondary }}>
                    <EditSpan field={`navLinks.${li}`} value={l} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                  </a>
                ))}
              </nav>
            ) : (
              <button onClick={() => setMenuOpen(true)} style={{ color: tt.textSecondary }}><Menu className="w-5 h-5" /></button>
            )}
            <div className="flex items-center gap-1">
              {!isMobile && <button onClick={onSearchOpen} className="p-2 transition-opacity hover:opacity-60" style={{ color: tt.textSecondary }}><Search className="w-4 h-4" /></button>}
              <button data-wishlist-nav="" onClick={onWishlistClick} className="relative p-2 transition-opacity hover:opacity-60" style={{ color: tt.textSecondary }}>
                <Heart className="w-4 h-4" />
                {wishlist.size > 0 && <span className="absolute top-0 right-0 w-3.5 h-3.5 text-[8px] font-bold text-white bg-rose-500 rounded-full flex items-center justify-center">{wishlist.size}</span>}
              </button>
              <button data-cart-btn onClick={onCartClick} className="relative p-2 transition-opacity hover:opacity-60" style={{ color: tt.textSecondary }}>
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && <span className="absolute top-0 right-0 w-3.5 h-3.5 text-[8px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: pc }}>{cartCount}</span>}
              </button>
              <UserProfileMenu buyerEmail={buyerEmail} onUserClick={onUserClick} onWishlistClick={onWishlistClick} wishlistCount={wishlist.size} iconColor={tt.textSecondary} />
            </div>
          </div>
        </header>
      </div>


      {/* Reorderable sections — order driven by designTokens.sections */}
      {(() => {
        const sectionOrder = (design.designTokens?.sections as Array<{ type: string }> | undefined)
          ?.map(s => s.type)
          ?? ['hero', 'collections', 'trust', 'products', 'features', 'testimonials', 'brandStory', 'stats', 'faq', 'newsletter'];

        const sectionMap: Record<string, React.ReactNode> = {
          hero: (
            <section key="hero" data-editor-section="hero" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${Math.round(sectionPy * 0.7)}px`, textAlign: 'center' }}>
              <p className="text-xs uppercase tracking-[0.3em] mb-4" style={{ color: pc }}>
                <EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
              </p>
              <h1 className="font-black leading-tight mx-auto px-6 mb-5"
                style={{ fontFamily: tt.headingFont, color: tt.textPrimary, fontSize: isMobile ? '2rem' : '3.5rem', maxWidth: '16ch' }}>
                <EditSpan field="heroTitle" value={heroTitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
              </h1>
              <p className="text-sm leading-relaxed mx-auto px-6 mb-8" style={{ color: tt.textSecondary, maxWidth: '45ch' }}>
                <EditSpan field="heroSubtitle" value={heroSubtitle ?? ''} editMode={editMode} onFieldChange={onFieldChange} />
              </p>
              <button onClick={editMode ? undefined : scrollToProducts}
                className="inline-flex items-center gap-2 px-7 py-3 text-sm font-bold transition-all hover:opacity-85"
                style={{ background: pc, color: pcText, borderRadius: tt.btnRadius, transition: getMotionTransition(motion) }}>
                <EditSpan field="ctaText" value={ctaText ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine /> <ArrowRight className="w-4 h-4" />
              </button>
            </section>
          ),

          collections: collections.length > 0 ? (
            <div key="collections" data-editor-section="collections">
              {isInstagram ? (
                <div style={{ borderTop: `1px solid ${tt.divider}`, borderBottom: `1px solid ${tt.divider}`, background: tt.surfaceBg }}>
                  <div className="flex gap-4 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {[{ name: 'All', emoji: '✨' }, ...collections].map((c, i) => (
                      <button key={i} onClick={() => setSelectedCol(i)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <div className="p-[2px] rounded-full" style={{ background: selectedCol === i ? 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' : tt.surfaceBorder }}>
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: tt.surfaceBg, border: `2px solid ${tt.surfaceBg}` }}>{c.emoji}</div>
                        </div>
                        <span className="text-[10px] font-medium max-w-[48px] text-center leading-tight truncate" style={{ color: selectedCol === i ? tt.textPrimary : tt.textMuted }}>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ borderTop: `1px solid ${tt.divider}`, borderBottom: `1px solid ${tt.divider}` }}>
                  <div className="max-w-6xl mx-auto px-5 py-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {[{ name: 'All', emoji: '✦' }, ...collections].map((c, i) => (
                      <button key={i} onClick={() => setSelectedCol(i)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-all"
                        style={selectedCol === i ? { background: pc, color: pcText, borderRadius: tt.btnRadius } : { background: tt.surfaceBg, color: tt.textSecondary, border: `1px solid ${tt.surfaceBorder}`, borderRadius: tt.btnRadius }}>
                        <span>{editMode ? <StyleOnlySpan field={`collections.${i}.emojiHtml`} value={c.emoji} htmlValue={c.emojiHtml} editMode={editMode} onFieldChange={onFieldChange} /> : c.emoji}</span>
              <span>{editMode ? <StyleOnlySpan field={`collections.${i}.nameHtml`} value={c.name} htmlValue={c.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /> : c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null,

          trust: trustBadges.length > 0 ? (
            <div key="trust" data-editor-section="trust">
              <TrustBadgesRow badges={trustBadges} primaryColor={pc} device={device} editMode={editMode} onFieldChange={onFieldChange} />
            </div>
          ) : null,

          products: (
            <section key="products" ref={productsRef} data-editor-section="products" className="max-w-6xl mx-auto px-4"
              style={{ paddingTop: `${isInstagram ? 2 : sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
              <div style={isInstagram ? { display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', gap: '2px' } : { columnCount: isMobile ? 2 : 3, columnGap: '12px' }}>
                {displayed.map((p, idx) => (
                  <div key={p.id}
                    style={isInstagram ? { aspectRatio: '1/1', overflow: 'hidden', cursor: 'pointer', position: 'relative' } : { breakInside: 'avoid', marginBottom: '12px', borderRadius: tt.surfaceRadius, overflow: 'hidden', cursor: 'pointer', background: tt.surfaceBg, boxShadow: getElevationShadow(elevation), transition: editMode ? 'none' : getMotionTransition(motion) }}
                    onClick={() => onProductClick(p)}
                    onMouseEnter={e => { if (editMode || isInstagram || motion === 'none') return; (e.currentTarget as HTMLElement).style.transform = getHoverScale(motion); (e.currentTarget as HTMLElement).style.boxShadow = getElevationShadow('raised'); }}
                    onMouseLeave={e => { if (editMode || isInstagram) return; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = getElevationShadow(elevation); }}
                  >
                    <div style={{ aspectRatio: aspectRatios[idx % aspectRatios.length], position: 'relative', overflow: 'hidden' }}>
                      <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
                      {isInstagram ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.45)' }}>
                          <span className="text-white text-xs font-bold">{fmtPrice(p.price)}</span>
                          <button onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }} className="mt-1 px-3 py-1 text-[10px] font-bold rounded-full" style={{ background: pc, color: pcText }}>Shop</button>
                        </div>
                      ) : (
                        <>
                          {p.badge && <span className="absolute top-2 left-2 text-[9px] font-black uppercase px-2 py-0.5" style={{ background: pc, color: pcText, borderRadius: '999px' }}>{p.badge}</span>}
                          <button data-wishlist-btn="" onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }} className="absolute top-2 right-2 w-7 h-7 bg-white/85 backdrop-blur flex items-center justify-center rounded-full shadow transition-all hover:scale-110 active:scale-95">
                            <Heart className={`w-3 h-3 ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(p.id) ? undefined : { color: tt.textMuted }} />
                          </button>
                        </>
                      )}
                    </div>
                    {!isInstagram && (
                      <div className="p-3">
                        <p className="text-xs font-semibold truncate" style={{ color: tt.textPrimary }}><StyleOnlySpan field={`products.${p.id}.nameHtml`} value={p.name} htmlValue={p.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /></p>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black" style={{ color: pc }}><StyleOnlySpan field={`products.${p.id}.priceHtml`} value={fmtPrice(p.price)} htmlValue={p.priceHtml} editMode={editMode} onFieldChange={onFieldChange} /></span>
                            {p.originalPrice && <span className="text-[10px] line-through" style={{ color: tt.textMuted }}>{fmtPrice(p.originalPrice)}</span>}
                          </div>
                          <button onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }} className="w-7 h-7 flex items-center justify-center text-white text-sm font-bold rounded-full transition-all hover:opacity-85 active:scale-95" style={{ background: pc, transition: getMotionTransition(motion) }}>+</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ),

          features: features.length > 0 ? (
            <section key="features" data-editor-section="features" style={{ background: tt.surfaceBg, borderTop: `1px solid ${tt.divider}`, borderBottom: `1px solid ${tt.divider}` }}>
              <div className="max-w-6xl mx-auto px-5" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-4 gap-6'}`}>
                  {features.slice(0, 4).map((f, i) => (
                    <div key={i} className="flex flex-col items-center text-center gap-2 p-5 rounded-2xl"
                      style={{ background: tt.pageBg, border: `1px solid ${tt.surfaceBorder}`, boxShadow: getElevationShadow(elevation) }}>
                      <EmojiIcon emoji={f.icon} size={28} color={pc} strokeWidth={1.5} />
                      <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: tt.textPrimary }}>
                        <EditSpan field={`features.${i}.title`} value={f.title} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                      </h3>
                      <p className="text-xs leading-relaxed" style={{ color: tt.textSecondary }}>
                        <EditSpan field={`features.${i}.description`} value={f.description} editMode={editMode} onFieldChange={onFieldChange} />
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null,

          testimonials: testimonials.length > 0 ? (
            <section key="testimonials" data-editor-section="testimonials">
              <div className="max-w-6xl mx-auto px-5" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
                <h2 className="text-lg font-black mb-8 text-center" style={{ fontFamily: tt.headingFont, color: tt.textPrimary }}>
                  <EditSpan field="sectionHeadings.testimonials" value={sectionHeadings?.testimonials ?? 'What they say'} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                </h2>
                <div style={editMode ? { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' } : { columnCount: isMobile ? 1 : 3, columnGap: '16px' }}>
                  <DraggableList items={testimonials} field="testimonials" editMode={editMode}>
                    {(t, i) => (
                    <div key={i} style={{ breakInside: 'avoid', marginBottom: '16px', padding: '16px', background: tt.surfaceBg, border: `1px solid ${tt.surfaceBorder}`, borderRadius: tt.surfaceRadius, boxShadow: getElevationShadow(elevation) }}>
                      <Stars n={t.rating} />
                      <p className="text-xs italic leading-relaxed mt-2 mb-3" style={{ color: tt.textSecondary }}>
                        &ldquo;<EditSpan field={`testimonials.${i}.text`} value={t.text} editMode={editMode} onFieldChange={onFieldChange} />&rdquo;
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: tt.textPrimary }}>
                        <EditSpan field={`testimonials.${i}.author`} value={t.author} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                      </p>
                      <p className="text-[10px]" style={{ color: tt.textMuted }}>
                        <EditSpan field={`testimonials.${i}.role`} value={t.role} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                      </p>
                    </div>
                    )}
                  </DraggableList>
                </div>
              </div>
            </section>
          ) : null,

          brandStory: brandStory ? (
            <section key="brandStory" data-editor-section="brandStory" style={{ background: alpha(pc, 0.05), borderTop: `1px solid ${tt.divider}` }}>
              <div className="max-w-2xl mx-auto px-5 text-center" style={{ paddingTop: `${sectionPy}px`, paddingBottom: `${sectionPy}px` }}>
                <p className="text-4xl mb-4 opacity-25" style={{ color: pc }}>&ldquo;</p>
                <p className="text-sm leading-relaxed italic" style={{ color: tt.textSecondary }}>
                  <EditSpan field="brandStory" value={brandStory} editMode={editMode} onFieldChange={onFieldChange} />
                </p>
              </div>
            </section>
          ) : null,

          stats: stats && stats.length > 0 ? (
            <StatsRow key="stats" stats={stats} primaryColor={pc} device={device} editMode={editMode} onFieldChange={onFieldChange} />
          ) : null,

          faq: faq && faq.length > 0 ? (
            <FAQSection key="faq" faq={faq} primaryColor={pc} device={device} editMode={editMode} onFieldChange={onFieldChange} sectionHeadings={sectionHeadings} />
          ) : null,

          newsletter: newsletter ? (
            <NewsletterSection key="newsletter" newsletter={newsletter} primaryColor={pc} device={device} editMode={editMode} onFieldChange={onFieldChange} />
          ) : null,
        };

        return sectionOrder.map(type => sectionMap[type] ?? null);
      })()}

      <footer style={{ borderTop: `1px solid ${tt.divider}`, paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm font-black tracking-wider" style={{ fontFamily: tt.headingFont, color: tt.textPrimary }}>
            <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </span>
          <p className="text-xs italic" style={{ color: tt.textMuted }}>
            <EditSpan field="tagline" value={tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
          <p className="text-xs" style={{ color: tt.textMuted }}>
            <EditSpan field="footerNote" value={design.footerNote ?? `© 2026 ${storeName} · All rights reserved`} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── FULLSCREEN LAYOUT ─────────────────────────────────────────────────────────
// Immersive viewport sections, cinematic, one story at a time
// Personality: zara-like, luxury fashion, high-end brands

function FullscreenLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen, wishlist, onToggleWishlist, onWishlistClick, editMode, onFieldChange }: LayoutProps) {
  const dt = design.designTokens;
  const tt: TokenTheme = dt ? getTokenThemeV2(dt, primaryColor) : getDefaultTokenTheme(primaryColor);

  const motion    = dt?.motion    as MotionLevel    | undefined;
  const elevation = dt?.elevation as ElevationLevel | undefined;
  const spacing   = dt?.spacing;

  const { products = [], collections = [], features = [], testimonials = [],
          tagline, promoBar, brandStory, heroTitle, heroSubtitle, ctaText,
          navLinks = [], faq = [], stats = [], newsletter, trustBadges = [], sectionHeadings } = design;

  const isMobile = device === 'mobile';
  const [activeSlide, setActiveSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCol, setSelectedCol] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);

  const pc = primaryColor || '#ffffff';
  const pcText = isDark(pc) ? '#ffffff' : '#000000';
  const isDarkBg = isDark(tt.pageBg);

  // Spotlight products — up to 5 featured
  const spotlightProducts = products.slice(0, Math.min(5, products.length));
  const restProducts = products.slice(5);

  const scrollToSlide = (idx: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const slide = container.children[idx] as HTMLElement;
    slide?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSlide(idx);
  };

  return (
    <div style={{ background: tt.pageBg, fontFamily: tt.fontFamily, color: tt.textPrimary }}>
      <TkFontInjector url={tt.googleFontsUrl} />
      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={navLinks} primaryColor={pc} storeName={storeName} onScrollToProducts={() => scrollToSlide(1)} />

      {/* Fixed top bar — PromoBar stacked above transparent floating header */}
      <div className="fixed top-0 left-0 right-0 z-50" style={{ pointerEvents: 'none' }}>
        {promoBar && <div style={{ pointerEvents: 'auto' }}><PromoBar text={promoBar} primaryColor={pc} /></div>}
        {/* ── Floating header (always on top) ── */}
        <header className="flex items-center justify-between px-6"
          style={{ height: '56px', background: 'transparent', pointerEvents: 'none' }}>
        <span className="text-sm font-black tracking-[0.2em] uppercase pointer-events-auto"
          style={{ fontFamily: tt.headingFont, color: isDarkBg ? '#ffffff' : tt.textPrimary,
            textShadow: isDarkBg ? '0 1px 8px rgba(0,0,0,0.5)' : 'none' }}>{storeName}</span>
        <div className="flex items-center gap-1 pointer-events-auto">
          {!isMobile && (
            <nav className="flex gap-6 mr-3">
              {navLinks.slice(0, 4).map((l, li) => (
                <a key={li} onClick={editMode ? undefined : () => scrollToSlide(1)}
                  className="text-xs uppercase tracking-widest font-medium cursor-pointer transition-opacity hover:opacity-60"
                  style={{ color: isDarkBg ? 'rgba(255,255,255,0.7)' : tt.textSecondary }}><EditSpan field={`navLinks.${li}`} value={l} editMode={editMode} onFieldChange={onFieldChange} singleLine /></a>
              ))}
            </nav>
          )}
          <button data-wishlist-nav="" onClick={onWishlistClick} className="relative p-2 transition-opacity hover:opacity-70"
            style={{ color: isDarkBg ? 'rgba(255,255,255,0.8)' : tt.textSecondary }}>
            <Heart className="w-4 h-4" />
            {wishlist.size > 0 && <span className="absolute top-0 right-0 w-3.5 h-3.5 text-[8px] font-bold text-white bg-rose-500 rounded-full flex items-center justify-center">{wishlist.size}</span>}
          </button>
          <button data-cart-btn onClick={onCartClick} className="relative p-2 transition-opacity hover:opacity-70"
            style={{ color: isDarkBg ? 'rgba(255,255,255,0.8)' : tt.textSecondary }}>
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && <span className="absolute top-0 right-0 w-3.5 h-3.5 text-[8px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: pc }}>{cartCount}</span>}
          </button>
          {isMobile && (
            <button onClick={() => setMenuOpen(true)} className="p-2" style={{ color: isDarkBg ? 'rgba(255,255,255,0.8)' : tt.textSecondary }}><Menu className="w-5 h-5" /></button>
          )}
        </div>
        </header>
      </div>

      {/* ── Slide dot nav (right side) ── */}
      {spotlightProducts.length > 1 && !isMobile && (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
          {spotlightProducts.map((_, i) => (
            <button key={i} onClick={() => scrollToSlide(i)}
              className="transition-all"
              style={{
                width: activeSlide === i ? '8px' : '6px',
                height: activeSlide === i ? '24px' : '6px',
                borderRadius: '999px',
                background: isDarkBg
                  ? (activeSlide === i ? '#ffffff' : 'rgba(255,255,255,0.3)')
                  : (activeSlide === i ? tt.textPrimary : tt.textMuted),
                transition: getMotionTransition(motion),
              }} />
          ))}
        </div>
      )}


      {/* All sections — fully reorderable via designTokens.sections */}
      {(() => {
        const sectionOrder = (design.designTokens?.sections as Array<{ type: string }> | undefined)
          ?.map(s => s.type).filter(t => ['hero','trust','collections','products','features','testimonials','brandStory','stats','faq','newsletter'].includes(t))
          ?? ['hero', 'trust', 'collections', 'products', 'features', 'testimonials', 'brandStory', 'stats', 'faq', 'newsletter'];

        const sectionMap: Record<string, React.ReactNode> = {
          hero: (
            <div key="hero" data-editor-section="hero">
              {/* Slide dot nav */}
              {spotlightProducts.length > 1 && !isMobile && (
                <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
                  {spotlightProducts.map((_, i) => (
                    <button key={i} onClick={() => scrollToSlide(i)} style={{ width: activeSlide === i ? '8px' : '6px', height: activeSlide === i ? '24px' : '6px', borderRadius: '999px', transition: 'all 0.3s', background: isDark(tt.pageBg) ? (activeSlide === i ? '#ffffff' : 'rgba(255,255,255,0.3)') : (activeSlide === i ? tt.textPrimary : tt.textMuted) }} />
                  ))}
                </div>
              )}
              {/* Fullscreen product slides */}
              <div ref={scrollContainerRef}>
                {spotlightProducts.map((p, idx) => (
                  <section key={p.id} data-editor-section="hero" style={{ position: 'relative', height: isMobile ? '85vh' : '100vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}
                    onMouseEnter={() => setActiveSlide(idx)}>
                    <div className="absolute inset-0">
                      <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover" />
                      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${tt.pageBg}f0 0%, ${tt.pageBg}80 40%, transparent 70%)` }} />
                      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: pc }} />
                    </div>
                    <div className="relative w-full max-w-6xl mx-auto px-6 pb-16">
                      <p className="text-xs uppercase tracking-[0.3em] mb-3 font-bold" style={{ color: pc }}>{p.category}</p>
                      <h2 className="font-black leading-tight mb-3" style={{ fontFamily: tt.headingFont, color: tt.textPrimary, fontSize: isMobile ? '2rem' : '4rem', maxWidth: '14ch' }}>{p.name}</h2>
                      <p className="text-sm mb-6" style={{ color: tt.textSecondary }}>{p.description}</p>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-black" style={{ color: tt.textPrimary }}>{fmtPrice(p.price)}</span>
                        {p.originalPrice && <span className="text-lg line-through opacity-50" style={{ color: tt.textMuted }}>{fmtPrice(p.originalPrice)}</span>}
                        <button onClick={e => { const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }} className="px-8 py-3 text-sm font-bold uppercase tracking-widest transition-all hover:opacity-90 active:scale-95" style={{ background: pc, color: isDark(pc) ? '#fff' : '#000', borderRadius: tt.btnRadius }}>Add to Cart</button>
                        <button data-wishlist-btn="" onClick={() => onToggleWishlist(p.id)} className="p-3 rounded-full" style={{ background: tt.surfaceBg }}>
                          <Heart className={`w-5 h-5 ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(p.id) ? undefined : { color: tt.textMuted }} />
                        </button>
                      </div>
                      {spotlightProducts.length > 1 && (
                        <p className="text-xs mt-6 font-bold uppercase tracking-widest" style={{ color: tt.textMuted }}>
                          {String(idx + 1).padStart(2, '0')} / {String(spotlightProducts.length).padStart(2, '0')}
                        </p>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ),

          trust: trustBadges.length > 0 ? (
            <div key="trust" data-editor-section="trust">
              <TrustBadgesRow badges={trustBadges} primaryColor={pc} device={device} editMode={editMode} onFieldChange={onFieldChange} />
            </div>
          ) : null,

          collections: collections.length > 0 ? (
            <div key="collections" data-editor-section="collections" style={{ borderBottom: `1px solid ${tt.divider}`, paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
              <div className="max-w-6xl mx-auto px-5 flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {collections.map((c, i) => (
                  <button key={i} onClick={() => setSelectedCol(i)} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-all"
                    style={selectedCol === i ? { background: tt.textPrimary, color: tt.pageBg, borderRadius: tt.btnRadius } : { background: 'transparent', color: tt.textSecondary, border: `1px solid ${tt.divider}`, borderRadius: tt.btnRadius }}>
                    <span>{editMode ? <StyleOnlySpan field={`collections.${i}.emojiHtml`} value={c.emoji} htmlValue={c.emojiHtml} editMode={editMode} onFieldChange={onFieldChange} /> : c.emoji}</span>
              <span>{editMode ? <StyleOnlySpan field={`collections.${i}.nameHtml`} value={c.name} htmlValue={c.nameHtml} editMode={editMode} onFieldChange={onFieldChange} /> : c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null,

          products: restProducts.length > 0 ? (
            <section key="products" ref={productsRef} data-editor-section="products" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
              <div className="max-w-6xl mx-auto px-5">
                <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-3 gap-6'}`}>
                  {restProducts.map(p => (
                    <div key={p.id} className="group cursor-pointer" onClick={() => onProductClick(p)}>
                      <div className="relative overflow-hidden" style={{ aspectRatio: '3/4', borderRadius: tt.surfaceRadius }}>
                        <ProductImg src={p.image} alt={p.name} fallback={p.imageFallback} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        {p.badge && <span className="absolute top-2 left-2 text-[9px] font-black uppercase px-2 py-0.5" style={{ background: pc, color: isDark(pc) ? '#fff' : '#000', borderRadius: '999px' }}>{p.badge}</span>}
                        <button data-wishlist-btn="" onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }} className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 backdrop-blur shadow">
                          <Heart className={`w-3 h-3 ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : ''}`} style={wishlist.has(p.id) ? undefined : { color: tt.textMuted }} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, getProductImgRect(btn)); }} className="absolute bottom-0 inset-x-0 py-2.5 text-xs font-bold uppercase tracking-widest translate-y-full group-hover:translate-y-0 transition-transform" style={{ background: pc, color: isDark(pc) ? '#fff' : '#000' }}>Add to Cart</button>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-semibold truncate" style={{ color: tt.textPrimary }}>{p.name}</p>
                        <p className="text-sm font-black mt-0.5" style={{ color: pc }}>{fmtPrice(p.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null,

          features: features.length > 0 ? (
            <section key="features" data-editor-section="features" style={{ borderTop: `1px solid ${tt.divider}`, paddingTop: '4rem', paddingBottom: '4rem' }}>
              <div className="max-w-6xl mx-auto px-5">
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-3 gap-10'}`}>
                  <DraggableList items={features} field="features" editMode={editMode}>
                    {(f, i) => (
                    <div key={i} className="flex flex-col gap-3">
                      <div className="h-0.5 w-8" style={{ background: pc }} />
                      <EmojiIcon emoji={f.icon} size={28} color={pc} strokeWidth={1.5} />
                      <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: tt.textPrimary }}>
                        <EditSpan field={`features.${i}.title`} value={f.title} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                      </h3>
                      <p className="text-xs leading-relaxed" style={{ color: tt.textSecondary }}>
                        <EditSpan field={`features.${i}.description`} value={f.description} editMode={editMode} onFieldChange={onFieldChange} />
                      </p>
                    </div>
                    )}
                  </DraggableList>
                </div>
              </div>
            </section>
          ) : null,

          testimonials: testimonials.length > 0 ? (
            <section key="testimonials" data-editor-section="testimonials" style={{ background: tt.surfaceBg, borderTop: `1px solid ${tt.divider}`, paddingTop: '4rem', paddingBottom: '4rem' }}>
              <div className="max-w-6xl mx-auto px-5">
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-5' : 'grid-cols-3 gap-8'}`}>
                  <DraggableList items={testimonials} field="testimonials" editMode={editMode}>
                    {(t, i) => (
                    <div key={i} className="flex flex-col gap-3">
                      <Stars n={t.rating} />
                      <p className="text-sm italic leading-relaxed" style={{ color: tt.textSecondary }}>
                        "<EditSpan field={`testimonials.${i}.text`} value={t.text} editMode={editMode} onFieldChange={onFieldChange} />"
                      </p>
                      <div className="h-px" style={{ background: tt.divider }} />
                      <p className="text-xs font-black uppercase tracking-widest" style={{ color: tt.textPrimary }}>
                        <EditSpan field={`testimonials.${i}.author`} value={t.author} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                      </p>
                      <p className="text-[10px]" style={{ color: tt.textMuted }}>
                        <EditSpan field={`testimonials.${i}.role`} value={t.role} editMode={editMode} onFieldChange={onFieldChange} singleLine />
                      </p>
                    </div>
                    )}
                  </DraggableList>
                </div>
              </div>
            </section>
          ) : null,

          brandStory: brandStory ? (
            <section key="brandStory" data-editor-section="brandStory" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
              <div className="max-w-2xl mx-auto px-5 text-center">
                <p className="text-5xl font-black mb-6 opacity-15" style={{ color: tt.textPrimary }}>&ldquo;</p>
                <p className="text-base leading-relaxed italic" style={{ color: tt.textSecondary }}>
                  <EditSpan field="brandStory" value={brandStory} editMode={editMode} onFieldChange={onFieldChange} />
                </p>
              </div>
            </section>
          ) : null,

          stats: stats && stats.length > 0 ? (
            <div key="stats" data-editor-section="stats">
              <StatsRow stats={stats} primaryColor={pc} device={device} editMode={editMode} onFieldChange={onFieldChange} />
            </div>
          ) : null,

          faq: faq && faq.length > 0 ? (
            <div key="faq" data-editor-section="faq">
              <FAQSection faq={faq} primaryColor={pc} device={device} editMode={editMode} onFieldChange={onFieldChange} sectionHeadings={sectionHeadings} />
            </div>
          ) : null,

          newsletter: newsletter ? (
            <div key="newsletter" data-editor-section="newsletter">
              <NewsletterSection newsletter={newsletter} primaryColor={pc} device={device} editMode={editMode} onFieldChange={onFieldChange} />
            </div>
          ) : null,
        };

        return sectionOrder.map(type => sectionMap[type] ?? null);
      })()}

      <footer style={{ borderTop: `1px solid ${tt.divider}`, paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm font-black uppercase tracking-widest" style={{ fontFamily: tt.headingFont, color: tt.textPrimary }}>
            <EditSpan field="storeName" value={storeName} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </span>
          <p className="text-xs italic" style={{ color: tt.textMuted }}>
            <EditSpan field="tagline" value={design.tagline ?? ''} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
          <p className="text-xs" style={{ color: tt.textMuted }}>
            <EditSpan field="footerNote" value={design.footerNote ?? `© 2026 ${storeName} · All rights reserved`} editMode={editMode} onFieldChange={onFieldChange} singleLine />
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface StorePreviewProps {
  store: Store;
  device: DeviceMode;
  editMode?: boolean;
  /** Pass true from PreviewShell so overlays (sidebar, toast) are clipped inside
   *  the mock browser frame via absolute positioning instead of portaling to body. */
  previewShell?: boolean;
  onFieldChange?: (field: string, value: string, label?: string) => void;
  onFieldPositionChange?: (field: string, offset: { x: number; y: number }) => void;
  onArrayReorder?: (field: string, newItems: unknown[]) => void;
  onPageChange?: (path: string) => void;
  initialPath?: string;
  /** Ref filled by StorePreview — call navigateRef.current(path) to navigate externally. */
  navigateRef?: React.MutableRefObject<((path: string) => void) | null>;
  /** Element style overrides (resize, position changes) to apply to the preview */
  elementOverrides?: Record<string, any>;
}

// ── Store page routing ────────────────────────────────────────────────────────
// Single source of truth for page ↔ URL path mapping.
// To add a new store page:
//   1. Add the StorePage type below (search for "type StorePage")
//   2. Add the entry here: 'pageName': '/url-path'
//   3. Render the page in the StorePreview return (search for "page === 'pageName'")
//   Everything else (URL update, deep-link, SSR via catch-all) works automatically.
const STORE_PAGE_PATHS: Partial<Record<StorePage, string>> = {
  home:     '/',
  cart:     '/cart',
  checkout: '/checkout',
  success:  '/checkout/success',
  wishlist: '/wishlist',
  myorders: '/my-orders',
  // product: handled separately via /product/[slug]
};

function pathToStorePage(path: string): StorePage {
  if (path.startsWith('/product/')) return 'product';
  const entry = Object.entries(STORE_PAGE_PATHS).find(([, p]) => p === path);
  return (entry?.[0] as StorePage | undefined) ?? 'home';
}

function StorePreview({ store, device, editMode, previewShell, onFieldChange, onFieldPositionChange, onArrayReorder, onPageChange, initialPath, navigateRef, elementOverrides }: StorePreviewProps) {
  const [page, setPage] = useState<StorePage>(() => pathToStorePage(initialPath ?? '/'));
  const [showCartSidebar, setShowCartSidebar] = useState(false);

  // Local field position state initialized from design.fieldOffsets
  const [fieldOffsets, setFieldOffsets] = useState<FieldOffsetMap>(() =>
    store.design?.fieldOffsets || {}
  );

  // Callback to update field position (also calls parent callback for persistence)
  const handleFieldPositionChange = useCallback((field: string, offset: { x: number; y: number }) => {
    setFieldOffsets(prev => ({ ...prev, [field]: offset }));
    onFieldPositionChange?.(field, offset);
  }, [onFieldPositionChange]);

  // Expose external navigation via ref (used by PreviewShell address-bar dropdown)
  useEffect(() => {
    if (!navigateRef) return;
    navigateRef.current = (path: string) => {
      setPage(pathToStorePage(path));
      onPageChange?.(path);
    };
    return () => { navigateRef.current = null; };
  }, [navigateRef, onPageChange]);

  // Use cart from context (persisted to localStorage)
  const { cart, cartCount, cartTotal, addToCart, removeFromCart, updateQty, clearCart } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<RichProduct | null>(null);
  const [orderNum] = useState(() => `ORD-${Math.floor(100000 + Math.random() * 900000)}`);
  const [selectedShippingId, setSelectedShippingId] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState('');

  // Auto-close cart sidebar when navigating to cart/checkout page
  useEffect(() => {
    if (page === 'cart' || page === 'checkout') setShowCartSidebar(false);
  }, [page]);

  // Notify parent of page/path changes — uses STORE_PAGE_PATHS as single source of truth
  useEffect(() => {
    if (!onPageChange) return;
    if (page === 'product' && selectedProduct) {
      const slug = selectedProduct.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      onPageChange(`/product/${slug}`);
    } else {
      onPageChange(STORE_PAGE_PATHS[page] ?? '/');
    }
  }, [page, selectedProduct, onPageChange]);

  // Buyer auth state
  const [buyerUser, setBuyerUser] = useState<BuyerUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !session.user.is_anonymous) {
        setBuyerUser({ id: session.user.id, email: session.user.email ?? '' });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user && !session.user.is_anonymous) {
        setBuyerUser({ id: session.user.id, email: session.user.email ?? '' });
      } else {
        setBuyerUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleUserClick = useCallback(() => {
    if (buyerUser) {
      setPage('myorders');
    } else {
      setShowAuthModal(true);
    }
  }, [buyerUser]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setBuyerUser(null);
    setShowAuthModal(false);
    setPage('home');
  }, []);

  let design = store.design as StoreDesign | undefined;
  // Apply advancedOptions.themeColors overrides into designTokens
  const advColors = store.advancedOptions?.themeColors;
  if (design?.designTokens && advColors) {
    const patch: Partial<DesignTokens> = {};
    if (advColors.success) patch.successColor = advColors.success;
    if (advColors.danger)  patch.dangerColor  = advColors.danger;
    if (Object.keys(patch).length) {
      design = { ...design, designTokens: { ...design.designTokens, ...patch } };
    }
  }
  const primaryColor = store.primaryColor || '#10b981';
  const storeName = store.name;
  const currencyCode = store.currency?.code ?? 'USD';
  const fmtPrice = makePriceFmt(currencyCode);
  const shippingSettings = store.shippingSettings;
  const paymentSettings = store.paymentSettings;

  // Compute feature flags from advancedOptions
  const advFeatures = store.advancedOptions?.features;
  const storeFlags: StoreFlags = {
    showWishlist: advFeatures?.wishlist !== false,
    showReviews:  advFeatures?.reviews  !== false,
    uiT: UI_T[LANG_CODE_MAP[store.language ?? ''] ?? 'en'] ?? UI_T.en,
  };

  // Resolve shipping cost for SuccessPage total
  const enabledShipping = (shippingSettings?.methods ?? DEFAULT_SHIPPING_METHODS).filter(m => m.enabled);
  const resolvedShipping = enabledShipping.find(m => m.id === selectedShippingId) ?? enabledShipping[0];
  const freeThreshold = shippingSettings?.freeShippingThreshold;
  const shippingCost = (freeThreshold && cartTotal >= freeThreshold) ? 0 : (resolvedShipping?.price ?? 15000);

  const saveOrder = async (paymentId: string, shippingId: string, customer: { name: string; email: string; whatsapp: string; address: string; city: string; province: string; postal: string }) => {
    const selectedShipping = (shippingSettings?.methods ?? DEFAULT_SHIPPING_METHODS).find(m => m.id === shippingId);
    const paymentMethod = (store.paymentSettings?.methods ?? DEFAULT_PAYMENT_METHODS).find(m => m.id === paymentId);
    const freeThresholdSave = shippingSettings?.freeShippingThreshold;
    const savedShippingCost = (freeThresholdSave && cartTotal >= freeThresholdSave) ? 0 : (selectedShipping?.price ?? 15000);
    const subdomain = store.domain.replace('.storee.io', '');
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderNum,
          storeId: store.id,
          storeSubdomain: subdomain,
          customerName: customer.name,
          customerEmail: customer.email,
          customerWhatsapp: customer.whatsapp,
          shippingAddress: customer.address,
          shippingCity: customer.city,
          shippingProvince: customer.province,
          shippingPostal: customer.postal,
          shippingMethod: selectedShipping?.name ?? '',
          shippingCost: savedShippingCost,
          paymentMethod: paymentMethod?.name ?? paymentId,
          subtotal: cartTotal,
          total: cartTotal + savedShippingCost,
          items: cart.map(({ product: p, qty }) => ({
            id: p.id,
            name: p.name,
            image: p.image,
            price: p.price,
            qty,
            subtotal: p.price * qty,
          })),
          status: 'Processing',
          buyerUserId: buyerUser?.id ?? null,
        }),
      });
    } catch (err) {
      console.error('[order] save failed:', err);
      // Don't block success page if save fails
    }
  };

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [flyItems, setFlyItems] = useState<FlyItem[]>([]);
  const [cartToast, setCartToast] = useState<CartToastItem | null>(null);
  const cartToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Use wishlist from context
  const { wishlist, toggleWishlist } = useWishlist();

  // Apply element style overrides (resize, position, etc.) to DOM
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container || !elementOverrides) return;

    // Clear previous overrides
    container.querySelectorAll<HTMLElement>('[data-overridden]').forEach(el => {
      el.style.removeProperty('width');
      el.style.removeProperty('height');
      el.style.removeProperty('margin-top');
      el.style.removeProperty('margin-left');
      el.style.removeProperty('transform');
      el.style.removeProperty('position');
      el.style.removeProperty('top');
      el.style.removeProperty('left');
      el.style.removeProperty('display');
      el.style.removeProperty('box-sizing');
      el.removeAttribute('data-overridden');
    });

    // Apply overrides from design.elementOverrides
    for (const [selector, styles] of Object.entries(elementOverrides)) {
      const pipeIdx = selector.indexOf('|');
      const tag = selector.slice(0, pipeIdx);
      const className = selector.slice(pipeIdx + 1);
      container.querySelectorAll<HTMLElement>(tag).forEach(el => {
        if ((el.getAttribute('class') || '') === className) {
          if (styles.width) el.style.width = styles.width;
          if (styles.height) el.style.height = styles.height;
          if (styles.marginTop) el.style.marginTop = styles.marginTop;
          if (styles.marginLeft) el.style.marginLeft = styles.marginLeft;
          if (styles.position) el.style.position = styles.position;
          if (styles.top) el.style.top = styles.top;
          if (styles.left) el.style.left = styles.left;
          if (styles.transform) el.style.transform = styles.transform;
          if (styles.display) el.style.display = styles.display;
          el.style.boxSizing = 'border-box';
          el.setAttribute('data-overridden', '1');
        }
      });
    }
  }, [elementOverrides]);

  // Wrap context addToCart with toast and fly animation logic
  const handleAddToCart = useCallback((p: RichProduct, sourceRect?: DOMRect) => {
    addToCart(p); // Call context's addToCart

    // Show cart toast
    if (cartToastTimer.current) clearTimeout(cartToastTimer.current);
    setCartToast({ id: `toast-${Date.now()}`, product: p, cartCount: cartCount + 1 });
    cartToastTimer.current = setTimeout(() => setCartToast(null), 4200);

    if (sourceRect) {
      const flyId = `fly-${Date.now()}-${Math.random()}`;
      setFlyItems(prev => [...prev, {
        id: flyId,
        startX: sourceRect.left + sourceRect.width / 2,
        startY: sourceRect.top + sourceRect.height / 2,
        startW: sourceRect.width,
        startH: sourceRect.height,
        image: p.image,
      }]);
      setTimeout(() => setFlyItems(prev => prev.filter(f => f.id !== flyId)), (FLY_MAX + 0.2) * 1000);
    }
  }, [addToCart, cartCount]);

  const shared = {
    // In edit mode, block product navigation but allow element selection
    onProductClick: (p: RichProduct) => {
      if (editMode) return; // Don't navigate when editing
      setSelectedProduct(p);
      setPage('product');
    },
    onAddToCart: (p: RichProduct, sourceRect?: DOMRect) => handleAddToCart(p, sourceRect),
    onCartClick: () => setShowCartSidebar(true),
    onWishlistClick: () => setPage('wishlist'),
    cartCount,
    onUserClick: handleUserClick,
    buyerEmail: buyerUser?.email ?? null,
    onSearchOpen: () => setShowSearch(true),
    wishlist,
    onToggleWishlist: toggleWishlist,
  };

  // Redirect away from wishlist page if wishlist feature is disabled
  React.useEffect(() => {
    if (!storeFlags.showWishlist && page === 'wishlist') setPage('home');
  }, [storeFlags.showWishlist, page]);

  let content: React.ReactNode;

  const allProducts = (design?.products ?? []) as RichProduct[];

  if (page === 'wishlist') {
    content = <WishlistPage wishlist={wishlist} products={allProducts} onToggleWishlist={toggleWishlist} onAddToCart={addToCart} onProductClick={p => { if (!editMode) { setSelectedProduct(p); setPage('product'); } }} onBack={() => setPage('home')} primaryColor={primaryColor} storeName={storeName} fmtPrice={fmtPrice} layoutStyle={design?.layoutStyle} device={device} />;
  } else if (page === 'product' && selectedProduct) {
    content = <ProductDetailPage product={selectedProduct} primaryColor={primaryColor} storeName={storeName} device={device} fmtPrice={fmtPrice} onBack={() => setPage('home')} onAddToCart={handleAddToCart} onCartClick={() => setPage('cart')} cartCount={cartCount} layoutStyle={design?.layoutStyle} />;
  } else if (page === 'cart') {
    content = <CartPage cart={cart} primaryColor={primaryColor} storeName={storeName} device={device} fmtPrice={fmtPrice} layoutStyle={design?.layoutStyle} onBack={() => setPage('home')} onCheckout={() => setPage('checkout')} onUpdateQty={updateQty} />;
  } else if (page === 'checkout') {
    content = <CheckoutPage cart={cart} primaryColor={primaryColor} storeName={storeName} device={device} fmtPrice={fmtPrice} shippingSettings={shippingSettings} paymentSettings={paymentSettings} layoutStyle={design?.layoutStyle} onBack={() => setPage('cart')} onPlaceOrder={async (pid, sid, customer) => { setSelectedPaymentId(pid); setSelectedShippingId(sid); await saveOrder(pid, sid, customer); setPage('success'); }} />;
  } else if (page === 'success') {
    content = <SuccessPage primaryColor={primaryColor} storeName={storeName} orderNum={orderNum} total={cartTotal + shippingCost} fmtPrice={fmtPrice} paymentSettings={paymentSettings} selectedPaymentId={selectedPaymentId} layoutStyle={design?.layoutStyle} onContinue={() => { clearCart(); setPage('home'); }} buyerUser={buyerUser} onShowAuth={() => setShowAuthModal(true)} onMyOrders={() => setPage('myorders')} />;
  } else if (page === 'myorders' && buyerUser) {
    content = <MyOrdersPage buyerUserId={buyerUser.id} primaryColor={primaryColor} storeName={storeName} storeId={store.id} onBack={() => setPage('home')} fmtPrice={fmtPrice} layoutStyle={design?.layoutStyle} />;
  } else if (!design) {
    content = <FallbackLayout store={store} device={device} onProductClick={shared.onProductClick} onAddToCart={shared.onAddToCart} onCartClick={shared.onCartClick} cartCount={shared.cartCount} onUserClick={shared.onUserClick} buyerEmail={shared.buyerEmail} wishlist={shared.wishlist} onToggleWishlist={shared.onToggleWishlist} onWishlistClick={shared.onWishlistClick} />;
  } else {
    const props: LayoutProps = { storeName, primaryColor, design, device, fmtPrice, ...shared, editMode, onFieldChange };
    // Phase 1: route to new layout types based on layoutType token
    if (design.designTokens || design.designSystem) {
      const layoutType = design.designTokens?.layoutType ?? 'standard';
      if      (layoutType === 'app-like')   content = <AppLikeLayout   {...props} />;
      else if (layoutType === 'editorial')  content = <EditorialLayout  {...props} />;
      else if (layoutType === 'masonry')    content = <MasonryLayout    {...props} />;
      else if (layoutType === 'fullscreen') content = <FullscreenLayout {...props} />;
      else                                  content = <TokenLayout      {...props} />;
    } else {
      switch (design.layoutStyle) {
        case 'minimal':  content = <MinimalLayout {...props} />; break;
        case 'bold':     content = <BoldLayout {...props} />; break;
        case 'elegant':  content = <ElegantLayout {...props} />; break;
        case 'modern':   content = <ModernLayout {...props} />; break;
        case 'playful':  content = <PlayfulLayout {...props} />; break;
        default:         content = <MinimalLayout {...props} />; break;
      }
    }
  }

  const waNumber = paymentSettings?.confirmationWhatsapp;

  // All overlays (CartSidebar, CartToast, modals, WhatsApp) are rendered as
  // SIBLINGS to data-preview-root — not children. This is critical:
  // data-preview-root has overflow:hidden which would clip position:fixed
  // descendants even when those are contained by a transformed ancestor.
  // By placing overlays outside data-preview-root they are only clipped by
  // the scroll-container (canvas previewRef / preview scrollContainerRef),
  // which has transform:translateZ(0) — making fixed elements sticky to the
  // frame rather than the real viewport.
  return (
    <FieldPositionContext.Provider value={{ fieldOffsets, onFieldPositionChange: handleFieldPositionChange, onArrayReorder }}>
    <StoreFlagsCtx.Provider value={storeFlags}>
    <>
      {/* Feature flag CSS — hide elements by data attribute when feature disabled */}
      {!storeFlags.showWishlist && (
        <style>{`[data-preview-root] [data-wishlist-btn]{display:none!important}[data-preview-root] [data-wishlist-nav]{display:none!important}`}</style>
      )}
      {!storeFlags.showReviews && (
        <style>{`[data-preview-root] [data-reviews-section]{display:none!important}`}</style>
      )}
      {/* ── Store content — overflow:hidden clips layout overflow & fly dots ── */}
      <div
        ref={previewContainerRef}
        data-preview-root="1"
        className="relative overflow-hidden"
        onClickCapture={editMode ? (e) => {
          const target = e.target as HTMLElement;
          // Never interfere with the text currently being edited.
          if (target.closest('[contenteditable]')) return;
          // In edit mode the store is a design canvas, not a live site: neutralize
          // EVERY navigation/interactive side-effect — product links, scroll-to-section,
          // CTA buttons, anchor hrefs, accordion toggles, etc. stopPropagation prevents
          // the deeper React onClick handlers (onProductClick/scrollToProducts/…) from
          // firing; preventDefault cancels native anchor navigation.
          const interactive = target.closest('a, button, [role="button"], [role="link"]');
          if (interactive) { e.preventDefault(); e.stopPropagation(); }
        } : undefined}
      >
        {content}

        {/* Cart fly dots — must stay inside overflow:hidden so they are clipped */}
        {flyItems.map(item => (
          <FlyingDot key={item.id} item={item} primaryColor={primaryColor} containerEl={previewContainerRef.current} />
        ))}
      </div>

      {/* ── Overlays — siblings to data-preview-root, not clipped by its overflow ── */}

      {/* Cart Sidebar */}
      <AnimatePresence>
        {showCartSidebar && (
          <CartSidebar
            key="cart-sidebar"
            editMode={editMode}
            previewShell={previewShell}
            cart={cart}
            primaryColor={primaryColor}
            fmtPrice={fmtPrice}
            device={device}
            layoutStyle={design?.layoutStyle}
            onClose={() => setShowCartSidebar(false)}
            onViewCart={() => { setShowCartSidebar(false); setPage('cart'); }}
            onCheckout={() => { setShowCartSidebar(false); setPage('checkout'); }}
            onUpdateQty={updateQty}
          />
        )}
      </AnimatePresence>

      {/* Cart toast — sticky bottom-right of frame (canvas/preview) or viewport (live) */}
      {cartToast && (
        <CartToast
          item={cartToast}
          primaryColor={primaryColor}
          fmtPrice={fmtPrice}
          previewShell={previewShell}
          onClose={() => { setCartToast(null); if (cartToastTimer.current) clearTimeout(cartToastTimer.current); }}
          onViewCart={() => { setCartToast(null); if (cartToastTimer.current) clearTimeout(cartToastTimer.current); setShowCartSidebar(true); }}
        />
      )}

      {/* Auth modal */}
      {showAuthModal && (
        <BuyerAuthModal
          primaryColor={primaryColor}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(user) => { setBuyerUser(user); setShowAuthModal(false); }}
          onLogout={handleLogout}
          buyerEmail={buyerUser?.email ?? null}
        />
      )}

      {/* Search overlay */}
      <SearchOverlay
        open={showSearch}
        onClose={() => setShowSearch(false)}
        products={design?.products ?? []}
        primaryColor={primaryColor}
        onProductClick={(p) => { shared.onProductClick(p); setShowSearch(false); }}
        fmtPrice={fmtPrice}
      />

      {/* WhatsApp floating button */}
      {waNumber && page === 'home' && (
        <a
          href={`https://wa.me/${waNumber.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 hover:scale-110 active:scale-95 transition-transform"
          style={{ background: '#25D366' }}
          title="Chat via WhatsApp"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </a>
      )}
    </>
    </StoreFlagsCtx.Provider>
    </FieldPositionContext.Provider>
  );
}

export default memo(StorePreview);
