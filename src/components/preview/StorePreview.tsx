'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import { ShoppingCart, Heart, Star, Search, ArrowRight, Menu, ArrowLeft, Check, Copy, MessageCircle, MapPin, Phone, Mail, ChevronDown, User, LogOut, Package, Eye, EyeOff } from 'lucide-react';
import type { Store, ShippingSettings, ShippingMethod, PaymentSettings, PaymentMethod } from '../../context/StoreContext';
import { DEFAULT_SHIPPING_METHODS, DEFAULT_PAYMENT_METHODS } from '../../context/StoreContext';
import type { StoreDesign, RichProduct, DesignSystem } from '../../lib/claudeApi';
import { makePriceFmt } from '../../lib/formatCurrency';
import { supabase } from '../../lib/supabase';

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

interface CartItem { product: RichProduct; qty: number; }
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

function FlyingDot({ item, primaryColor }: { item: FlyItem; primaryColor: string }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setActive(true));
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, []);

  // Find the actual cart button in the DOM for an accurate target
  const cartBtn = typeof document !== 'undefined' ? document.querySelector('[data-cart-btn]') : null;
  const cartRect = cartBtn?.getBoundingClientRect();
  const targetX = cartRect ? cartRect.left + cartRect.width / 2 : (typeof window !== 'undefined' ? window.innerWidth - 56 : 1144);
  const targetY = cartRect ? cartRect.top + cartRect.height / 2 : 28;

  // Duration proportional to distance → constant apparent speed
  const dx = targetX - item.startX;
  const dy = targetY - item.startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const dur = Math.min(FLY_MAX, Math.max(FLY_MIN, dist / FLY_SPEED));

  const durS       = `${dur.toFixed(2)}s`;
  const fadeDurS   = `${(dur * 0.35).toFixed(2)}s`;
  const fadeDelayS = `${(dur * 0.65).toFixed(2)}s`;

  return (
    <div
      style={{
        position: 'fixed',
        left: active ? targetX : item.startX,
        top: active ? targetY : item.startY,
        width: active ? '8px' : `${item.startW}px`,
        height: active ? '8px' : `${item.startH}px`,
        opacity: active ? 0 : 1,
        transform: 'translate(-50%, -50%)',
        transition: [
          `left ${durS} cubic-bezier(0.25,0.6,0.35,1)`,
          `top ${durS} cubic-bezier(0.25,0.6,0.35,1)`,
          `width ${durS} linear`,
          `height ${durS} linear`,
          `opacity ${fadeDurS} ease-in ${fadeDelayS}`,
        ].join(', '),
        zIndex: 99999,
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.2)' : '0 8px 32px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
      }}
    >
      {item.image
        ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{ width: '100%', height: '100%', background: primaryColor }} />
      }
    </div>
  );
}

// ── Image fallback ────────────────────────────────────────────────────────────

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3Crect width='4' height='3' fill='%23f1f5f9'/%3E%3C/svg%3E";

function ProductImg({ src, alt, className, style }: { src?: string; alt?: string; className?: string; style?: CSSProperties }) {
  return (
    <img
      src={src || PLACEHOLDER}
      alt={alt || ''}
      className={className}
      style={style}
      onError={e => { e.currentTarget.src = PLACEHOLDER; }}
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
  const handleAdd = () => {
    const rect = imgRef.current?.getBoundingClientRect();
    for (let i = 0; i < qty; i++) onAddToCart(product, i === 0 ? rect : undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };
  return (
    <div className="min-h-screen" style={{ background: t.pageBg, fontFamily: t.fontFamily }}>
      <header className="px-5 h-14 flex items-center justify-between sticky top-0 z-40" style={{ background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}` }}>
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors" style={{ color: t.textSecondary }}><ArrowLeft className="w-4 h-4" /> Back</button>
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
          <div className="flex items-center gap-1.5">
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
              {added ? '✓ Added to Cart!' : 'Add to Cart'}
            </button>
          </div>
          <div className="pt-4 space-y-2 text-sm" style={{ borderTop: `1px solid ${t.divider}` }}>
            {[['Availability', 'In Stock', t.successText], ['Delivery', '2–4 business days', t.textPrimary], ['Returns', 'Free 30-day returns', t.textPrimary]].map(([k, v, clr]) => (
              <div key={k} className="flex justify-between"><span style={{ color: t.textMuted }}>{k}</span><span className="font-semibold" style={{ color: clr }}>{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CartPage({ cart, primaryColor, storeName, device, onBack, onCheckout, onUpdateQty, fmtPrice, shippingSettings, layoutStyle }: {
  cart: CartItem[]; primaryColor: string; storeName: string; device: DeviceMode; fmtPrice: (n: number) => string;
  shippingSettings?: ShippingSettings; layoutStyle?: string;
  onBack: () => void; onCheckout: (shippingId: string) => void; onUpdateQty: (id: string, delta: number) => void;
}) {
  const enabledMethods = (shippingSettings?.methods ?? DEFAULT_SHIPPING_METHODS).filter(m => m.enabled);
  const shippingMethods: ShippingMethod[] = enabledMethods.length > 0 ? enabledMethods : [
    { id: 'flat', name: 'Standard Shipping', price: 15000, estimatedDays: '2–3 days', enabled: true, icon: '📦' }
  ];
  const [selectedId, setSelectedId] = useState(shippingMethods[0]?.id ?? '');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const selectedMethod = shippingMethods.find(m => m.id === selectedId) ?? shippingMethods[0];
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const freeThreshold = shippingSettings?.freeShippingThreshold;
  const shippingCost = (freeThreshold && subtotal >= freeThreshold) ? 0 : (selectedMethod?.price ?? 0);
  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal + shippingCost - discount;
  const isMobile = device === 'mobile';
  const t = getCommerceTheme(primaryColor, layoutStyle);

  return (
    <div className="min-h-screen" style={{ background: t.pageBg, fontFamily: t.fontFamily }}>
      <header className="px-5 h-14 flex items-center justify-between sticky top-0 z-40 shadow-sm" style={{ background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}` }}>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium transition-colors" style={{ color: t.textSecondary }}><ArrowLeft className="w-4 h-4" /> Continue Shopping</button>
        <span className="text-sm font-bold" style={{ color: t.textPrimary }}>Cart ({cart.reduce((s, i) => s + i.qty, 0)})</span>
        <div className="w-28" />
      </header>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <ShoppingCart className="w-12 h-12" style={{ color: t.textMuted }} />
          <p className="text-sm font-medium" style={{ color: t.textSecondary }}>Your cart is empty</p>
          <button onClick={onBack} className="px-6 py-2.5 text-sm font-semibold" style={{ background: t.primary, color: t.primaryContrast, borderRadius: t.btnRadius }}>Start Shopping</button>
        </div>
      ) : (
        <div className={`max-w-4xl mx-auto px-4 py-6 ${isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-[1fr_320px] gap-8 items-start'}`}>

          {/* Left: items + shipping + promo */}
          <div className="space-y-4">
            {/* Items */}
            <div className="overflow-hidden shadow-sm" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
                <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>Items ({cart.reduce((s, i) => s + i.qty, 0)})</h3>
              </div>
              <div>
                {cart.map(({ product: p, qty }) => (
                  <div key={p.id} className="flex gap-4 px-5 py-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: t.inputBg }}>
                      <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: t.textMuted }}>{p.category}</p>
                      <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>{p.name}</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: t.primary }}>{fmtPrice(p.price)}</p>
                    </div>
                    <div className="flex flex-col items-end justify-between flex-shrink-0">
                      <span className="text-sm font-bold" style={{ color: t.textPrimary }}>{fmtPrice(p.price * qty)}</span>
                      <div className="flex items-center overflow-hidden mt-2" style={{ border: `1px solid ${t.surfaceBorder}`, borderRadius: '8px' }}>
                        <button onClick={() => onUpdateQty(p.id, -1)} className="w-8 h-8 flex items-center justify-center text-base font-medium" style={{ color: t.textSecondary }}>−</button>
                        <span className="w-8 text-center text-xs font-bold" style={{ color: t.textPrimary }}>{qty}</span>
                        <button onClick={() => onUpdateQty(p.id, 1)} className="w-8 h-8 flex items-center justify-center text-base font-medium" style={{ color: t.textSecondary }}>+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping method selector */}
            <div className="shadow-sm overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
                <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>Shipping Method</h3>
              </div>
              <div className="p-4 space-y-2">
                {shippingMethods.map(method => {
                  const isFreeByThreshold = freeThreshold && subtotal >= freeThreshold;
                  const cost = isFreeByThreshold ? 0 : method.price;
                  const isSelected = selectedId === method.id;
                  return (
                    <label key={method.id} className="flex items-center gap-4 p-4 cursor-pointer transition-all" style={{ borderRadius: t.inputRadius, border: `2px solid ${isSelected ? t.primary : t.surfaceBorder}`, background: isSelected ? alpha(t.primary, 0.04) : t.surfaceBg }}>
                      <input type="radio" name="shipping" value={method.id} checked={isSelected} onChange={() => setSelectedId(method.id)} className="sr-only" />
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

            {/* Promo code */}
            <div className="shadow-sm p-4" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
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
            <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span style={{ color: t.textSecondary }}>Subtotal</span><span className="font-medium" style={{ color: t.textPrimary }}>{fmtPrice(subtotal)}</span></div>
              <div className="flex justify-between">
                <span style={{ color: t.textSecondary }}>Shipping</span>
                <span className="font-medium">{shippingCost === 0 ? <span className="font-semibold" style={{ color: t.successText }}>FREE</span> : <span style={{ color: t.textPrimary }}>{fmtPrice(shippingCost)}</span>}</span>
              </div>
              {selectedMethod && (
                <p className="text-xs" style={{ color: t.textMuted }}>{selectedMethod.icon} {selectedMethod.name} · {selectedMethod.estimatedDays}</p>
              )}
              {discount > 0 && (
                <div className="flex justify-between" style={{ color: t.successText }}><span>Promo discount</span><span className="font-medium">−{fmtPrice(discount)}</span></div>
              )}
            </div>
            <div className="pt-3 flex justify-between font-bold text-sm" style={{ borderTop: `1px solid ${t.divider}` }}>
              <span style={{ color: t.textPrimary }}>Total</span>
              <span style={{ color: t.primary }}>{fmtPrice(total)}</span>
            </div>
            <button
              onClick={() => onCheckout(selectedId)}
              className="w-full py-3.5 text-sm font-bold hover:opacity-90 transition-opacity mt-1"
              style={{ background: t.primary, color: t.primaryContrast, borderRadius: t.btnRadius }}
            >
              Proceed to Checkout →
            </button>
            <p className="text-[10px] text-center" style={{ color: t.textMuted }}>🔒 Secure &amp; protected transaction</p>
          </div>
        </div>
      )}
    </div>
  );
}

const INDONESIAN_PROVINCES = ['Aceh','Bali','Banten','Bengkulu','DI Yogyakarta','DKI Jakarta','Gorontalo','Jambi','Jawa Barat','Jawa Tengah','Jawa Timur','Kalimantan Barat','Kalimantan Selatan','Kalimantan Tengah','Kalimantan Timur','Kalimantan Utara','Kepulauan Bangka Belitung','Kepulauan Riau','Lampung','Maluku','Maluku Utara','Nusa Tenggara Barat','Nusa Tenggara Timur','Papua','Papua Barat','Riau','Sulawesi Barat','Sulawesi Selatan','Sulawesi Tengah','Sulawesi Tenggara','Sulawesi Utara','Sumatera Barat','Sumatera Selatan','Sumatera Utara'];

const PAYMENT_ICONS: Record<string, string> = { bank_transfer: '🏦', qris: '📱', cod: '💵', ewallet: '👛', gopay: '🟢', ovo: '🟣', dana: '🔵' };

function CheckoutPage({ cart, primaryColor, storeName, device, onBack, onPlaceOrder, fmtPrice, shippingSettings, paymentSettings, selectedShippingId, layoutStyle }: {
  cart: CartItem[]; primaryColor: string; storeName: string; device: DeviceMode; fmtPrice: (n: number) => string;
  shippingSettings?: ShippingSettings; paymentSettings?: PaymentSettings; selectedShippingId: string; layoutStyle?: string;
  onBack: () => void; onPlaceOrder: (paymentId: string, customer: { name: string; email: string; whatsapp: string; address: string; city: string; province: string; postal: string }) => void;
}) {
  const [form, setForm] = useState({ email: '', whatsapp: '', name: '', address: '', city: '', province: '', postal: '' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const enabledPayments = (paymentSettings?.methods ?? DEFAULT_PAYMENT_METHODS).filter(m => m.enabled);
  const paymentMethods: PaymentMethod[] = enabledPayments.length > 0 ? enabledPayments : [
    { id: 'bca', name: 'Transfer BCA', type: 'bank_transfer', enabled: true, bankName: 'BCA', accountNumber: '1234567890', accountHolder: 'Nama Toko' }
  ];
  const [selectedPayId, setSelectedPayId] = useState(paymentMethods[0]?.id ?? '');
  useEffect(() => { if (!selectedPayId && paymentMethods.length) setSelectedPayId(paymentMethods[0].id); }, []);

  const allShipping = shippingSettings?.methods ?? DEFAULT_SHIPPING_METHODS;
  const selectedShipping = allShipping.find(m => m.id === selectedShippingId) ?? allShipping.find(m => m.enabled);
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const freeThreshold = shippingSettings?.freeShippingThreshold;
  const shippingCost = (freeThreshold && subtotal >= freeThreshold) ? 0 : (selectedShipping?.price ?? 15000);
  const total = subtotal + shippingCost;
  const isMobile = device === 'mobile';
  const selectedPayment = paymentMethods.find(m => m.id === selectedPayId);
  const t = getCommerceTheme(primaryColor, layoutStyle);
  const inpStyle: CSSProperties = { background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: t.inputRadius, color: t.textPrimary, '--tw-ring-color': alpha(t.primary, 0.3) } as CSSProperties;
  const lblStyle: CSSProperties = { color: t.textSecondary, fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px', display: 'block' };

  return (
    <div className="min-h-screen" style={{ background: t.pageBg, fontFamily: t.fontFamily }}>
      <header className="px-5 h-14 flex items-center justify-between sticky top-0 z-40 shadow-sm" style={{ background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}` }}>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium transition-colors" style={{ color: t.textSecondary }}><ArrowLeft className="w-4 h-4" /> Cart</button>
        <span className="text-sm font-bold" style={{ color: t.textPrimary }}>{storeName}</span>
        <div className="w-28" />
      </header>

      {/* Progress bar */}
      <div className="px-5 py-3" style={{ background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}` }}>
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {['Cart', 'Checkout', 'Confirmation'].map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-shrink-0">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: i <= 1 ? t.primary : t.divider, color: i <= 1 ? t.primaryContrast : t.textMuted }}>{i + 1}</div>
              <span className="text-xs font-medium" style={{ color: i <= 1 ? t.textPrimary : t.textMuted }}>{step}</span>
              {i < 2 && <div className="w-8 h-px mx-1" style={{ background: t.divider }} />}
            </div>
          ))}
        </div>
      </div>

      <div className={`max-w-4xl mx-auto px-4 py-6 ${isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-[1fr_300px] gap-8 items-start'}`}>

        {/* Left: form sections */}
        <div className="space-y-4">

          {/* Contact */}
          <div className="shadow-sm overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: alpha(t.primary, 0.1) }}>
                <Mail className="w-3.5 h-3.5" style={{ color: t.primary }} />
              </div>
              <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>Contact Information</h3>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label style={lblStyle}>Email</label>
                <input type="email" className="w-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent" style={inpStyle} value={form.email} onChange={set('email')} placeholder="name@email.com" />
              </div>
              <div className="col-span-2">
                <label style={lblStyle}>WhatsApp</label>
                <div className="flex items-center overflow-hidden focus-within:ring-2 focus-within:border-transparent" style={{ border: `1px solid ${t.inputBorder}`, borderRadius: t.inputRadius, '--tw-ring-color': alpha(t.primary, 0.3) } as CSSProperties}>
                  <span className="px-3 py-2.5 text-xs font-medium" style={{ background: t.inputBg, color: t.textMuted, borderRight: `1px solid ${t.inputBorder}` }}>+62</span>
                  <input type="tel" className="flex-1 px-3 py-2.5 text-sm outline-none" style={{ background: t.inputBg, color: t.textPrimary }} value={form.whatsapp} onChange={set('whatsapp')} placeholder="81234567890" />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery address */}
          <div className="shadow-sm overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: alpha(t.primary, 0.1) }}>
                <MapPin className="w-3.5 h-3.5" style={{ color: t.primary }} />
              </div>
              <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>Shipping Information</h3>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label style={lblStyle}>Full Name</label>
                <input className="w-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent" style={inpStyle} value={form.name} onChange={set('name')} placeholder="Recipient full name" />
              </div>
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
            </div>
            {/* Selected shipping summary */}
            {selectedShipping && (
              <div className="mx-5 mb-4 px-4 py-3 flex items-center gap-3" style={{ borderRadius: t.inputRadius, border: `1px solid ${t.surfaceBorder}`, background: t.inputBg }}>
                <span className="text-base">{selectedShipping.icon}</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold" style={{ color: t.textPrimary }}>{selectedShipping.name}</p>
                  <p className="text-[10px]" style={{ color: t.textMuted }}>Est: {selectedShipping.estimatedDays}</p>
                </div>
                <span className="text-xs font-bold" style={{ color: t.primary }}>
                  {shippingCost === 0 ? 'FREE' : fmtPrice(shippingCost)}
                </span>
              </div>
            )}
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
        </div>

        {/* Right: order summary */}
        <div className="shadow-sm p-5 space-y-3" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
          <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>Order Summary ({cart.reduce((s, i) => s + i.qty, 0)} items)</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cart.map(({ product: p, qty }) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: t.inputBg }}>
                  <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover" />
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
            <div className="flex justify-between font-bold pt-1.5" style={{ borderTop: `1px solid ${t.divider}` }}>
              <span style={{ color: t.textPrimary }}>Total</span>
              <span style={{ color: t.primary }}>{fmtPrice(total)}</span>
            </div>
          </div>
          <button
            onClick={() => onPlaceOrder(selectedPayId, form)}
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
          <h1 className="text-2xl font-black mb-1" style={{ color: t.textPrimary }}>Order Received! 🎉</h1>
          <p className="text-sm" style={{ color: t.textSecondary }}>Thank you for shopping at <span className="font-bold" style={{ color: t.primary }}>{storeName}</span></p>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: t.inputBg }}>
            <span className="text-xs" style={{ color: t.textMuted }}>Order #:</span>
            <span className="text-xs font-mono font-bold" style={{ color: t.textPrimary }}>{orderNum}</span>
          </div>
        </div>

        {/* Payment instructions */}
        {payment && (
          <div className="shadow-sm mb-4 overflow-hidden" style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: t.surfaceRadius }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${t.divider}` }}>
              <span className="text-xl">{PAYMENT_ICONS[payment.id] ?? PAYMENT_ICONS[payment.type] ?? '💳'}</span>
              <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>Payment Instructions</h3>
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

function PromoBar({ text, primaryColor }: { text: string; primaryColor: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (!text || dismissed) return null;
  const dark = isDark(primaryColor);
  return (
    <div className="flex items-center justify-center gap-3 px-8 py-2.5 relative" style={{ background: primaryColor }}>
      <p className="text-xs font-semibold text-center" style={{ color: dark ? '#fff' : '#111' }}>{text}</p>
      <button onClick={() => setDismissed(true)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity text-sm font-bold" style={{ color: dark ? '#fff' : '#111' }}>✕</button>
    </div>
  );
}

function StatsRow({ stats, primaryColor, dark = false, device }: { stats: Array<{ value: string; label: string }>; primaryColor: string; dark?: boolean; device?: DeviceMode }) {
  const isMobile = device === 'mobile';
  if (!stats?.length) return null;
  return (
    <div className={`border-y ${dark ? 'border-white/10' : 'border-gray-100'}`}>
      <div className="max-w-6xl mx-auto px-5">
        <div className={`grid grid-cols-3 divide-x ${dark ? 'divide-white/10' : 'divide-gray-100'}`}>
          {stats.map((s, i) => (
            <div key={i} className={`text-center px-4 ${isMobile ? 'py-5' : 'py-8'}`}>
              <p className={`font-black ${isMobile ? 'text-2xl' : 'text-3xl'}`} style={{ color: primaryColor }}>{s.value}</p>
              <p className={`text-xs mt-1 font-medium tracking-wide ${dark ? 'text-white/50' : 'text-gray-500'}`}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrustBadgesRow({ badges, primaryColor, dark = false, device }: { badges: Array<{ icon: string; text: string }>; primaryColor: string; dark?: boolean; device?: DeviceMode }) {
  const isMobile = device === 'mobile';
  if (!badges?.length) return null;
  return (
    <div className={`${dark ? 'border-white/10' : 'border-gray-100'} border-y`}>
      <div className={dark ? '' : 'bg-gray-50/70'}>
        <div className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-2.5 gap-4' : 'py-3.5 gap-6'} flex items-center justify-center flex-wrap`}>
          {badges.map((b, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className={isMobile ? 'text-sm' : 'text-base'}>{b.icon}</span>
              <span className={`${isMobile ? 'text-[11px]' : 'text-xs'} font-semibold ${dark ? 'text-white/60' : 'text-gray-600'}`}>{b.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FAQSection({ faq, primaryColor, device, dark = false, elegant = false }: {
  faq: Array<{ q: string; a: string }>;
  primaryColor: string;
  device: DeviceMode;
  dark?: boolean;
  elegant?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isMobileInFaq = device === 'mobile';
  if (!faq?.length) return null;
  return (
    <section className={isMobileInFaq ? 'py-8' : 'py-14'} style={dark ? { background: 'rgba(255,255,255,0.03)' } : elegant ? { background: '#fdfcf8' } : {}}>
      <div className="max-w-3xl mx-auto px-5">
        <div className="text-center mb-9">
          {elegant ? (
            <>
              <p className="text-[10px] tracking-[0.35em] mb-3" style={{ color: primaryColor }}>QUESTIONS</p>
              <h2 className="text-xl font-bold tracking-wide" style={{ color: '#2a2420' }}>Frequently Asked</h2>
              <div className="w-12 h-px mx-auto mt-4" style={{ background: primaryColor }} />
            </>
          ) : (
            <h2 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Frequently Asked Questions</h2>
          )}
        </div>
        <div className="space-y-2">
          {faq.map((item, i) => (
            <div key={i} className={`rounded-2xl overflow-hidden border transition-all cursor-pointer ${dark ? 'border-white/10 bg-white/5' : elegant ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                <span className={`text-sm font-semibold pr-4 ${dark ? 'text-white' : elegant ? 'text-[#2a2420]' : 'text-gray-900'}`}>{item.q}</span>
                <span className="text-xl flex-shrink-0 transition-transform duration-200 font-light" style={{ color: primaryColor, display: 'inline-block', transform: openIndex === i ? 'rotate(45deg)' : 'none' }}>+</span>
              </button>
              {openIndex === i && (
                <div className={`px-5 pb-5 text-sm leading-relaxed ${dark ? 'text-white/60' : elegant ? 'text-[#6b5e52]' : 'text-gray-500'}`} style={elegant ? { fontFamily: 'system-ui' } : {}}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSection({ newsletter, primaryColor, dark = false, elegant = false, device }: {
  newsletter: { headline: string; subtext: string };
  primaryColor: string;
  dark?: boolean;
  elegant?: boolean;
  device?: DeviceMode;
}) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const isMobile = device === 'mobile';
  if (!newsletter) return null;
  const inverted = dark || elegant;
  return (
    <section className={isMobile ? 'py-8' : 'py-14'}>
      <div className="max-w-xl mx-auto px-5">
        <div className={`rounded-3xl ${isMobile ? 'p-5' : 'p-8'} text-center`} style={
          dark ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' } :
          elegant ? { background: '#2a2420' } :
          { background: `linear-gradient(135deg, ${alpha(primaryColor, 0.09)}, ${alpha(primaryColor, 0.04)})`, border: `1px solid ${alpha(primaryColor, 0.12)}` }
        }>
          <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mb-3`} style={{ color: inverted ? '#fff' : '#111' }}>{newsletter.headline}</p>
          <p className={`text-sm ${isMobile ? 'mb-5' : 'mb-7'} leading-relaxed ${inverted ? 'text-white/60' : 'text-gray-500'}`}>{newsletter.subtext}</p>
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
                <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover" />
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
          <span className="font-bold text-sm" style={{ color: t.textPrimary }}>Wishlist</span>
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
                  <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  {p.badge && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: t.primary }}>
                      {p.badge}
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                    className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95"
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
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        onAddToCart(p, r);
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

function MinimalLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen, wishlist, onToggleWishlist, onWishlistClick }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks = [], products = [], collections = [], features = [], testimonials = [], tagline, faq = [], stats = [], promoBar, newsletter, trustBadges = [], brandStory } = design;
  const btnText = isDark(primaryColor) ? '#fff' : '#111';
  const isMobile = device === 'mobile';
  const [selectedCol, setSelectedCol] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth' });
  const displayed = selectedCol === 0 ? products : products.filter((_, i) => i % 2 === selectedCol - 1);

  return (
    <div className="bg-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={navLinks} primaryColor={primaryColor} storeName={storeName} onScrollToProducts={scrollToProducts} />

      {/* Header */}
      <header className="bg-white/96 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-15 flex items-center justify-between" style={{ height: '56px' }}>
          <span className="text-sm font-black tracking-[0.18em] uppercase text-gray-900">{storeName}</span>
          {!isMobile ? (
            <nav className="flex gap-8">
              {navLinks.map(l => <a key={l} onClick={scrollToProducts} className="text-xs uppercase tracking-wider text-gray-400 hover:text-gray-900 transition-colors font-medium cursor-pointer">{l}</a>)}
            </nav>
          ) : (
            <button onClick={() => setMenuOpen(true)} className="p-2 text-gray-600 rounded-lg"><Menu className="w-5 h-5" /></button>
          )}
          <div className="flex items-center gap-1">
            {!isMobile && <button onClick={onSearchOpen} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"><Search className="w-4 h-4" /></button>}
            <button onClick={onWishlistClick} className="relative p-2 text-gray-400 hover:text-gray-700 rounded-lg transition-colors">
              <Heart className="w-4 h-4" />
              {wishlist.size > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center bg-rose-500">{wishlist.size}</span>}
            </button>
            <button data-cart-btn onClick={onCartClick} className="relative p-2 text-gray-400 hover:text-gray-700 rounded-lg transition-colors">
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: primaryColor }}>{cartCount}</span>}
            </button>
            <UserProfileMenu buyerEmail={buyerEmail} onUserClick={onUserClick} onWishlistClick={onWishlistClick} wishlistCount={wishlist.size} iconColor="#9ca3af" hoverClass="hover:text-gray-700 rounded-lg" />
          </div>
        </div>
      </header>

      {promoBar && <PromoBar text={promoBar} primaryColor={primaryColor} />}

      {/* Hero */}
      {isMobile ? (
        <section style={{ background: '#f5f4f0' }}>
          {/* Mobile: image first, text below */}
          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden">
              <ProductImg src={products[0]?.image} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-4 right-4 bg-white rounded-2xl px-3.5 py-2.5 shadow-lg">
              <p className="text-[9px] text-gray-400 uppercase tracking-wider">{products[0]?.category}</p>
              <p className="text-xs font-bold text-gray-900 max-w-[100px] truncate">{products[0]?.name}</p>
              <p className="text-xs font-black mt-0.5" style={{ color: primaryColor }}>{fmtPrice(products[0]?.price ?? 0)}</p>
            </div>
          </div>
          <div className="px-5 py-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-4 flex items-center gap-1.5" style={{ color: primaryColor }}>
              {collections[0]?.emoji} {tagline}
            </p>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-gray-900 mb-4">{heroTitle}</h1>
            <p className="text-sm text-gray-500 leading-relaxed mb-7">{heroSubtitle}</p>
            <button onClick={scrollToProducts} className="w-full py-3.5 text-sm font-bold uppercase tracking-wider rounded-full" style={{ background: primaryColor, color: btnText }}>
              {ctaText}
            </button>
          </div>
        </section>
      ) : (
        <section style={{ background: '#f5f4f0' }}>
          <div className="max-w-6xl mx-auto px-5 py-16 grid grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-5 flex items-center gap-1.5" style={{ color: primaryColor }}>
                {collections[0]?.emoji} {tagline}
              </p>
              <h1 className="text-5xl font-black leading-[1.02] tracking-tight text-gray-900 mb-5">{heroTitle}</h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-sm">{heroSubtitle}</p>
              <div className="flex items-center gap-4">
                <button onClick={scrollToProducts} className="px-7 py-3 text-xs font-bold uppercase tracking-wider rounded-full hover:opacity-85 transition-opacity" style={{ background: primaryColor, color: btnText }}>
                  {ctaText}
                </button>
                <button onClick={scrollToProducts} className="text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1.5">
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                <ProductImg src={products[0]?.image} alt="" className="w-full h-full object-cover" />
              </div>
              {/* Floating product card */}
              <div className="absolute -bottom-6 -left-8 bg-white rounded-2xl p-4 shadow-2xl border border-gray-50/80" style={{ maxWidth: '190px' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <ProductImg src={products[1]?.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider">{products[1]?.category}</p>
                    <p className="text-xs font-bold text-gray-900 truncate">{products[1]?.name}</p>
                    <p className="text-xs font-black mt-0.5" style={{ color: primaryColor }}>{fmtPrice(products[1]?.price ?? 0)}</p>
                  </div>
                </div>
              </div>
              {/* Collection pill */}
              <div className="absolute -top-4 -right-4 bg-white rounded-full px-4 py-2 shadow-xl border border-gray-100 text-xs font-bold text-gray-700">
                {collections[1]?.emoji} {collections[1]?.name}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Collections strip */}
      <div className="border-y border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-3 flex gap-2.5 overflow-x-auto">
          {collections.map((c, i) => (
            <button key={i} onClick={() => setSelectedCol(i)} className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wide uppercase transition-all"
              style={selectedCol === i ? { background: primaryColor, color: btnText } : { background: '#f3f2ef', color: '#555' }}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>
      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} device={device} />}

      {/* Products */}
      <section ref={productsRef} className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-14'}`}>
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400 mb-1.5">Curated Selection</p>
            <h2 className="text-xl font-black tracking-tight text-gray-900">Featured Products</h2>
          </div>
          <button onClick={scrollToProducts} className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:gap-2.5 transition-all" style={{ color: primaryColor }}>
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className={`grid ${gridCols(device)} gap-4`}>
          {displayed.map(p => (
            <div key={p.id} className="group cursor-pointer" onClick={() => onProductClick(p)}>
              <div className="relative overflow-hidden rounded-2xl bg-gray-100 mb-3" style={{ aspectRatio: isMobile ? '3/4' : '3/4' }}>
                <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white" style={{ background: primaryColor }}>{p.badge}</span>
                )}
                {/* Quick add — always visible on mobile, hover on desktop */}
                <div className={`absolute bottom-0 inset-x-0 p-3 transition-transform duration-200 ${isMobile ? '' : 'translate-y-full group-hover:translate-y-0'}`}>
                  <button
                    onClick={e => { e.stopPropagation(); const _btn = e.currentTarget as HTMLElement; const _card = _btn.closest('.group') as HTMLElement ?? _btn; const _wrap = _card.querySelector('.relative.overflow-hidden, .relative.aspect-square, .relative.rounded-2xl') as HTMLElement | null; const _img = (_wrap ?? _card).querySelector('img') as HTMLElement | null; onAddToCart(p, (_img ?? _wrap ?? _btn).getBoundingClientRect()); }}
                    className="w-full py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl text-white shadow-lg"
                    style={{ background: primaryColor }}
                  >
                    + Add to Cart
                  </button>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                  className={`absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow transition-all hover:scale-110 active:scale-95 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : 'text-gray-400'}`} />
                </button>
              </div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">{p.category}</p>
              <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm font-black text-gray-900">{fmtPrice(p.price)}</span>
                {p.originalPrice && <span className="text-xs text-gray-400 line-through">{fmtPrice(p.originalPrice)}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Brand story banner */}
      {brandStory && (
        <section className={isMobile ? 'py-8' : 'py-14'} style={{ background: '#f5f4f0' }}>
          <div className="max-w-2xl mx-auto px-5 text-center">
            <div className="text-4xl mb-5 opacity-20" style={{ color: primaryColor }}>"</div>
            <p className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-700 leading-relaxed italic`}>{brandStory}</p>
          </div>
        </section>
      )}

      {/* Features */}
      <section className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-14'}`}>
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-6'}`}>
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-4 p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: alpha(primaryColor, 0.1) }}>
                {f.icon}
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 mb-1">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ background: '#f5f4f0' }} className={isMobile ? 'py-8' : 'py-14'}>
        <div className="max-w-6xl mx-auto px-5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-gray-400 mb-2 text-center">Reviews</p>
          <h2 className="text-xl font-black text-gray-900 text-center mb-9">What Customers Say</h2>
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-5`}>
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 shadow-sm">
                <Stars n={t.rating} />
                <p className="text-sm text-gray-600 leading-relaxed mt-3 mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: primaryColor }}>
                    {t.author[0]}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-gray-900">{t.author}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {stats && <StatsRow stats={stats} primaryColor={primaryColor} device={device} />}
      {faq && faq.length > 0 && <FAQSection faq={faq} primaryColor={primaryColor} device={device} />}
      {newsletter && <NewsletterSection newsletter={newsletter} primaryColor={primaryColor} device={device} />}

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 bg-white">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm font-black uppercase tracking-[0.18em] text-gray-900">{storeName}</span>
          <p className="text-xs text-gray-400 italic">{tagline}</p>
          <p className="text-xs text-gray-400">© 2026 {storeName} · Powered by Storee</p>
        </div>
      </footer>
    </div>
  );
}

// ── BOLD layout ───────────────────────────────────────────────────────────────
// Inspired by: Nike, OFF-WHITE, Supreme — dark, high-energy, high contrast

function BoldLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen: _onSearchOpen, wishlist, onToggleWishlist, onWishlistClick }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks = [], products = [], collections = [], features = [], testimonials = [], tagline, accentColor, faq = [], stats = [], promoBar, newsletter, trustBadges = [] } = design;
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
          <span className="text-sm font-black uppercase tracking-[0.18em] text-white">{storeName}</span>
          {!isMobile ? (
            <nav className="flex gap-7">
              {navLinks.map(l => <a key={l} onClick={scrollToProducts} className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors cursor-pointer">{l}</a>)}
            </nav>
          ) : (
            <button onClick={() => setMenuOpen(true)} className="p-2 text-white/60"><Menu className="w-5 h-5" /></button>
          )}
          <div className="flex items-center gap-1">
            <button onClick={onWishlistClick} className="relative p-2 text-white/50 hover:text-white transition-colors">
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

      {promoBar && <PromoBar text={promoBar} primaryColor={primaryColor} />}

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: isMobile ? '75vh' : '82vh', display: 'flex', alignItems: 'center' }}>
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
            {heroTitle}
          </h1>
          <p className={`text-white/45 text-sm max-w-md ${isMobile ? 'mb-7' : 'mb-10'} leading-relaxed`}>{heroSubtitle}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={scrollToProducts} className={`${isMobile ? 'px-5 py-3 text-[11px]' : 'px-8 py-4 text-xs'} font-black uppercase tracking-widest rounded-full text-black hover:opacity-90 transition-opacity shadow-xl`} style={{ background: primaryColor }}>
              {ctaText} →
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
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </section>
      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} dark={true} device={device} />}

      {/* Products */}
      <section ref={productsRef} className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-14'}`}>
        <div className="flex items-end justify-between mb-8">
          <h2 className={`font-black text-white tracking-tight uppercase ${isMobile ? 'text-2xl' : 'text-3xl'}`}>New Drops</h2>
          <button onClick={scrollToProducts} className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5 hover:gap-3 transition-all" style={{ color: primaryColor }}>
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className={`grid ${gridCols(device)} gap-4`}>
          {displayed.map((p, idx) => (
            <div key={p.id} className="group cursor-pointer" onClick={() => onProductClick(p)}>
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
                <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700" style={{ transition: 'transform 0.7s ease' }} />
                {/* Overlay gradient at bottom */}
                <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[10px] font-black uppercase px-2.5 py-1 rounded-full text-black" style={{ background: idx === 0 ? accentColor : primaryColor }}>{p.badge}</span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                  className={`absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${wishlist.has(p.id) ? 'text-rose-400 fill-rose-400' : 'text-white'}`} />
                </button>
                {/* Always-visible price + add on mobile; hover on desktop */}
                <div className={`absolute bottom-0 inset-x-0 p-3 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                  <button
                    onClick={e => { e.stopPropagation(); const _btn = e.currentTarget as HTMLElement; const _card = _btn.closest('.group') as HTMLElement ?? _btn; const _wrap = _card.querySelector('.relative.overflow-hidden, .relative.aspect-square, .relative.rounded-2xl') as HTMLElement | null; const _img = (_wrap ?? _card).querySelector('img') as HTMLElement | null; onAddToCart(p, (_img ?? _wrap ?? _btn).getBoundingClientRect()); }}
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

      {/* Features — numbered with accent top bar */}
      <section className={`border-t border-white/8 ${isMobile ? 'py-8' : 'py-14'}`}>
        <div className={`max-w-6xl mx-auto px-5 grid ${isMobile ? 'grid-cols-1 gap-8' : 'grid-cols-3 gap-8'}`}>
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-5">
              <div>
                <div className="h-0.5 w-8 mb-4" style={{ background: primaryColor }} />
                <span className="text-4xl font-black leading-none text-white/15 block mb-3">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-2xl mb-2.5">{f.icon}</p>
                <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2">{f.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className={isMobile ? 'py-8' : 'py-14'} style={{ background: alpha(primaryColor, 0.06) }}>
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-8 text-center">The Word</h2>
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-5`}>
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-3xl p-6 backdrop-blur" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-3xl font-black mb-4 leading-none" style={{ color: alpha(primaryColor, 0.4) }}>"</div>
                <Stars n={t.rating} />
                <p className="text-sm text-white/65 leading-relaxed mt-3 mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3 border-t border-white/8 pt-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-black" style={{ background: primaryColor }}>
                    {t.author[0]}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-white">{t.author}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: alpha(primaryColor, 0.7) }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {stats && <StatsRow stats={stats} primaryColor={primaryColor} dark={true} device={device} />}
      {faq && faq.length > 0 && <FAQSection faq={faq} primaryColor={primaryColor} device={device} dark={true} />}
      {newsletter && <NewsletterSection newsletter={newsletter} primaryColor={primaryColor} dark={true} device={device} />}

      {/* Footer */}
      <footer className="border-t border-white/8 py-10">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm font-black uppercase tracking-[0.18em] text-white">{storeName}</span>
          <p className="text-xs text-white/30 uppercase tracking-widest">{tagline}</p>
          <p className="text-xs text-white/30">© 2026 {storeName} · Powered by Storee</p>
        </div>
      </footer>
    </div>
  );
}

// ── ELEGANT layout ────────────────────────────────────────────────────────────
// Inspired by: Net-a-Porter, Jo Malone, Tiffany — luxury, refined, warm

function ElegantLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen, wishlist, onToggleWishlist, onWishlistClick }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks = [], products = [], collections = [], features = [], testimonials = [], tagline, faq = [], stats = [], promoBar, newsletter, trustBadges = [], brandStory } = design;
  const btnText = isDark(primaryColor) ? '#fff' : '#2a2420';
  const isMobile = device === 'mobile';
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
            <span className="text-sm font-bold" style={{ color: '#2a2420', letterSpacing: '0.16em' }}>{storeName.toUpperCase()}</span>
          </div>
          {!isMobile ? (
            <nav className="flex gap-5">
              {navLinks.map(l => (
                <a key={l} onClick={scrollToProducts} className="text-[11px] hover:opacity-50 transition-opacity cursor-pointer" style={{ color: '#6b5e52', letterSpacing: '0.1em' }}>{l.toUpperCase()}</a>
              ))}
            </nav>
          ) : (
            <button onClick={() => setMenuOpen(true)} className="p-2" style={{ color: '#6b5e52' }}><Menu className="w-5 h-5" /></button>
          )}
          <div className="flex items-center gap-3">
            {!isMobile && <button onClick={onSearchOpen} className="p-1" style={{ color: '#6b5e52' }}><Search className="w-4 h-4" /></button>}
            <button onClick={onWishlistClick} className="relative p-2" style={{ color: '#6b5e52' }}>
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

      {promoBar && <PromoBar text={promoBar} primaryColor={primaryColor} />}

      {/* Hero — full-bleed image */}
      <section className="relative overflow-hidden" style={{ height: isMobile ? '56vh' : '82vh' }}>
        <ProductImg src={products[0]?.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: isMobile ? 'linear-gradient(to bottom, rgba(10,7,4,0.4), rgba(10,7,4,0.7))' : 'linear-gradient(to right, rgba(10,7,4,0.78) 42%, rgba(10,7,4,0.15))' }} />
        <div className={`absolute inset-0 flex items-${isMobile ? 'end pb-8' : 'center'}`}>
          <div className="max-w-6xl mx-auto px-6 w-full">
            <p className="text-xs tracking-[0.35em] mb-5 text-white/55" style={{ fontFamily: 'system-ui' }}>{tagline.toUpperCase()}</p>
            <h1 className={`font-bold text-white leading-tight mb-6 ${isMobile ? 'text-3xl' : 'text-5xl'}`}
              style={{ textShadow: '0 2px 30px rgba(0,0,0,0.5)', maxWidth: '14ch' }}>
              {heroTitle}
            </h1>
            {!isMobile && <p className="text-white/65 text-sm max-w-xs mb-9 leading-relaxed" style={{ fontFamily: 'system-ui' }}>{heroSubtitle}</p>}
            <button onClick={scrollToProducts} className={`${isMobile ? 'w-full text-center py-3 px-6' : 'px-9 py-3.5'} text-xs border text-white hover:bg-white/12 transition-colors`}
              style={{ borderColor: 'rgba(255,255,255,0.35)', letterSpacing: '0.22em', fontFamily: 'system-ui' }}>
              {ctaText.toUpperCase()}
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
              {c.emoji} {c.name.toUpperCase()}
            </button>
          ))}
        </div>
      </section>
      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} device={device} />}

      {/* Products */}
      <section ref={productsRef} className={`max-w-6xl mx-auto px-6 ${isMobile ? 'py-8' : 'py-16'}`}>
        <div className={`text-center ${isMobile ? 'mb-7' : 'mb-12'}`}>
          <p className="text-[10px] tracking-[0.38em] mb-3" style={{ color: primaryColor, fontFamily: 'system-ui' }}>CURATED SELECTION</p>
          <h2 className="text-2xl font-bold tracking-wide" style={{ color: '#2a2420' }}>New Arrivals</h2>
          <div className="w-10 h-px mx-auto mt-4" style={{ background: primaryColor }} />
        </div>
        <div className={`grid ${gridCols(device)} gap-6`}>
          {displayed.map(p => (
            <div key={p.id} className="group cursor-pointer" onClick={() => onProductClick(p)}>
              <div className="relative overflow-hidden mb-4 bg-gray-100" style={{ aspectRatio: '3/4' }}>
                <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform duration-1000" style={{ transform: 'scale(1)', transition: 'transform 1s ease' }} />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[9px] font-bold tracking-widest px-2.5 py-1 text-white" style={{ background: primaryColor, letterSpacing: '0.15em', fontFamily: 'system-ui' }}>
                    {p.badge.toUpperCase()}
                  </span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                  className={`absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : 'text-gray-500'}`} />
                </button>
                {/* Add to bag — always visible on mobile, hover on desktop */}
                <div className={`absolute bottom-0 inset-x-0 transition-transform duration-300 ${isMobile ? '' : 'translate-y-full group-hover:translate-y-0'}`}
                  style={{ background: 'rgba(15,10,5,0.88)' }}>
                  <button
                    onClick={e => { e.stopPropagation(); const _btn = e.currentTarget as HTMLElement; const _card = _btn.closest('.group') as HTMLElement ?? _btn; const _wrap = _card.querySelector('.relative.overflow-hidden, .relative.aspect-square, .relative.rounded-2xl') as HTMLElement | null; const _img = (_wrap ?? _card).querySelector('img') as HTMLElement | null; onAddToCart(p, (_img ?? _wrap ?? _btn).getBoundingClientRect()); }}
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

      {/* Brand Philosophy */}
      <section className={isMobile ? 'py-8' : 'py-16'} style={{ background: '#f5f0e8' }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-[10px] tracking-[0.38em] mb-6" style={{ color: primaryColor, fontFamily: 'system-ui' }}>OUR PHILOSOPHY</p>
          <p className="text-lg font-medium leading-loose italic" style={{ color: '#4a3d32', lineHeight: '1.9' }}>
            "{brandStory || heroSubtitle}"
          </p>
          <div className="w-8 h-px mx-auto mt-6" style={{ background: primaryColor }} />
        </div>
      </section>

      {/* Features */}
      <section className={`max-w-6xl mx-auto px-6 ${isMobile ? 'py-8' : 'py-14'}`}>
        <div className={`grid ${isMobile ? 'grid-cols-1 divide-y' : 'grid-cols-3 divide-x'}`} style={{ borderColor: '#e8e3db' }}>
          {features.map((f, i) => (
            <div key={i} className={`text-center ${isMobile ? 'px-4 py-5' : 'px-8 py-8'}`}>
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-xs font-bold tracking-[0.2em] mb-2" style={{ color: '#2a2420', fontFamily: 'system-ui' }}>{f.title.toUpperCase()}</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#8a7a6a', fontFamily: 'system-ui' }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className={isMobile ? 'py-8' : 'py-14'} style={{ background: '#f5f0e8' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className={`text-center ${isMobile ? 'mb-7' : 'mb-10'}`}>
            <p className="text-[10px] tracking-[0.38em] mb-3" style={{ color: primaryColor, fontFamily: 'system-ui' }}>CLIENT VOICES</p>
            <h2 className="text-xl font-bold tracking-wide" style={{ color: '#2a2420' }}>Testimonials</h2>
          </div>
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-6`}>
            {testimonials.map((t, i) => (
              <div key={i} className="p-7 bg-white relative overflow-hidden" style={{ borderLeft: `3px solid ${primaryColor}` }}>
                <div className="text-5xl font-black leading-none absolute top-3 right-5 opacity-6" style={{ color: primaryColor }}>❝</div>
                <Stars n={t.rating} />
                <p className="text-sm leading-loose italic mt-4 mb-6" style={{ color: '#4a3d32' }}>"{t.text}"</p>
                <div>
                  <p className="text-xs font-bold tracking-widest" style={{ color: '#2a2420', fontFamily: 'system-ui' }}>{t.author.toUpperCase()}</p>
                  <p className="text-[10px] tracking-wider mt-0.5" style={{ color: primaryColor, fontFamily: 'system-ui' }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {stats && <StatsRow stats={stats} primaryColor={primaryColor} device={device} />}
      {faq && faq.length > 0 && <FAQSection faq={faq} primaryColor={primaryColor} device={device} elegant={true} />}
      {newsletter && <NewsletterSection newsletter={newsletter} primaryColor={primaryColor} elegant={true} device={device} />}

      {/* Footer */}
      <footer style={{ background: '#2a2420', borderTop: `3px solid ${primaryColor}` }} className="py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs font-bold tracking-[0.45em] text-white mb-3">{storeName.toUpperCase()}</p>
          <p className="text-[10px] tracking-[0.22em] mb-6" style={{ color: 'rgba(255,255,255,0.38)' }}>{tagline.toUpperCase()}</p>
          <div className="w-10 h-px mx-auto mb-6" style={{ background: primaryColor }} />
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>© 2026 {storeName} · Powered by Storee</p>
        </div>
      </footer>
    </div>
  );
}

// ── MODERN layout ─────────────────────────────────────────────────────────────
// Inspired by: Apple Store, Allbirds, Casper — clean, airy, contemporary

function ModernLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen, wishlist, onToggleWishlist, onWishlistClick }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks = [], products = [], collections = [], features = [], testimonials = [], tagline, accentColor, faq = [], stats = [], promoBar, newsletter, trustBadges = [] } = design;
  const btnText = isDark(primaryColor) ? '#fff' : '#fff';
  const isMobile = device === 'mobile';
  const [selectedCol, setSelectedCol] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth' });
  const displayed = selectedCol === 0 ? products : products.filter((_, i) => i % 2 === selectedCol - 1);

  return (
    <div className="bg-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>

      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={navLinks} primaryColor={primaryColor} storeName={storeName} onScrollToProducts={scrollToProducts} />

      {/* Header */}
      <header className="bg-white/85 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between" style={{ height: '56px' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-bold text-white shadow-md" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
              {storeName[0]}
            </div>
            <span className="text-sm font-bold text-gray-900">{storeName}</span>
          </div>
          {!isMobile ? (
            <nav className="flex gap-6">
              {navLinks.map(l => <a key={l} onClick={scrollToProducts} className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium cursor-pointer">{l}</a>)}
            </nav>
          ) : (
            <button onClick={() => setMenuOpen(true)} className="p-2 text-gray-600 rounded-xl"><Menu className="w-5 h-5" /></button>
          )}
          <div className="flex items-center gap-1">
            {!isMobile && <button onClick={onSearchOpen} className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"><Search className="w-4 h-4" /></button>}
            <button onClick={onWishlistClick} className="relative p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors">
              <Heart className="w-4 h-4" />
              {wishlist.size > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center bg-rose-500">{wishlist.size}</span>}
            </button>
            <button data-cart-btn onClick={onCartClick} className="relative p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors">
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: primaryColor }}>{cartCount}</span>}
            </button>
            <UserProfileMenu buyerEmail={buyerEmail} onUserClick={onUserClick} onWishlistClick={onWishlistClick} wishlistCount={wishlist.size} iconColor="#9ca3af" hoverClass="hover:text-gray-700 rounded-xl hover:bg-gray-100" />
          </div>
        </div>
      </header>

      {promoBar && <PromoBar text={promoBar} primaryColor={primaryColor} />}

      {/* Hero */}
      {isMobile ? (
        <section className="px-5 py-10" style={{ background: `linear-gradient(160deg, ${alpha(primaryColor, 0.05)} 0%, ${alpha(accentColor, 0.08)} 100%)` }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5" style={{ background: alpha(primaryColor, 0.1), color: primaryColor }}>
            ✦ {tagline}
          </div>
          <h1 className="text-4xl font-bold text-gray-900 leading-tight tracking-tight mb-4">{heroTitle}</h1>
          <p className="text-gray-500 text-sm mb-7 leading-relaxed">{heroSubtitle}</p>
          <button onClick={scrollToProducts} className="w-full py-3.5 text-sm font-semibold rounded-2xl shadow-lg" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, color: btnText }}>
            {ctaText}
          </button>
          {/* Mini product scroll on mobile */}
          <div className="mt-7 flex gap-3 overflow-x-auto pb-1">
            {products.slice(0, 4).map(p => (
              <div key={p.id} className="flex-shrink-0 w-32 rounded-2xl overflow-hidden shadow-md cursor-pointer" onClick={() => onProductClick(p)}>
                <div className="h-28 bg-gray-100">
                  <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-2 bg-white">
                  <p className="text-[11px] font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-[11px] font-bold mt-0.5" style={{ color: primaryColor }}>{fmtPrice(p.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="overflow-hidden">
          <div className="max-w-6xl mx-auto px-5 py-14 grid grid-cols-2 gap-0 items-center">
            <div className="py-6 pr-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ background: alpha(primaryColor, 0.1), color: primaryColor }}>
                ✦ {tagline}
              </div>
              <h1 className="text-5xl font-bold text-gray-900 leading-[1.05] tracking-tight mb-5">{heroTitle}</h1>
              <p className="text-gray-500 text-base mb-8 max-w-sm leading-relaxed">{heroSubtitle}</p>
              <div className="flex flex-wrap gap-3 mb-8">
                <button onClick={scrollToProducts} className="px-7 py-3.5 text-sm font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:opacity-90 transition-all" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, color: btnText }}>
                  {ctaText}
                </button>
                <button onClick={scrollToProducts} className="px-7 py-3.5 text-sm font-semibold rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all">
                  Learn More
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {collections.map((c, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 text-gray-600">
                    {c.emoji} {c.name}
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
                      <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover" />
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

      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} device={device} />}

      {/* Products */}
      <section ref={productsRef} className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-14'}`} style={{ borderTop: '1px solid #f0f0f0' }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Featured Products</h2>
            <p className="text-sm text-gray-400 mt-1">{tagline}</p>
          </div>
          <button onClick={scrollToProducts} className="text-sm font-semibold flex items-center gap-1.5 hover:gap-2.5 transition-all" style={{ color: primaryColor }}>
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className={`grid ${gridCols(device)} gap-5`}>
          {displayed.map(p => (
            <div key={p.id} className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer" onClick={() => onProductClick(p)}>
              <div className="relative aspect-square overflow-hidden bg-gray-50">
                <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm" style={{ background: primaryColor }}>{p.badge}</span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                  className={`absolute top-3 right-3 w-9 h-9 bg-white rounded-2xl shadow flex items-center justify-center transition-all hover:scale-110 active:scale-95 hover:bg-gray-50 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <Heart className={`w-4 h-4 transition-colors ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : 'text-gray-400'}`} />
                </button>
              </div>
              <div className={isMobile ? 'p-3' : 'p-4'}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: alpha(primaryColor, 0.1), color: primaryColor }}>{p.category}</span>
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                {!isMobile && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.description}</p>}
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-bold text-gray-900">{fmtPrice(p.price)}</span>
                    {p.originalPrice && !isMobile && <span className="text-xs text-gray-400 line-through">{fmtPrice(p.originalPrice)}</span>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); const _btn = e.currentTarget as HTMLElement; const _card = _btn.closest('.group') as HTMLElement ?? _btn; const _wrap = _card.querySelector('.relative.overflow-hidden, .relative.aspect-square, .relative.rounded-2xl') as HTMLElement | null; const _img = (_wrap ?? _card).querySelector('img') as HTMLElement | null; onAddToCart(p, (_img ?? _wrap ?? _btn).getBoundingClientRect()); }} className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-xl text-white shadow-sm hover:opacity-90 transition-opacity" style={{ background: primaryColor }}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className={isMobile ? 'py-8' : 'py-14'} style={{ background: `linear-gradient(135deg, ${alpha(primaryColor, 0.04)}, ${alpha(accentColor, 0.06)})` }}>
        <div className={`max-w-6xl mx-auto px-5 grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-5'}`}>
          {features.map((f, i) => (
            <div key={i} className="bg-white/75 backdrop-blur rounded-3xl p-7 shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4" style={{ background: `linear-gradient(135deg, ${alpha(primaryColor, 0.15)}, ${alpha(accentColor, 0.15)})` }}>
                {f.icon}
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-14'}`}>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-9">Loved by Customers</h2>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-5`}>
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-3xl p-6 border-l-4" style={{ background: alpha(i === 0 ? primaryColor : accentColor, 0.05), borderLeftColor: i === 0 ? primaryColor : accentColor }}>
              <Stars n={t.rating} />
              <p className="text-sm text-gray-700 leading-relaxed mt-3 mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: i === 0 ? primaryColor : accentColor }}>
                  {t.author[0]}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">{t.author}</p>
                  <p className="text-[10px] text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {stats && <StatsRow stats={stats} primaryColor={primaryColor} device={device} />}
      {faq && faq.length > 0 && <FAQSection faq={faq} primaryColor={primaryColor} device={device} />}
      {newsletter && <NewsletterSection newsletter={newsletter} primaryColor={primaryColor} device={device} />}

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 py-10">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
              {storeName[0]}
            </div>
            <span className="text-sm font-bold text-gray-900">{storeName}</span>
          </div>
          <p className="text-xs text-gray-400">{tagline}</p>
          <p className="text-xs text-gray-400">© 2026 {storeName} · Powered by Storee</p>
        </div>
      </footer>
    </div>
  );
}

// ── PLAYFUL layout ────────────────────────────────────────────────────────────
// Inspired by: Glossier, Oatly, Warby Parker — fun, colorful, round, youthful

function PlayfulLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen: _onSearchOpen, wishlist, onToggleWishlist, onWishlistClick }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks = [], products = [], collections = [], features = [], testimonials = [], tagline, accentColor, faq = [], stats = [], promoBar, newsletter, trustBadges = [] } = design;
  const heroTextColor = isDark(primaryColor) ? '#fff' : '#111';
  const isMobile = device === 'mobile';
  const [selectedCol, setSelectedCol] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth' });
  const displayed = selectedCol === 0 ? products : products.filter((_, i) => i % 2 === selectedCol - 1);

  return (
    <div className="bg-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={navLinks} primaryColor={primaryColor} storeName={storeName} onScrollToProducts={scrollToProducts} />

      {/* Header */}
      <header className="bg-white border-b-2 border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between" style={{ height: '56px' }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{collections[0]?.emoji}</span>
            <span className="text-sm font-black text-gray-900">{storeName}</span>
          </div>
          {!isMobile ? (
            <nav className="flex gap-2">
              {navLinks.map((l, i) => (
                <a key={l} onClick={scrollToProducts} className="px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer"
                  style={i === 0 ? { background: primaryColor, color: heroTextColor } : { color: '#555', background: '#f5f5f5' }}>
                  {l}
                </a>
              ))}
            </nav>
          ) : (
            <button onClick={() => setMenuOpen(true)} className="p-2 text-gray-700"><Menu className="w-5 h-5" /></button>
          )}
          <div className="flex items-center gap-1">
            <button onClick={onWishlistClick} className="relative p-2">
              <Heart className="w-5 h-5 text-gray-700" />
              {wishlist.size > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-black text-white rounded-full flex items-center justify-center bg-rose-500">{wishlist.size}</span>}
            </button>
            <button data-cart-btn onClick={onCartClick} className="relative p-2">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-black text-white rounded-full flex items-center justify-center" style={{ background: accentColor }}>{cartCount}</span>}
            </button>
            <UserProfileMenu buyerEmail={buyerEmail} onUserClick={onUserClick} onWishlistClick={onWishlistClick} wishlistCount={wishlist.size} iconColor="#374151" />
          </div>
        </div>
      </header>

      {promoBar && <PromoBar text={promoBar} primaryColor={primaryColor} />}

      {/* Hero — gradient with wave bottom */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)` }}>
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />
        <div className={`max-w-6xl mx-auto px-5 pt-12 pb-16 relative ${isMobile ? 'flex flex-col items-center text-center gap-6' : 'grid grid-cols-2 gap-12 items-center'}`}>
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-xs font-bold mb-5" style={{ color: heroTextColor }}>
              {collections[0]?.emoji} {tagline}
            </div>
            <h1 className={`font-black leading-tight mb-4 ${isMobile ? 'text-4xl' : 'text-5xl'}`} style={{ color: heroTextColor }}>
              {heroTitle}
            </h1>
            <p className={`text-sm mb-8 max-w-sm leading-relaxed ${isMobile ? 'text-center' : ''}`} style={{ color: `${heroTextColor}cc` }}>{heroSubtitle}</p>
            <div className={`flex items-center gap-3 flex-wrap ${isMobile ? 'justify-center' : ''}`}>
              <button onClick={scrollToProducts} className="px-7 py-3.5 text-sm font-black rounded-2xl shadow-xl hover:scale-105 transition-transform bg-white" style={{ color: primaryColor }}>
                {ctaText} 🛍️
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
                  <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition-transform cursor-pointer" onClick={() => onProductClick(p)}>
                    <div className="aspect-square">
                      <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
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
      <section className="py-5 bg-white">
        <div className="max-w-6xl mx-auto px-5 flex gap-3 overflow-x-auto">
          {collections.map((c, i) => (
            <button key={i} onClick={() => setSelectedCol(i)} className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border-2 transition-all hover:scale-105"
              style={selectedCol === i ? { background: primaryColor, borderColor: primaryColor, color: heroTextColor } : { borderColor: '#e5e7eb', color: '#374151' }}>
              <span className="text-base">{c.emoji}</span> {c.name}
            </button>
          ))}
        </div>
      </section>
      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} device={device} />}

      {/* Products */}
      <section ref={productsRef} className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-12'}`}>
        <div className="flex items-end justify-between mb-7">
          <div>
            <h2 className="text-2xl font-black text-gray-900">{collections[0]?.emoji} Our Picks</h2>
            <p className="text-sm text-gray-400 mt-1">{tagline}</p>
          </div>
          <button onClick={scrollToProducts} className="text-sm font-black flex items-center gap-1.5 hover:gap-2.5 transition-all" style={{ color: primaryColor }}>
            See All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className={`grid ${gridCols(device)} gap-4`}>
          {displayed.map((p, idx) => (
            <div key={p.id} className="group bg-white rounded-3xl overflow-hidden border-2 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              style={{ borderColor: alpha(idx % 2 === 0 ? primaryColor : accentColor, 0.25) }}
              onClick={() => onProductClick(p)}>
              <div className="relative aspect-square overflow-hidden bg-gray-50">
                <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[10px] font-black px-3 py-1.5 rounded-full text-white shadow-lg" style={{ background: idx % 2 === 0 ? primaryColor : accentColor }}>
                    {p.badge}
                  </span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                  className={`absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow transition-all hover:scale-110 active:scale-95 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : 'text-gray-400'}`} />
                </button>
              </div>
              <div className={isMobile ? 'p-3' : 'p-4'}>
                <p className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1.5" style={{ background: alpha(primaryColor, 0.1), color: primaryColor }}>{p.category}</p>
                <p className="text-sm font-black text-gray-900 truncate">{p.name}</p>
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-black truncate" style={{ color: primaryColor }}>{fmtPrice(p.price)}</span>
                    {p.originalPrice && !isMobile && <span className="text-xs text-gray-400 line-through flex-shrink-0">{fmtPrice(p.originalPrice)}</span>}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); const _btn = e.currentTarget as HTMLElement; const _card = _btn.closest('.group') as HTMLElement ?? _btn; const _wrap = _card.querySelector('.relative.overflow-hidden, .relative.aspect-square, .relative.rounded-2xl') as HTMLElement | null; const _img = (_wrap ?? _card).querySelector('img') as HTMLElement | null; onAddToCart(p, (_img ?? _wrap ?? _btn).getBoundingClientRect()); }}
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

      {/* Features */}
      <section className={isMobile ? 'py-8' : 'py-12'} style={{ background: alpha(primaryColor, 0.04) }}>
        <div className={`max-w-6xl mx-auto px-5 grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-5'}`}>
          {features.map((f, i) => (
            <div key={i} className="rounded-3xl p-7 text-center hover:scale-102 transition-transform"
              style={{ background: [alpha(primaryColor, 0.12), alpha(accentColor, 0.12), alpha(primaryColor, 0.07)][i], transition: 'transform 0.2s ease' }}>
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-sm font-black text-gray-900 mb-2">{f.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-8' : 'py-12'}`}>
        <h2 className="text-2xl font-black text-gray-900 text-center mb-8">Happy Customers 🤩</h2>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-5`}>
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-3xl p-6 border-2" style={{ borderColor: alpha(i === 0 ? primaryColor : accentColor, 0.25) }}>
              <Stars n={t.rating} />
              <p className="text-sm text-gray-700 leading-relaxed mt-3 mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-base font-black text-white flex-shrink-0" style={{ background: i === 0 ? primaryColor : accentColor }}>
                  {t.author[0]}
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900">{t.author}</p>
                  <p className="text-[10px] text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {stats && <StatsRow stats={stats} primaryColor={primaryColor} device={device} />}
      {faq && faq.length > 0 && <FAQSection faq={faq} primaryColor={primaryColor} device={device} />}
      {newsletter && <NewsletterSection newsletter={newsletter} primaryColor={primaryColor} device={device} />}

      {/* Footer with wave top */}
      <footer style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
        <div style={{ height: '36px', marginTop: '-1px' }}>
          <svg viewBox="0 0 1200 36" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,0 C300,36 600,0 900,18 C1050,27 1150,9 1200,0 L1200,36 L0,36 Z" fill="white" />
          </svg>
        </div>
        <div className="max-w-6xl mx-auto px-5 py-8 text-center">
          <p className="text-2xl mb-2">{collections[0]?.emoji}</p>
          <p className="text-sm font-black mb-1" style={{ color: heroTextColor }}>{storeName}</p>
          <p className="text-xs mb-4" style={{ color: `${heroTextColor}aa` }}>{tagline}</p>
          <p className="text-[10px]" style={{ color: `${heroTextColor}66` }}>© 2026 {storeName} · Powered by Storee</p>
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
  const fmtPrice = makePriceFmt(store.currency?.code ?? 'USD');
  // Option C: use design.products as primary source; fall back to template for
  // stores created before Option C (template-browsed or legacy AI stores).
  const products = (
    store.design?.products ??
    (store.template?.demoProducts || []).map(p => ({ ...p, description: '' }))
  ) as RichProduct[];

  return (
    <div className="bg-white">
      <div className="border-b border-slate-100">
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05)` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: primaryColor }}>
              {(store.name || 'S')[0]}
            </div>
            <span className="font-bold text-slate-900">{store.name || 'My Store'}</span>
          </div>
          <div className="flex items-center gap-3">
            {onWishlistClick && (
              <button onClick={onWishlistClick} className="relative p-2 rounded-lg hover:bg-slate-100">
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
            <button className="px-6 py-3 bg-white text-sm font-semibold rounded-xl" style={{ color: primaryColor }}>Shop Now →</button>
          </div>
        </div>
      </div>
      <div className="px-6 py-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Featured Products</h2>
        <div className={`grid ${gridCols(device)} gap-4`}>
          {products.map(p => (
            <div key={p.id} className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all cursor-pointer" onClick={() => onProductClick(p)}>
              <div className="relative aspect-square bg-slate-50">
                <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                {p.badge && <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold text-white rounded-full" style={{ background: primaryColor }}>{p.badge}</span>}
                <button
                  onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow transition-all hover:scale-110 active:scale-95"
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                </button>
              </div>
              <div className="p-3">
                <p className="text-xs text-slate-400 mb-1">{p.category}</p>
                <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-slate-900">{fmtPrice(p.price)}</span>
                  <button onClick={e => { e.stopPropagation(); const _btn = e.currentTarget as HTMLElement; const _card = _btn.closest('.group') as HTMLElement ?? _btn; const _wrap = _card.querySelector('.relative.overflow-hidden, .relative.aspect-square, .relative.rounded-2xl') as HTMLElement | null; const _img = (_wrap ?? _card).querySelector('img') as HTMLElement | null; onAddToCart(p, (_img ?? _wrap ?? _btn).getBoundingClientRect()); }} className="px-3 py-1.5 text-xs font-semibold rounded-xl text-white" style={{ background: primaryColor }}>Add</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-100 px-6 py-6 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: primaryColor }}>{(store.name || 'S')[0]}</div>
            <span className="font-bold text-slate-700 text-sm">{store.name}</span>
          </div>
          <p className="text-xs text-slate-400">© 2026 · Powered by Storee</p>
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

// ── Button / surface radii overrides ─────────────────────────────────────────

const BTN_RADIUS: Record<string, string>     = { pill: '9999px', rounded: '12px', square: '4px' };
const SURFACE_RADIUS: Record<string, string> = { pill: '20px',   rounded: '16px', square: '6px' };

// ── Extended token theme ──────────────────────────────────────────────────────

interface TokenTheme extends CommerceTheme {
  headingFont: string;
  googleFontsUrl: string;
}

function getTokenTheme(ds: DesignSystem, primaryColor: string): TokenTheme {
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
  };
}

// ── Font injector ─────────────────────────────────────────────────────────────

function TkFontInjector({ url }: { url: string }) {
  return <style>{`@import url('${url}');`}</style>;
}

// ── Hero: CENTERED ────────────────────────────────────────────────────────────

function TkHeroCentered({ design, tt, primaryColor, device, onScrollToProducts }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void;
}) {
  const { heroTitle, heroSubtitle, ctaText, products = [], collections = [], tagline } = design;
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  const bgImage = products[0]?.image;
  return (
    <section className="relative overflow-hidden" style={{ minHeight: isMobile ? '60vh' : '70vh' }}>
      {bgImage && (
        <>
          <div className="absolute inset-0">
            <ProductImg src={bgImage} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.65) 100%)' }} />
        </>
      )}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-5" style={{ minHeight: isMobile ? '60vh' : '70vh', padding: isMobile ? '60px 20px' : '80px 40px' }}>
        {tagline && (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] mb-4" style={{ color: alpha(primaryColor, 0.9) }}>
            {collections[0]?.emoji} {tagline}
          </p>
        )}
        <h1 className="font-black leading-[1.05] tracking-tight mb-5" style={{ fontFamily: tt.headingFont, fontSize: isMobile ? 'clamp(2.2rem,8vw,3rem)' : 'clamp(3rem,5vw,4.5rem)', color: bgImage ? '#ffffff' : tt.textPrimary }}>
          {heroTitle}
        </h1>
        <p className="text-sm leading-relaxed mb-8 max-w-lg" style={{ color: bgImage ? 'rgba(255,255,255,0.82)' : tt.textSecondary }}>
          {heroSubtitle}
        </p>
        <button onClick={onScrollToProducts} className="px-8 py-3.5 text-sm font-bold hover:opacity-90 transition-opacity" style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}>
          {ctaText}
        </button>
      </div>
    </section>
  );
}

// ── Hero: SPLIT ───────────────────────────────────────────────────────────────

function TkHeroSplit({ design, tt, primaryColor, device, onScrollToProducts, fmtPrice }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void; fmtPrice: (n: number) => string;
}) {
  const { heroTitle, heroSubtitle, ctaText, products = [], collections = [], tagline } = design;
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  return (
    <section style={{ background: tt.pageBg }}>
      <div className={`max-w-6xl mx-auto px-5 ${isMobile ? 'py-10 flex flex-col gap-8' : 'py-16 grid grid-cols-2 gap-14 items-center'}`}>
        <div>
          {tagline && (
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-5" style={{ color: primaryColor }}>
              {collections[0]?.emoji} {tagline}
            </p>
          )}
          <h1 className="font-black leading-[1.03] tracking-tight mb-5" style={{ fontFamily: tt.headingFont, fontSize: isMobile ? '2.4rem' : 'clamp(2.8rem,4vw,4rem)', color: tt.textPrimary }}>
            {heroTitle}
          </h1>
          <p className="text-sm leading-relaxed mb-8 max-w-sm" style={{ color: tt.textSecondary }}>
            {heroSubtitle}
          </p>
          <div className="flex items-center gap-4">
            <button onClick={onScrollToProducts} className="px-7 py-3.5 text-sm font-bold hover:opacity-90 transition-opacity" style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}>
              {ctaText}
            </button>
            <button onClick={onScrollToProducts} className="text-xs font-semibold flex items-center gap-1.5 hover:opacity-70 transition-opacity" style={{ color: tt.textMuted }}>
              Explore <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="relative">
          <div className="overflow-hidden shadow-2xl" style={{ aspectRatio: '4/5', borderRadius: tt.surfaceRadius }}>
            <ProductImg src={products[0]?.image} alt="" className="w-full h-full object-cover" />
          </div>
          {!isMobile && products[1] && (
            <div className="absolute -bottom-6 -left-8 bg-white rounded-2xl p-4 shadow-2xl" style={{ maxWidth: '180px' }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  <ProductImg src={products[1].image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-gray-400 truncate">{products[1].category}</p>
                  <p className="text-xs font-bold text-gray-900 truncate">{products[1].name}</p>
                  <p className="text-xs font-black mt-0.5" style={{ color: primaryColor }}>{fmtPrice(products[1].price)}</p>
                </div>
              </div>
            </div>
          )}
          {!isMobile && collections[1] && (
            <div className="absolute -top-4 -right-4 bg-white rounded-full px-4 py-2 shadow-xl text-xs font-bold text-gray-700">
              {collections[1].emoji} {collections[1].name}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Hero: FULLSCREEN ──────────────────────────────────────────────────────────

function TkHeroFullscreen({ design, tt, primaryColor, device, onScrollToProducts }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void;
}) {
  const { heroTitle, heroSubtitle, ctaText, products = [], tagline } = design;
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  return (
    <section className="relative" style={{ height: isMobile ? '85vh' : '92vh', minHeight: '480px' }}>
      <div className="absolute inset-0">
        <ProductImg src={products[0]?.image} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)' }} />
      </div>
      <div className="relative z-10 flex flex-col justify-end h-full px-8 pb-16">
        {tagline && (
          <p className="text-xs font-semibold uppercase tracking-[0.35em] mb-4" style={{ color: primaryColor }}>
            {tagline}
          </p>
        )}
        <h1 className="font-black leading-[1.0] tracking-tight mb-5 text-white" style={{ fontFamily: tt.headingFont, fontSize: isMobile ? 'clamp(2.5rem,9vw,3.5rem)' : 'clamp(3.5rem,6vw,6rem)' }}>
          {heroTitle}
        </h1>
        <p className="text-sm leading-relaxed mb-8 max-w-md text-white/75">
          {heroSubtitle}
        </p>
        <button onClick={onScrollToProducts} className="w-fit px-8 py-3.5 text-sm font-bold hover:opacity-90 transition-opacity" style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}>
          {ctaText} <ArrowRight className="w-4 h-4 inline ml-1" />
        </button>
      </div>
    </section>
  );
}

// ── Hero: MINIMAL ─────────────────────────────────────────────────────────────

function TkHeroMinimal({ design, tt, primaryColor, device, onScrollToProducts }: {
  design: StoreDesign; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onScrollToProducts: () => void;
}) {
  const { heroTitle, heroSubtitle, ctaText, tagline, collections = [] } = design;
  const isMobile = device === 'mobile';
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  return (
    <section style={{ background: tt.pageBg, borderBottom: `1px solid ${tt.divider}` }}>
      <div className="max-w-3xl mx-auto px-5 text-center" style={{ padding: isMobile ? '56px 20px' : '80px 40px' }}>
        {tagline && (
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] mb-5" style={{ color: primaryColor }}>
            {collections[0]?.emoji} {tagline}
          </p>
        )}
        <h1 className="font-black leading-[1.05] tracking-tight mb-5" style={{ fontFamily: tt.headingFont, fontSize: isMobile ? '2.2rem' : 'clamp(2.8rem,4.5vw,4rem)', color: tt.textPrimary }}>
          {heroTitle}
        </h1>
        <p className="text-sm leading-relaxed mb-8 max-w-xl mx-auto" style={{ color: tt.textSecondary }}>
          {heroSubtitle}
        </p>
        <button onClick={onScrollToProducts} className="px-8 py-3.5 text-sm font-bold hover:opacity-90 transition-opacity" style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}>
          {ctaText}
        </button>
      </div>
    </section>
  );
}

// ── Product grid: STANDARD (3-col) ────────────────────────────────────────────

function TkGridStandard({ products, tt, primaryColor, device, onProductClick, onAddToCart, onToggleWishlist, wishlist, fmtPrice }: {
  products: RichProduct[]; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onProductClick: (p: RichProduct) => void; onAddToCart: (p: RichProduct, r?: DOMRect) => void;
  onToggleWishlist: (id: string) => void; wishlist: Set<string>; fmtPrice: (n: number) => string;
}) {
  const isMobile = device === 'mobile';
  return (
    <div className={`grid ${gridCols(device)} gap-4 md:gap-5`}>
      {products.map(p => (
        <div key={p.id} className="group cursor-pointer" onClick={() => onProductClick(p)}>
          <div className="relative overflow-hidden mb-3" style={{ aspectRatio: '3/4', borderRadius: tt.surfaceRadius, background: tt.surfaceBg }}>
            <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            {p.badge && (
              <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 text-white" style={{ background: primaryColor, borderRadius: tt.btnRadius }}>
                {p.badge}
              </span>
            )}
            <div className={`absolute bottom-0 inset-x-0 p-3 transition-transform duration-200 ${isMobile ? '' : 'translate-y-full group-hover:translate-y-0'}`}>
              <button
                onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; const wrap = btn.closest('.group')?.querySelector('.relative.overflow-hidden') as HTMLElement | null; onAddToCart(p, (wrap ?? btn).getBoundingClientRect()); }}
                className="w-full py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg"
                style={{ background: primaryColor, borderRadius: tt.btnRadius }}
              >
                + Add to Cart
              </button>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
              className={`absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow transition-all hover:scale-110 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <Heart className={`w-3.5 h-3.5 ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : 'text-gray-400'}`} />
            </button>
          </div>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: tt.textMuted }}>{p.category}</p>
          <p className="text-sm font-bold truncate" style={{ color: tt.textPrimary }}>{p.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-black" style={{ color: tt.primary }}>{fmtPrice(p.price)}</span>
            {p.originalPrice && <span className="text-xs line-through" style={{ color: tt.textMuted }}>{fmtPrice(p.originalPrice)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Product grid: MAGAZINE (first product featured) ───────────────────────────

function TkGridMagazine({ products, tt, primaryColor, device, onProductClick, onAddToCart, onToggleWishlist, wishlist, fmtPrice }: {
  products: RichProduct[]; tt: TokenTheme; primaryColor: string; device: DeviceMode;
  onProductClick: (p: RichProduct) => void; onAddToCart: (p: RichProduct, r?: DOMRect) => void;
  onToggleWishlist: (id: string) => void; wishlist: Set<string>; fmtPrice: (n: number) => string;
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
            {featured.badge}
          </span>
        )}
        <div className="absolute bottom-0 inset-x-0 p-5">
          <p className="text-[10px] uppercase tracking-widest text-white/60 mb-1">{featured.category}</p>
          <p className="text-lg font-black text-white mb-1" style={{ fontFamily: tt.headingFont }}>{featured.name}</p>
          <div className="flex items-center justify-between">
            <span className="text-base font-black" style={{ color: primaryColor }}>{fmtPrice(featured.price)}</span>
            <button
              onClick={e => { e.stopPropagation(); const wrap = (e.currentTarget as HTMLElement).closest('.group') as HTMLElement; onAddToCart(featured, wrap?.getBoundingClientRect()); }}
              className="px-4 py-2 text-xs font-bold"
              style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}
            >
              Add to Cart
            </button>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onToggleWishlist(featured.id); }}
          className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow"
        >
          <Heart className={`w-3.5 h-3.5 ${wishlist.has(featured.id) ? 'text-rose-500 fill-rose-500' : 'text-gray-400'}`} />
        </button>
      </div>

      {/* Remaining products */}
      {rest.slice(0, isMobile ? 4 : 4).map(p => (
        <div key={p.id} className="group cursor-pointer" onClick={() => onProductClick(p)}>
          <div className="relative overflow-hidden mb-3" style={{ aspectRatio: '1/1', borderRadius: tt.surfaceRadius, background: tt.surfaceBg }}>
            <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            {p.badge && (
              <span className="absolute top-2 left-2 text-[9px] font-black uppercase px-2 py-0.5 text-white" style={{ background: primaryColor, borderRadius: tt.btnRadius }}>
                {p.badge}
              </span>
            )}
            <button onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }} className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
              <Heart className={`w-3 h-3 ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : 'text-gray-400'}`} />
            </button>
          </div>
          <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: tt.textMuted }}>{p.category}</p>
          <p className="text-xs font-bold truncate mb-1" style={{ color: tt.textPrimary }}>{p.name}</p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black" style={{ color: tt.primary }}>{fmtPrice(p.price)}</span>
            <button
              onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, btn.getBoundingClientRect()); }}
              className="text-[10px] font-bold px-2.5 py-1 text-white flex-shrink-0"
              style={{ background: primaryColor, borderRadius: tt.btnRadius }}
            >Add</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Product grid: LIST ────────────────────────────────────────────────────────

function TkGridList({ products, tt, primaryColor, onProductClick, onAddToCart, onToggleWishlist, wishlist, fmtPrice }: {
  products: RichProduct[]; tt: TokenTheme; primaryColor: string;
  onProductClick: (p: RichProduct) => void; onAddToCart: (p: RichProduct, r?: DOMRect) => void;
  onToggleWishlist: (id: string) => void; wishlist: Set<string>; fmtPrice: (n: number) => string;
}) {
  const btnText = isDark(primaryColor) ? '#fff' : '#000';
  return (
    <div className="space-y-4">
      {products.map(p => (
        <div
          key={p.id}
          className="group flex gap-5 cursor-pointer hover:shadow-md transition-shadow"
          style={{ background: tt.surfaceBg, border: `1px solid ${tt.surfaceBorder}`, borderRadius: tt.surfaceRadius, padding: '16px' }}
          onClick={() => onProductClick(p)}
        >
          <div className="w-28 h-28 flex-shrink-0 overflow-hidden" style={{ borderRadius: tt.surfaceRadius, background: tt.inputBg }}>
            <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {p.badge && (
                <span className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 mb-2 text-white" style={{ background: primaryColor, borderRadius: tt.btnRadius }}>
                  {p.badge}
                </span>
              )}
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: tt.textMuted }}>{p.category}</p>
              <p className="text-sm font-bold truncate" style={{ color: tt.textPrimary }}>{p.name}</p>
              <p className="text-xs leading-relaxed mt-1 line-clamp-2" style={{ color: tt.textSecondary }}>{p.description}</p>
            </div>
            <div className="flex items-center justify-between mt-3 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-black" style={{ color: tt.primary }}>{fmtPrice(p.price)}</span>
                {p.originalPrice && <span className="text-xs line-through" style={{ color: tt.textMuted }}>{fmtPrice(p.originalPrice)}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }} className="w-8 h-8 flex-shrink-0 bg-gray-50 rounded-full flex items-center justify-center">
                  <Heart className={`w-3.5 h-3.5 ${wishlist.has(p.id) ? 'text-rose-500 fill-rose-500' : 'text-gray-300'}`} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); const btn = e.currentTarget as HTMLElement; onAddToCart(p, btn.getBoundingClientRect()); }}
                  className="px-4 py-2 text-xs font-bold flex-shrink-0"
                  style={{ background: primaryColor, color: btnText, borderRadius: tt.btnRadius }}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── TOKEN LAYOUT — main component ─────────────────────────────────────────────

function TokenLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, fmtPrice, onUserClick, buyerEmail, onSearchOpen, wishlist, onToggleWishlist, onWishlistClick }: LayoutProps) {
  const ds = design.designSystem!;
  const tt = getTokenTheme(ds, primaryColor);
  const isMobile = device === 'mobile';
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCol, setSelectedCol] = useState(0);
  const productsRef = useRef<HTMLDivElement>(null);
  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth' });

  const { navLinks = [], products = [], collections = [], features = [], testimonials = [],
          tagline, faq = [], stats = [], promoBar, newsletter, trustBadges = [], brandStory } = design;

  const displayed = selectedCol === 0 ? products : products.filter((_, i) => i % collections.length === selectedCol % collections.length);

  // ── Section renderers ─────────────────────────────────────────────────────

  const renderSection = (section: string): React.ReactNode => {
    switch (section) {
      case 'hero':
        switch (ds.heroLayout) {
          case 'centered':   return <TkHeroCentered key="hero"   design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} />;
          case 'fullscreen': return <TkHeroFullscreen key="hero" design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} />;
          case 'minimal':    return <TkHeroMinimal key="hero"    design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} />;
          default:           return <TkHeroSplit key="hero"      design={design} tt={tt} primaryColor={primaryColor} device={device} onScrollToProducts={scrollToProducts} fmtPrice={fmtPrice} />;
        }

      case 'trust':
        if (!trustBadges.length) return null;
        return <TrustBadgesRow key="trust" badges={trustBadges} primaryColor={primaryColor} device={device} />;

      case 'collections':
        if (!collections.length) return null;
        return (
          <div key="collections" style={{ borderTop: `1px solid ${tt.divider}`, borderBottom: `1px solid ${tt.divider}`, background: tt.headerBg }}>
            <div className="max-w-6xl mx-auto px-5 py-3 flex gap-2.5 overflow-x-auto">
              {[{ name: 'All', emoji: '✨' }, ...collections].map((c, i) => (
                <button key={i} onClick={() => setSelectedCol(i)} className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-all"
                  style={selectedCol === i ? { background: primaryColor, color: isDark(primaryColor) ? '#fff' : '#000', borderRadius: tt.btnRadius } : { background: tt.surfaceBg, color: tt.textSecondary, borderRadius: tt.btnRadius }}>
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>
          </div>
        );

      case 'products':
        return (
          <section key="products" ref={productsRef} className="max-w-6xl mx-auto px-5" style={{ paddingTop: isMobile ? '2rem' : '3.5rem', paddingBottom: isMobile ? '2rem' : '3.5rem' }}>
            <div className="flex items-end justify-between mb-7">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] mb-1.5" style={{ color: tt.textMuted }}>Curated Selection</p>
                <h2 className="text-xl font-black tracking-tight" style={{ fontFamily: tt.headingFont, color: tt.textPrimary }}>Featured Products</h2>
              </div>
              <button onClick={scrollToProducts} className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:gap-2.5 transition-all" style={{ color: primaryColor }}>
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {ds.productGrid === 'magazine' ? (
              <TkGridMagazine products={displayed} tt={tt} primaryColor={primaryColor} device={device} onProductClick={onProductClick} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlist={wishlist} fmtPrice={fmtPrice} />
            ) : ds.productGrid === 'list' ? (
              <TkGridList products={displayed} tt={tt} primaryColor={primaryColor} onProductClick={onProductClick} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlist={wishlist} fmtPrice={fmtPrice} />
            ) : (
              <TkGridStandard products={displayed} tt={tt} primaryColor={primaryColor} device={device} onProductClick={onProductClick} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlist={wishlist} fmtPrice={fmtPrice} />
            )}
          </section>
        );

      case 'features':
        if (!features.length) return null;
        return (
          <section key="features" className="max-w-6xl mx-auto px-5" style={{ paddingTop: isMobile ? '2rem' : '3.5rem', paddingBottom: isMobile ? '2rem' : '3.5rem' }}>
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-6'}`}>
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-4 p-6 transition-shadow hover:shadow-md" style={{ background: tt.surfaceBg, border: `1px solid ${tt.surfaceBorder}`, borderRadius: tt.surfaceRadius }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: alpha(primaryColor, 0.1) }}>{f.icon}</div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide mb-1" style={{ color: tt.textPrimary }}>{f.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: tt.textSecondary }}>{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'testimonials':
        if (!testimonials.length) return null;
        return (
          <section key="testimonials" style={{ background: tt.surfaceBg, borderTop: `1px solid ${tt.divider}`, borderBottom: `1px solid ${tt.divider}` }}>
            <div className="max-w-6xl mx-auto px-5" style={{ paddingTop: isMobile ? '2rem' : '3.5rem', paddingBottom: isMobile ? '2rem' : '3.5rem' }}>
              <p className="text-[10px] uppercase tracking-[0.25em] mb-2 text-center" style={{ color: tt.textMuted }}>Reviews</p>
              <h2 className="text-xl font-black text-center mb-9" style={{ fontFamily: tt.headingFont, color: tt.textPrimary }}>What Customers Say</h2>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-5`}>
                {testimonials.map((t, i) => (
                  <div key={i} className="p-6" style={{ background: tt.pageBg, border: `1px solid ${tt.surfaceBorder}`, borderRadius: tt.surfaceRadius }}>
                    <Stars n={t.rating} />
                    <p className="text-sm leading-relaxed mt-3 mb-5 italic" style={{ color: tt.textSecondary }}>"{t.text}"</p>
                    <div className="flex items-center gap-3 pt-3" style={{ borderTop: `1px solid ${tt.divider}` }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: primaryColor }}>{t.author[0]}</div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide" style={{ color: tt.textPrimary }}>{t.author}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: tt.textMuted }}>{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'stats':
        if (!stats.length) return null;
        return <StatsRow key="stats" stats={stats} primaryColor={primaryColor} device={device} />;

      case 'brandStory':
        if (!brandStory) return null;
        return (
          <section key="brandStory" style={{ background: tt.surfaceBg, borderTop: `1px solid ${tt.divider}` }}>
            <div className="max-w-2xl mx-auto px-5 text-center" style={{ paddingTop: isMobile ? '2rem' : '3.5rem', paddingBottom: isMobile ? '2rem' : '3.5rem' }}>
              <div className="text-4xl mb-5 opacity-20" style={{ color: primaryColor, fontFamily: tt.headingFont }}>"</div>
              <p className={`${isMobile ? 'text-base' : 'text-lg'} font-medium leading-relaxed italic`} style={{ color: tt.textSecondary }}>{brandStory}</p>
            </div>
          </section>
        );

      case 'faq':
        if (!faq.length) return null;
        return <FAQSection key="faq" faq={faq} primaryColor={primaryColor} device={device} dark={ds.colorScheme === 'dark'} elegant={ds.colorScheme === 'cream'} />;

      case 'newsletter':
        if (!newsletter) return null;
        return <NewsletterSection key="newsletter" newsletter={newsletter} primaryColor={primaryColor} device={device} dark={ds.colorScheme === 'dark'} elegant={ds.colorScheme === 'cream'} />;

      default:
        return null;
    }
  };

  const sectionOrder = ds.sectionOrder?.length ? ds.sectionOrder
    : ['hero', 'trust', 'collections', 'products', 'features', 'testimonials', 'stats', 'brandStory', 'faq', 'newsletter'];

  return (
    <div style={{ fontFamily: tt.fontFamily, background: tt.pageBg, color: tt.textPrimary }}>
      <TkFontInjector url={tt.googleFontsUrl} />
      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} navLinks={navLinks} primaryColor={primaryColor} storeName={storeName} onScrollToProducts={scrollToProducts} />

      {/* Promo bar */}
      {promoBar && <PromoBar text={promoBar} primaryColor={primaryColor} />}

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-sm" style={{ background: tt.headerBg + 'f5', borderBottom: `1px solid ${tt.headerBorder}`, height: '56px' }}>
        <div className="max-w-6xl mx-auto px-5 h-full flex items-center justify-between">
          <span className="text-sm font-black tracking-[0.18em] uppercase" style={{ fontFamily: tt.headingFont, color: tt.textPrimary }}>{storeName}</span>
          {!isMobile ? (
            <nav className="flex gap-7">
              {navLinks.map(l => (
                <a key={l} onClick={scrollToProducts} className="text-xs uppercase tracking-wider font-medium cursor-pointer transition-opacity hover:opacity-60" style={{ color: tt.textSecondary }}>{l}</a>
              ))}
            </nav>
          ) : (
            <button onClick={() => setMenuOpen(true)} className="p-2 rounded-lg" style={{ color: tt.textSecondary }}><Menu className="w-5 h-5" /></button>
          )}
          <div className="flex items-center gap-1">
            {!isMobile && <button onClick={onSearchOpen} className="p-2 rounded-lg transition-opacity hover:opacity-60" style={{ color: tt.textSecondary }}><Search className="w-4 h-4" /></button>}
            <button onClick={onWishlistClick} className="relative p-2 rounded-lg transition-opacity hover:opacity-60" style={{ color: tt.textSecondary }}>
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

      {/* Sections rendered in Claude-specified order */}
      {sectionOrder.map(section => renderSection(section))}

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${tt.divider}`, background: tt.headerBg, paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm font-black uppercase tracking-[0.18em]" style={{ fontFamily: tt.headingFont, color: tt.textPrimary }}>{storeName}</span>
          <p className="text-xs italic" style={{ color: tt.textMuted }}>{tagline}</p>
          <p className="text-xs" style={{ color: tt.textMuted }}>© 2026 {storeName} · Powered by Storee</p>
        </div>
      </footer>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface StorePreviewProps {
  store: Store;
  device: DeviceMode;
}

export default function StorePreview({ store, device }: StorePreviewProps) {
  const [page, setPage] = useState<StorePage>('home');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<RichProduct | null>(null);
  const [orderNum] = useState(() => `ORD-${Math.floor(100000 + Math.random() * 900000)}`);
  const [selectedShippingId, setSelectedShippingId] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState('');

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

  const design = store.design as StoreDesign | undefined;
  const primaryColor = store.primaryColor || '#10b981';
  const storeName = store.name;
  const currencyCode = store.currency?.code ?? 'USD';
  const fmtPrice = makePriceFmt(currencyCode);
  const shippingSettings = store.shippingSettings;
  const paymentSettings = store.paymentSettings;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);

  // Resolve shipping cost for SuccessPage total
  const enabledShipping = (shippingSettings?.methods ?? DEFAULT_SHIPPING_METHODS).filter(m => m.enabled);
  const resolvedShipping = enabledShipping.find(m => m.id === selectedShippingId) ?? enabledShipping[0];
  const freeThreshold = shippingSettings?.freeShippingThreshold;
  const shippingCost = (freeThreshold && cartTotal >= freeThreshold) ? 0 : (resolvedShipping?.price ?? 15000);

  const saveOrder = async (paymentId: string, customer: { name: string; email: string; whatsapp: string; address: string; city: string; province: string; postal: string }) => {
    const selectedShipping = (shippingSettings?.methods ?? DEFAULT_SHIPPING_METHODS).find(m => m.id === selectedShippingId);
    const paymentMethod = (store.paymentSettings?.methods ?? DEFAULT_PAYMENT_METHODS).find(m => m.id === paymentId);
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
          shippingCost,
          paymentMethod: paymentMethod?.name ?? paymentId,
          subtotal: cartTotal,
          total: cartTotal + shippingCost,
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

  const [flyItems, setFlyItems] = useState<FlyItem[]>([]);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const toggleWishlist = useCallback((id: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const addToCart = (p: RichProduct, sourceRect?: DOMRect) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === p.id);
      if (existing) return prev.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product: p, qty: 1 }];
    });
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
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev.map(i => i.product.id === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0)
    );
  };

  const shared = {
    onProductClick: (p: RichProduct) => { setSelectedProduct(p); setPage('product'); },
    onAddToCart: (p: RichProduct, sourceRect?: DOMRect) => addToCart(p, sourceRect),
    onCartClick: () => setPage('cart'),
    onWishlistClick: () => setPage('wishlist'),
    cartCount,
    onUserClick: handleUserClick,
    buyerEmail: buyerUser?.email ?? null,
    onSearchOpen: () => setShowSearch(true),
    wishlist,
    onToggleWishlist: toggleWishlist,
  };

  let content: React.ReactNode;

  const allProducts = (design?.products ?? []) as RichProduct[];

  if (page === 'wishlist') {
    content = <WishlistPage wishlist={wishlist} products={allProducts} onToggleWishlist={toggleWishlist} onAddToCart={addToCart} onProductClick={p => { setSelectedProduct(p); setPage('product'); }} onBack={() => setPage('home')} primaryColor={primaryColor} storeName={storeName} fmtPrice={fmtPrice} layoutStyle={design?.layoutStyle} device={device} />;
  } else if (page === 'product' && selectedProduct) {
    content = <ProductDetailPage product={selectedProduct} primaryColor={primaryColor} storeName={storeName} device={device} fmtPrice={fmtPrice} onBack={() => setPage('home')} onAddToCart={addToCart} onCartClick={() => setPage('cart')} cartCount={cartCount} layoutStyle={design?.layoutStyle} />;
  } else if (page === 'cart') {
    content = <CartPage cart={cart} primaryColor={primaryColor} storeName={storeName} device={device} fmtPrice={fmtPrice} shippingSettings={shippingSettings} layoutStyle={design?.layoutStyle} onBack={() => setPage('home')} onCheckout={(sid) => { setSelectedShippingId(sid); setPage('checkout'); }} onUpdateQty={updateQty} />;
  } else if (page === 'checkout') {
    content = <CheckoutPage cart={cart} primaryColor={primaryColor} storeName={storeName} device={device} fmtPrice={fmtPrice} shippingSettings={shippingSettings} paymentSettings={paymentSettings} selectedShippingId={selectedShippingId} layoutStyle={design?.layoutStyle} onBack={() => setPage('cart')} onPlaceOrder={async (pid, customer) => { setSelectedPaymentId(pid); await saveOrder(pid, customer); setPage('success'); }} />;
  } else if (page === 'success') {
    content = <SuccessPage primaryColor={primaryColor} storeName={storeName} orderNum={orderNum} total={cartTotal + shippingCost} fmtPrice={fmtPrice} paymentSettings={paymentSettings} selectedPaymentId={selectedPaymentId} layoutStyle={design?.layoutStyle} onContinue={() => { setCart([]); setPage('home'); }} buyerUser={buyerUser} onShowAuth={() => setShowAuthModal(true)} onMyOrders={() => setPage('myorders')} />;
  } else if (page === 'myorders' && buyerUser) {
    content = <MyOrdersPage buyerUserId={buyerUser.id} primaryColor={primaryColor} storeName={storeName} storeId={store.id} onBack={() => setPage('home')} fmtPrice={fmtPrice} layoutStyle={design?.layoutStyle} />;
  } else if (!design) {
    content = <FallbackLayout store={store} device={device} onProductClick={shared.onProductClick} onAddToCart={shared.onAddToCart} onCartClick={shared.onCartClick} cartCount={shared.cartCount} onUserClick={shared.onUserClick} buyerEmail={shared.buyerEmail} wishlist={shared.wishlist} onToggleWishlist={shared.onToggleWishlist} onWishlistClick={shared.onWishlistClick} />;
  } else {
    const props: LayoutProps = { storeName, primaryColor, design, device, fmtPrice, ...shared };
    // Prefer TokenLayout when Claude supplied a full designSystem object
    if (design.designSystem) {
      content = <TokenLayout {...props} />;
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

  return (
    <div className="relative">
      {content}

      {/* Cart fly animation dots */}
      {flyItems.map(item => (
        <FlyingDot key={item.id} item={item} primaryColor={primaryColor} />
      ))}

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
    </div>
  );
}
