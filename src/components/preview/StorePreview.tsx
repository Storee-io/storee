'use client';

import { useState } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';
import { ShoppingCart, Heart, Star, Search, ArrowRight, Menu, ArrowLeft } from 'lucide-react';
import type { Store } from '../../context/StoreContext';
import type { StoreDesign, RichProduct } from '../../lib/claudeApi';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

interface CartItem { product: RichProduct; qty: number; }
type StorePage = 'home' | 'product' | 'cart' | 'checkout' | 'success';

interface LayoutProps {
  storeName: string;
  primaryColor: string;
  design: StoreDesign;
  device: DeviceMode;
  onProductClick: (p: RichProduct) => void;
  onAddToCart: (p: RichProduct) => void;
  onCartClick: () => void;
  cartCount: number;
  currencySymbol: string;
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

// ── Shared interactive pages ──────────────────────────────────────────────────

function ProductDetailPage({ product, primaryColor, storeName, device, onBack, onAddToCart, onCartClick, cartCount, currencySymbol }: {
  product: RichProduct; primaryColor: string; storeName: string; device: DeviceMode; currencySymbol: string;
  onBack: () => void; onAddToCart: (p: RichProduct) => void; onCartClick: () => void; cartCount: number;
}) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const handleAdd = () => {
    for (let i = 0; i < qty; i++) onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };
  return (
    <div className="bg-white min-h-screen">
      <header className="border-b border-gray-100 px-5 h-14 flex items-center justify-between sticky top-0 bg-white z-40">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
        <span className="text-sm font-bold text-gray-900 truncate max-w-[140px]">{storeName}</span>
        <button onClick={onCartClick} className="relative p-2">
          <ShoppingCart className="w-5 h-5 text-gray-600" />
          {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: primaryColor }}>{cartCount}</span>}
        </button>
      </header>
      <div className={`max-w-4xl mx-auto px-5 py-8 ${device === 'mobile' ? 'flex flex-col gap-6' : 'grid grid-cols-2 gap-12'}`}>
        <div className="aspect-square rounded-3xl overflow-hidden bg-gray-50 shadow-sm">
          <ProductImg src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col gap-4">
          {product.badge && <span className="text-xs font-bold px-3 py-1 rounded-full text-white w-fit" style={{ background: primaryColor }}>{product.badge}</span>}
          <p className="text-xs text-gray-400 uppercase tracking-wider">{product.category}</p>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black" style={{ color: primaryColor }}>{currencySymbol}{product.price}</span>
            {product.originalPrice && <span className="text-lg text-gray-400 line-through">{currencySymbol}{product.originalPrice}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
            <span className="text-sm text-gray-400 ml-1">(4.8) · 124 reviews</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{product.description || 'Premium quality product crafted with care and precision.'}</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-11 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-lg font-bold">−</button>
              <span className="w-10 text-center text-sm font-bold">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="w-11 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-lg font-bold">+</button>
            </div>
            <button onClick={handleAdd} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95" style={{ background: added ? '#10b981' : primaryColor }}>
              {added ? '✓ Added to Cart!' : 'Add to Cart'}
            </button>
          </div>
          <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
            {[['Availability', 'In Stock', 'text-emerald-600'], ['Delivery', '2–4 business days', 'text-gray-700'], ['Returns', 'Free 30-day returns', 'text-gray-700']].map(([k, v, cls]) => (
              <div key={k} className="flex justify-between"><span className="text-gray-400">{k}</span><span className={`font-semibold ${cls}`}>{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CartPage({ cart, primaryColor, storeName, device, onBack, onCheckout, onUpdateQty, currencySymbol }: {
  cart: CartItem[]; primaryColor: string; storeName: string; device: DeviceMode; currencySymbol: string;
  onBack: () => void; onCheckout: () => void; onUpdateQty: (id: string, delta: number) => void;
}) {
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const shipping = subtotal > 0 && subtotal < 100 ? 9.99 : 0;
  const total = subtotal + shipping;
  return (
    <div className="bg-white min-h-screen">
      <header className="border-b border-gray-100 px-5 h-14 flex items-center justify-between sticky top-0 bg-white z-40">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"><ArrowLeft className="w-4 h-4" /> Shop</button>
        <span className="text-sm font-bold text-gray-900">Cart ({cart.reduce((s, i) => s + i.qty, 0)})</span>
        <div className="w-20" />
      </header>
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <ShoppingCart className="w-12 h-12 text-gray-200" />
          <p className="text-gray-400 text-sm">Your cart is empty</p>
          <button onClick={onBack} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: primaryColor }}>Start Shopping</button>
        </div>
      ) : (
        <div className={`max-w-4xl mx-auto px-5 py-8 ${device !== 'mobile' ? 'grid grid-cols-[1fr_300px] gap-10' : 'flex flex-col gap-6'}`}>
          <div className="space-y-3">
            {cart.map(({ product: p, qty }) => (
              <div key={p.id} className="flex gap-4 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50"><ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{p.category}</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                  <p className="text-sm font-black mt-0.5" style={{ color: primaryColor }}>{currencySymbol}{p.price}</p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <span className="text-sm font-bold text-gray-900">{currencySymbol}{(p.price * qty).toFixed(2)}</span>
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button onClick={() => onUpdateQty(p.id, -1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm">−</button>
                    <span className="w-7 text-center text-xs font-bold">{qty}</span>
                    <button onClick={() => onUpdateQty(p.id, 1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 h-fit space-y-2.5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Order Summary</h3>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-semibold">{currencySymbol}{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Shipping</span><span className="font-semibold">{shipping === 0 ? 'FREE' : `${currencySymbol}${shipping.toFixed(2)}`}</span></div>
            {shipping > 0 && <p className="text-xs text-gray-400">Free shipping on orders over {currencySymbol}100</p>}
            <div className="border-t border-gray-200 pt-3 flex justify-between text-sm font-bold"><span>Total</span><span style={{ color: primaryColor }}>{currencySymbol}{total.toFixed(2)}</span></div>
            <button onClick={onCheckout} className="w-full py-3.5 rounded-xl text-sm font-bold text-white mt-1 hover:opacity-90 transition-opacity" style={{ background: primaryColor }}>Checkout →</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckoutPage({ cart, primaryColor, storeName, device, onBack, onPlaceOrder, currencySymbol }: {
  cart: CartItem[]; primaryColor: string; storeName: string; device: DeviceMode; currencySymbol: string;
  onBack: () => void; onPlaceOrder: () => void;
}) {
  const [form, setForm] = useState({ name: '', email: '', address: '', city: '', zip: '', card: '', expiry: '', cvv: '' });
  const set = (k: string) => (e: ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const shipping = subtotal > 0 && subtotal < 100 ? 9.99 : 0;
  const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 transition-colors bg-white';
  const lbl = 'text-xs font-semibold text-gray-500 mb-1.5 block';
  return (
    <div className="bg-white min-h-screen">
      <header className="border-b border-gray-100 px-5 h-14 flex items-center justify-between sticky top-0 bg-white z-40">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"><ArrowLeft className="w-4 h-4" /> Cart</button>
        <span className="text-sm font-bold text-gray-900">Checkout</span>
        <div className="w-20" />
      </header>
      <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-50 overflow-x-auto">
        {['Cart', 'Shipping', 'Payment', 'Confirm'].map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: i <= 2 ? primaryColor : '#e5e7eb' }}>{i + 1}</div>
            <span className="text-xs font-medium" style={{ color: i <= 2 ? '#111' : '#9ca3af' }}>{s}</span>
            {i < 3 && <div className="w-5 h-px bg-gray-200 mx-0.5" />}
          </div>
        ))}
      </div>
      <div className={`max-w-4xl mx-auto px-5 py-8 ${device !== 'mobile' ? 'grid grid-cols-[1fr_280px] gap-10' : 'flex flex-col gap-6'}`}>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4">Shipping</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className={lbl}>Full Name</label><input className={inp} value={form.name} onChange={set('name')} placeholder="Jane Smith" /></div>
              <div className="col-span-2"><label className={lbl}>Email</label><input className={inp} value={form.email} onChange={set('email')} placeholder="jane@example.com" type="email" /></div>
              <div className="col-span-2"><label className={lbl}>Address</label><input className={inp} value={form.address} onChange={set('address')} placeholder="123 Main Street" /></div>
              <div><label className={lbl}>City</label><input className={inp} value={form.city} onChange={set('city')} placeholder="New York" /></div>
              <div><label className={lbl}>ZIP</label><input className={inp} value={form.zip} onChange={set('zip')} placeholder="10001" /></div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4">Payment</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className={lbl}>Card Number</label><input className={inp} value={form.card} onChange={set('card')} placeholder="4242 4242 4242 4242" /></div>
              <div><label className={lbl}>Expiry</label><input className={inp} value={form.expiry} onChange={set('expiry')} placeholder="MM / YY" /></div>
              <div><label className={lbl}>CVV</label><input className={inp} value={form.cvv} onChange={set('cvv')} placeholder="•••" /></div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-2xl p-5 h-fit space-y-2">
          <h3 className="text-sm font-bold text-gray-900">Order ({cart.reduce((s, i) => s + i.qty, 0)} items)</h3>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {cart.map(({ product: p, qty }) => (
              <div key={p.id} className="flex justify-between text-xs"><span className="text-gray-500 truncate max-w-[150px]">{p.name} ×{qty}</span><span className="font-semibold">{currencySymbol}{(p.price * qty).toFixed(2)}</span></div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{currencySymbol}{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-xs text-gray-500"><span>Shipping</span><span>{shipping === 0 ? 'FREE' : `${currencySymbol}${shipping.toFixed(2)}`}</span></div>
            <div className="flex justify-between text-sm font-bold pt-1"><span>Total</span><span style={{ color: primaryColor }}>{currencySymbol}{(subtotal + shipping).toFixed(2)}</span></div>
          </div>
          <button onClick={onPlaceOrder} className="w-full py-3.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: primaryColor }}>Place Order 🚀</button>
          <p className="text-[10px] text-gray-400 text-center">🔒 SSL secured · Demo only</p>
        </div>
      </div>
    </div>
  );
}

function SuccessPage({ primaryColor, storeName, orderNum, total, onContinue, currencySymbol }: { primaryColor: string; storeName: string; orderNum: string; total: number; currencySymbol: string; onContinue: () => void }) {
  return (
    <div className="bg-white min-h-screen flex flex-col items-center justify-center px-6 text-center py-16">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl text-white mb-6 shadow-xl" style={{ background: primaryColor }}>✓</div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">Order Placed!</h1>
      <p className="text-sm text-gray-500 mb-1">Thank you for shopping at <span className="font-bold" style={{ color: primaryColor }}>{storeName}</span></p>
      <p className="text-xs text-gray-400 mb-8">Order <span className="font-mono font-bold text-gray-600">{orderNum}</span> · {currencySymbol}{total.toFixed(2)}</p>
      <div className="bg-gray-50 rounded-2xl p-5 w-full max-w-xs mb-8 space-y-3 text-left">
        {[['📦', 'Processing', "We'll confirm within 1 hour"], ['🚚', 'Delivery', '2–4 business days'], ['📧', 'Confirmation', 'Sent to your inbox']].map(([icon, title, desc]) => (
          <div key={title} className="flex items-start gap-3">
            <span className="text-lg">{icon}</span>
            <div><p className="text-xs font-bold text-gray-900">{title}</p><p className="text-[11px] text-gray-500">{desc}</p></div>
          </div>
        ))}
      </div>
      <button onClick={onContinue} className="px-8 py-3.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: primaryColor }}>Continue Shopping</button>
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

function StatsRow({ stats, primaryColor, dark = false }: { stats: Array<{ value: string; label: string }>; primaryColor: string; dark?: boolean }) {
  if (!stats?.length) return null;
  return (
    <div className={`border-y ${dark ? 'border-white/10' : 'border-gray-100'}`}>
      <div className="max-w-6xl mx-auto px-5">
        <div className={`grid grid-cols-3 divide-x ${dark ? 'divide-white/10' : 'divide-gray-100'}`}>
          {stats.map((s, i) => (
            <div key={i} className="text-center px-4 py-8">
              <p className="text-3xl font-black" style={{ color: primaryColor }}>{s.value}</p>
              <p className={`text-xs mt-1.5 font-medium tracking-wide ${dark ? 'text-white/50' : 'text-gray-500'}`}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrustBadgesRow({ badges, primaryColor, dark = false }: { badges: Array<{ icon: string; text: string }>; primaryColor: string; dark?: boolean }) {
  if (!badges?.length) return null;
  return (
    <div className={`${dark ? 'border-white/10' : 'border-gray-100'} border-y`}>
      <div className={dark ? '' : 'bg-gray-50/70'}>
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-center gap-6 flex-wrap">
          {badges.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-base">{b.icon}</span>
              <span className={`text-xs font-semibold ${dark ? 'text-white/60' : 'text-gray-600'}`}>{b.text}</span>
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
  if (!faq?.length) return null;
  return (
    <section className="py-14" style={dark ? { background: 'rgba(255,255,255,0.03)' } : elegant ? { background: '#fdfcf8' } : {}}>
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

function NewsletterSection({ newsletter, primaryColor, dark = false, elegant = false }: {
  newsletter: { headline: string; subtext: string };
  primaryColor: string;
  dark?: boolean;
  elegant?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  if (!newsletter) return null;
  const inverted = dark || elegant;
  return (
    <section className="py-14">
      <div className="max-w-xl mx-auto px-5">
        <div className="rounded-3xl p-8 text-center" style={
          dark ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' } :
          elegant ? { background: '#2a2420' } :
          { background: `linear-gradient(135deg, ${alpha(primaryColor, 0.09)}, ${alpha(primaryColor, 0.04)})`, border: `1px solid ${alpha(primaryColor, 0.12)}` }
        }>
          <p className="text-2xl font-bold mb-3" style={{ color: inverted ? '#fff' : '#111' }}>{newsletter.headline}</p>
          <p className={`text-sm mb-7 leading-relaxed ${inverted ? 'text-white/60' : 'text-gray-500'}`}>{newsletter.subtext}</p>
          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold" style={{ color: inverted ? '#fff' : primaryColor }}>
              <span>✓</span> You're on the list!
            </div>
          ) : (
            <div className="flex gap-2">
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

// ── MINIMAL layout ────────────────────────────────────────────────────────────
// Inspired by: COS, Aesop, Muji — editorial, clean, whitespace-forward

function MinimalLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, currencySymbol }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks, products, collections, features, testimonials, tagline, faq, stats, promoBar, newsletter, trustBadges, brandStory } = design;
  const btnText = isDark(primaryColor) ? '#fff' : '#111';
  const isMobile = device === 'mobile';

  return (
    <div className="bg-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <header className="bg-white/96 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-15 flex items-center justify-between" style={{ height: '56px' }}>
          <span className="text-sm font-black tracking-[0.18em] uppercase text-gray-900">{storeName}</span>
          {!isMobile && (
            <nav className="flex gap-8">
              {navLinks.map(l => <a key={l} className="text-xs uppercase tracking-wider text-gray-400 hover:text-gray-900 transition-colors font-medium">{l}</a>)}
            </nav>
          )}
          <div className="flex items-center gap-1">
            {!isMobile && <button className="p-2 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"><Search className="w-4 h-4" /></button>}
            <button onClick={onCartClick} className="relative p-2 text-gray-400 hover:text-gray-700 rounded-lg transition-colors">
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: primaryColor }}>{cartCount}</span>}
            </button>
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
              <p className="text-xs font-black mt-0.5" style={{ color: primaryColor }}>{currencySymbol}{products[0]?.price}</p>
            </div>
          </div>
          <div className="px-5 py-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-4 flex items-center gap-1.5" style={{ color: primaryColor }}>
              {collections[0]?.emoji} {tagline}
            </p>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-gray-900 mb-4">{heroTitle}</h1>
            <p className="text-sm text-gray-500 leading-relaxed mb-7">{heroSubtitle}</p>
            <button className="w-full py-3.5 text-sm font-bold uppercase tracking-wider rounded-full" style={{ background: primaryColor, color: btnText }}>
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
                <button className="px-7 py-3 text-xs font-bold uppercase tracking-wider rounded-full hover:opacity-85 transition-opacity" style={{ background: primaryColor, color: btnText }}>
                  {ctaText}
                </button>
                <button className="text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1.5">
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
                    <p className="text-xs font-black mt-0.5" style={{ color: primaryColor }}>{currencySymbol}{products[1]?.price}</p>
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
            <button key={i} className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wide uppercase transition-all"
              style={i === 0 ? { background: primaryColor, color: btnText } : { background: '#f3f2ef', color: '#555' }}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>
      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} />}

      {/* Products */}
      <section className="max-w-6xl mx-auto px-5 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400 mb-1.5">Curated Selection</p>
            <h2 className="text-xl font-black tracking-tight text-gray-900">Featured Products</h2>
          </div>
          <a className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:gap-2.5 transition-all" style={{ color: primaryColor }}>
            View All <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className={`grid ${gridCols(device)} gap-4`}>
          {products.map(p => (
            <div key={p.id} className="group cursor-pointer" onClick={() => onProductClick(p)}>
              <div className="relative overflow-hidden rounded-2xl bg-gray-100 mb-3" style={{ aspectRatio: isMobile ? '3/4' : '3/4' }}>
                <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white" style={{ background: primaryColor }}>{p.badge}</span>
                )}
                {/* Quick add — always visible on mobile, hover on desktop */}
                <div className={`absolute bottom-0 inset-x-0 p-3 transition-transform duration-200 ${isMobile ? '' : 'translate-y-full group-hover:translate-y-0'}`}>
                  <button
                    onClick={e => { e.stopPropagation(); onAddToCart(p); }}
                    className="w-full py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl text-white shadow-lg"
                    style={{ background: primaryColor }}
                  >
                    + Add to Cart
                  </button>
                </div>
                {!isMobile && (
                  <button className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
                    <Heart className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                )}
              </div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">{p.category}</p>
              <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm font-black text-gray-900">{currencySymbol}{p.price}</span>
                {p.originalPrice && <span className="text-xs text-gray-400 line-through">{currencySymbol}{p.originalPrice}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Brand story banner */}
      {brandStory && (
        <section className="py-14" style={{ background: '#f5f4f0' }}>
          <div className="max-w-2xl mx-auto px-5 text-center">
            <div className="text-4xl mb-5 opacity-20" style={{ color: primaryColor }}>"</div>
            <p className="text-lg font-medium text-gray-700 leading-relaxed italic">{brandStory}</p>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-6xl mx-auto px-5 py-14">
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
      <section style={{ background: '#f5f4f0' }} className="py-14">
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

      {stats && <StatsRow stats={stats} primaryColor={primaryColor} />}
      {faq && faq.length > 0 && <FAQSection faq={faq} primaryColor={primaryColor} device={device} />}
      {newsletter && <NewsletterSection newsletter={newsletter} primaryColor={primaryColor} />}

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

function BoldLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, currencySymbol }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks, products, collections, features, testimonials, tagline, accentColor, faq, stats, promoBar, newsletter, trustBadges } = design;
  const isMobile = device === 'mobile';

  return (
    <div className="bg-[#0a0a0a]" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <header className="bg-[#0a0a0a]/96 backdrop-blur-sm border-b border-white/8 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between" style={{ height: '56px' }}>
          <span className="text-sm font-black uppercase tracking-[0.18em] text-white">{storeName}</span>
          {!isMobile && (
            <nav className="flex gap-7">
              {navLinks.map(l => <a key={l} className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors">{l}</a>)}
            </nav>
          )}
          <button onClick={onCartClick} className="relative p-2 text-white/50 hover:text-white transition-colors">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold text-black rounded-full flex items-center justify-center" style={{ background: primaryColor }}>{cartCount}</span>}
          </button>
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
          <h1 className={`font-black text-white leading-[0.93] tracking-tight mb-7 ${isMobile ? 'text-[3.5rem]' : 'text-[5.5rem]'}`}
            style={{ textShadow: `0 0 80px ${alpha(primaryColor, 0.35)}` }}>
            {heroTitle}
          </h1>
          <p className="text-white/45 text-sm max-w-md mb-10 leading-relaxed">{heroSubtitle}</p>
          <div className="flex items-center gap-4 flex-wrap">
            <button className="px-8 py-4 text-xs font-black uppercase tracking-widest rounded-full text-black hover:opacity-90 transition-opacity shadow-xl" style={{ background: primaryColor }}>
              {ctaText} →
            </button>
            <button className="px-8 py-4 text-xs font-black uppercase tracking-widest rounded-full text-white/70 border border-white/15 hover:bg-white/8 transition-colors">
              See All
            </button>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="border-y border-white/8 py-4">
        <div className="max-w-6xl mx-auto px-5 flex gap-2.5 overflow-x-auto">
          {collections.map((c, i) => (
            <button key={i} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
              style={i === 0 ? { background: primaryColor, color: '#000' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </section>
      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} dark={true} />}

      {/* Products */}
      <section className="max-w-6xl mx-auto px-5 py-14">
        <div className="flex items-end justify-between mb-8">
          <h2 className={`font-black text-white tracking-tight uppercase ${isMobile ? 'text-2xl' : 'text-3xl'}`}>New Drops</h2>
          <a className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5 hover:gap-3 transition-all" style={{ color: primaryColor }}>
            View All <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className={`grid ${gridCols(device)} gap-4`}>
          {products.map((p, idx) => (
            <div key={p.id} className="group cursor-pointer" onClick={() => onProductClick(p)}>
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
                <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700" style={{ transition: 'transform 0.7s ease' }} />
                {/* Overlay gradient at bottom */}
                <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[10px] font-black uppercase px-2.5 py-1 rounded-full text-black" style={{ background: idx === 0 ? accentColor : primaryColor }}>{p.badge}</span>
                )}
                {/* Always-visible price + add on mobile; hover on desktop */}
                <div className={`absolute bottom-0 inset-x-0 p-3 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                  <button
                    onClick={e => { e.stopPropagation(); onAddToCart(p); }}
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
                  <span className="text-sm font-black ml-2 flex-shrink-0" style={{ color: primaryColor }}>{currencySymbol}{p.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features — numbered with accent top bar */}
      <section className="border-t border-white/8 py-14">
        <div className={`max-w-6xl mx-auto px-5 grid ${isMobile ? 'grid-cols-1 gap-10' : 'grid-cols-3 gap-8'}`}>
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
      <section className="py-14" style={{ background: alpha(primaryColor, 0.06) }}>
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

      {stats && <StatsRow stats={stats} primaryColor={primaryColor} dark={true} />}
      {faq && faq.length > 0 && <FAQSection faq={faq} primaryColor={primaryColor} device={device} dark={true} />}
      {newsletter && <NewsletterSection newsletter={newsletter} primaryColor={primaryColor} dark={true} />}

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

function ElegantLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, currencySymbol }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks, products, collections, features, testimonials, tagline, faq, stats, promoBar, newsletter, trustBadges, brandStory } = design;
  const btnText = isDark(primaryColor) ? '#fff' : '#2a2420';
  const isMobile = device === 'mobile';

  return (
    <div style={{ background: '#fdfcf8', fontFamily: 'Georgia, "Times New Roman", serif' }}>

      {/* Header */}
      <header style={{ background: '#fdfcf8', borderBottom: '1px solid #ece7de' }} className="sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between" style={{ height: '60px' }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm" style={{ background: primaryColor }}>
              {storeName[0]}
            </div>
            <span className="text-sm font-bold" style={{ color: '#2a2420', letterSpacing: '0.16em' }}>{storeName.toUpperCase()}</span>
          </div>
          {!isMobile && (
            <nav className="flex gap-5">
              {navLinks.map(l => (
                <a key={l} className="text-[11px] hover:opacity-50 transition-opacity" style={{ color: '#6b5e52', letterSpacing: '0.1em' }}>{l.toUpperCase()}</a>
              ))}
            </nav>
          )}
          <div className="flex items-center gap-3">
            {!isMobile && <button className="p-1" style={{ color: '#6b5e52' }}><Search className="w-4 h-4" /></button>}
            <button onClick={onCartClick} className="relative p-2" style={{ color: '#6b5e52' }}>
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: primaryColor }}>{cartCount}</span>}
            </button>
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
            <button className="px-9 py-3.5 text-xs border text-white hover:bg-white/12 transition-colors"
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
            <button key={i} className="flex items-center gap-2 text-xs transition-all px-5 py-2"
              style={i === 0 ? { background: primaryColor, color: btnText, letterSpacing: '0.14em', fontFamily: 'system-ui' } : { color: '#8a7a6a', letterSpacing: '0.14em', fontFamily: 'system-ui' }}>
              {c.emoji} {c.name.toUpperCase()}
            </button>
          ))}
        </div>
      </section>
      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} />}

      {/* Products */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-[10px] tracking-[0.38em] mb-3" style={{ color: primaryColor, fontFamily: 'system-ui' }}>CURATED SELECTION</p>
          <h2 className="text-2xl font-bold tracking-wide" style={{ color: '#2a2420' }}>New Arrivals</h2>
          <div className="w-10 h-px mx-auto mt-4" style={{ background: primaryColor }} />
        </div>
        <div className={`grid ${gridCols(device)} gap-6`}>
          {products.map(p => (
            <div key={p.id} className="group cursor-pointer" onClick={() => onProductClick(p)}>
              <div className="relative overflow-hidden mb-4 bg-gray-100" style={{ aspectRatio: '3/4' }}>
                <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform duration-1000" style={{ transform: 'scale(1)', transition: 'transform 1s ease' }} />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[9px] font-bold tracking-widest px-2.5 py-1 text-white" style={{ background: primaryColor, letterSpacing: '0.15em', fontFamily: 'system-ui' }}>
                    {p.badge.toUpperCase()}
                  </span>
                )}
                {/* Add to bag — always visible on mobile, hover on desktop */}
                <div className={`absolute bottom-0 inset-x-0 transition-transform duration-300 ${isMobile ? '' : 'translate-y-full group-hover:translate-y-0'}`}
                  style={{ background: 'rgba(15,10,5,0.88)' }}>
                  <button
                    onClick={e => { e.stopPropagation(); onAddToCart(p); }}
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
                <span className="text-sm font-bold" style={{ color: primaryColor, fontFamily: 'system-ui' }}>{currencySymbol}{p.price}</span>
                {p.originalPrice && <span className="text-xs line-through" style={{ color: '#a09080', fontFamily: 'system-ui' }}>{currencySymbol}{p.originalPrice}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Brand Philosophy */}
      <section className="py-16" style={{ background: '#f5f0e8' }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-[10px] tracking-[0.38em] mb-6" style={{ color: primaryColor, fontFamily: 'system-ui' }}>OUR PHILOSOPHY</p>
          <p className="text-lg font-medium leading-loose italic" style={{ color: '#4a3d32', lineHeight: '1.9' }}>
            "{brandStory || heroSubtitle}"
          </p>
          <div className="w-8 h-px mx-auto mt-6" style={{ background: primaryColor }} />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className={`grid ${isMobile ? 'grid-cols-1 divide-y' : 'grid-cols-3 divide-x'}`} style={{ borderColor: '#e8e3db' }}>
          {features.map((f, i) => (
            <div key={i} className="text-center px-8 py-8">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-xs font-bold tracking-[0.2em] mb-2" style={{ color: '#2a2420', fontFamily: 'system-ui' }}>{f.title.toUpperCase()}</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#8a7a6a', fontFamily: 'system-ui' }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-14" style={{ background: '#f5f0e8' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
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

      {stats && <StatsRow stats={stats} primaryColor={primaryColor} />}
      {faq && faq.length > 0 && <FAQSection faq={faq} primaryColor={primaryColor} device={device} elegant={true} />}
      {newsletter && <NewsletterSection newsletter={newsletter} primaryColor={primaryColor} elegant={true} />}

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

function ModernLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, currencySymbol }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks, products, collections, features, testimonials, tagline, accentColor, faq, stats, promoBar, newsletter, trustBadges } = design;
  const btnText = isDark(primaryColor) ? '#fff' : '#fff';
  const isMobile = device === 'mobile';

  return (
    <div className="bg-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>

      {/* Header */}
      <header className="bg-white/85 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between" style={{ height: '56px' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-bold text-white shadow-md" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
              {storeName[0]}
            </div>
            <span className="text-sm font-bold text-gray-900">{storeName}</span>
          </div>
          {!isMobile && (
            <nav className="flex gap-6">
              {navLinks.map(l => <a key={l} className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">{l}</a>)}
            </nav>
          )}
          <div className="flex items-center gap-1">
            {!isMobile && <button className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"><Search className="w-4 h-4" /></button>}
            <button onClick={onCartClick} className="relative p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors">
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 text-[9px] font-bold text-white rounded-full flex items-center justify-center" style={{ background: primaryColor }}>{cartCount}</span>}
            </button>
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
          <button className="w-full py-3.5 text-sm font-semibold rounded-2xl shadow-lg" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, color: btnText }}>
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
                  <p className="text-[11px] font-bold mt-0.5" style={{ color: primaryColor }}>{currencySymbol}{p.price}</p>
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
                <button className="px-7 py-3.5 text-sm font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:opacity-90 transition-all" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`, color: btnText }}>
                  {ctaText}
                </button>
                <button className="px-7 py-3.5 text-sm font-semibold rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all">
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
                        <p className="text-white/80 text-xs">{currencySymbol}{p.price}</p>
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

      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} />}

      {/* Products */}
      <section className="max-w-6xl mx-auto px-5 py-14" style={{ borderTop: '1px solid #f0f0f0' }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Featured Products</h2>
            <p className="text-sm text-gray-400 mt-1">{tagline}</p>
          </div>
          <a className="text-sm font-semibold flex items-center gap-1.5 hover:gap-2.5 transition-all" style={{ color: primaryColor }}>
            View All <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className={`grid ${gridCols(device)} gap-5`}>
          {products.map(p => (
            <div key={p.id} className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer" onClick={() => onProductClick(p)}>
              <div className="relative aspect-square overflow-hidden bg-gray-50">
                <ProductImg src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {p.badge && (
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm" style={{ background: primaryColor }}>{p.badge}</span>
                )}
                {!isMobile && (
                  <button className="absolute top-3 right-3 w-9 h-9 bg-white rounded-2xl shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50">
                    <Heart className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: alpha(primaryColor, 0.1), color: primaryColor }}>{p.category}</span>
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{p.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{currencySymbol}{p.price}</span>
                    {p.originalPrice && <span className="text-xs text-gray-400 line-through">{currencySymbol}{p.originalPrice}</span>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); onAddToCart(p); }} className="px-3.5 py-2 text-xs font-semibold rounded-xl text-white shadow-sm hover:opacity-90 transition-opacity" style={{ background: primaryColor }}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-14" style={{ background: `linear-gradient(135deg, ${alpha(primaryColor, 0.04)}, ${alpha(accentColor, 0.06)})` }}>
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
      <section className="max-w-6xl mx-auto px-5 py-14">
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

      {stats && <StatsRow stats={stats} primaryColor={primaryColor} />}
      {faq && faq.length > 0 && <FAQSection faq={faq} primaryColor={primaryColor} device={device} />}
      {newsletter && <NewsletterSection newsletter={newsletter} primaryColor={primaryColor} />}

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

function PlayfulLayout({ storeName, primaryColor, design, device, onProductClick, onAddToCart, onCartClick, cartCount, currencySymbol }: LayoutProps) {
  const { heroTitle, heroSubtitle, ctaText, navLinks, products, collections, features, testimonials, tagline, accentColor, faq, stats, promoBar, newsletter, trustBadges } = design;
  const heroTextColor = isDark(primaryColor) ? '#fff' : '#111';
  const isMobile = device === 'mobile';

  return (
    <div className="bg-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <header className="bg-white border-b-2 border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between" style={{ height: '56px' }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{collections[0]?.emoji}</span>
            <span className="text-sm font-black text-gray-900">{storeName}</span>
          </div>
          {!isMobile && (
            <nav className="flex gap-2">
              {navLinks.map((l, i) => (
                <a key={l} className="px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer"
                  style={i === 0 ? { background: primaryColor, color: heroTextColor } : { color: '#555', background: '#f5f5f5' }}>
                  {l}
                </a>
              ))}
            </nav>
          )}
          <button onClick={onCartClick} className="relative p-2">
            <ShoppingCart className="w-5 h-5 text-gray-700" />
            {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 text-[9px] font-black text-white rounded-full flex items-center justify-center" style={{ background: accentColor }}>{cartCount}</span>}
          </button>
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
              <button className="px-7 py-3.5 text-sm font-black rounded-2xl shadow-xl hover:scale-105 transition-transform bg-white" style={{ color: primaryColor }}>
                {ctaText} 🛍️
              </button>
              <button className="px-7 py-3.5 text-sm font-bold rounded-2xl border-2 hover:bg-white/12 transition-colors" style={{ borderColor: `${heroTextColor}40`, color: heroTextColor }}>
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
                      <p className="text-xs font-black mt-0.5" style={{ color: primaryColor }}>{currencySymbol}{p.price}</p>
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
            <button key={i} className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border-2 transition-all hover:scale-105"
              style={i === 0 ? { background: primaryColor, borderColor: primaryColor, color: heroTextColor } : { borderColor: '#e5e7eb', color: '#374151' }}>
              <span className="text-base">{c.emoji}</span> {c.name}
            </button>
          ))}
        </div>
      </section>
      {trustBadges && <TrustBadgesRow badges={trustBadges} primaryColor={primaryColor} />}

      {/* Products */}
      <section className="max-w-6xl mx-auto px-5 py-12">
        <div className="flex items-end justify-between mb-7">
          <div>
            <h2 className="text-2xl font-black text-gray-900">{collections[0]?.emoji} Our Picks</h2>
            <p className="text-sm text-gray-400 mt-1">{tagline}</p>
          </div>
          <a className="text-sm font-black flex items-center gap-1.5 hover:gap-2.5 transition-all" style={{ color: primaryColor }}>
            See All <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className={`grid ${gridCols(device)} gap-4`}>
          {products.map((p, idx) => (
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
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1.5" style={{ background: alpha(primaryColor, 0.1), color: primaryColor }}>{p.category}</p>
                <p className="text-sm font-black text-gray-900 truncate">{p.name}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black" style={{ color: primaryColor }}>{currencySymbol}{p.price}</span>
                    {p.originalPrice && <span className="text-xs text-gray-400 line-through">{currencySymbol}{p.originalPrice}</span>}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onAddToCart(p); }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black text-white hover:opacity-85 transition-opacity"
                    style={{ background: idx % 2 === 0 ? primaryColor : accentColor }}
                  >
                    <ShoppingCart className="w-3 h-3" /> Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-12" style={{ background: alpha(primaryColor, 0.04) }}>
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
      <section className="max-w-6xl mx-auto px-5 py-12">
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

      {stats && <StatsRow stats={stats} primaryColor={primaryColor} />}
      {faq && faq.length > 0 && <FAQSection faq={faq} primaryColor={primaryColor} device={device} />}
      {newsletter && <NewsletterSection newsletter={newsletter} primaryColor={primaryColor} />}

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

function FallbackLayout({ store, device, onProductClick, onAddToCart, onCartClick, cartCount }: {
  store: Store; device: DeviceMode;
  onProductClick: (p: RichProduct) => void;
  onAddToCart: (p: RichProduct) => void;
  onCartClick: () => void;
  cartCount: number;
}) {
  const primaryColor = store.primaryColor || '#10b981';
  const currencySymbol = store.currency?.symbol ?? '$';
  const template = store.template;
  const products = (template?.demoProducts || []).map(p => ({ ...p, description: '' })) as RichProduct[];

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
            <button className="p-2 rounded-lg hover:bg-slate-100"><Heart className="w-4 h-4 text-slate-500" /></button>
            <button onClick={onCartClick} className="relative flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl" style={{ background: primaryColor }}>
              <ShoppingCart className="w-4 h-4" />{device !== 'mobile' && <span>Cart</span>}
              {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 text-[9px] font-bold text-white rounded-full flex items-center justify-center bg-rose-500">{cartCount}</span>}
            </button>
          </div>
        </div>
      </div>
      <div className="relative overflow-hidden" style={{ height: device === 'mobile' ? '200px' : '320px', background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)` }}>
        {template?.image && <img src={template.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
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
              </div>
              <div className="p-3">
                <p className="text-xs text-slate-400 mb-1">{p.category}</p>
                <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-slate-900">{currencySymbol}{p.price}</span>
                  <button onClick={e => { e.stopPropagation(); onAddToCart(p); }} className="px-3 py-1.5 text-xs font-semibold rounded-xl text-white" style={{ background: primaryColor }}>Add</button>
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

  const design = store.design as StoreDesign | undefined;
  const primaryColor = store.primaryColor || '#10b981';
  const storeName = store.name;
  const currencySymbol = store.currency?.symbol ?? '$';
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const shipping = cartTotal > 0 && cartTotal < 100 ? 9.99 : 0;

  const addToCart = (p: RichProduct) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === p.id);
      if (existing) return prev.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev.map(i => i.product.id === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0)
    );
  };

  const shared = {
    onProductClick: (p: RichProduct) => { setSelectedProduct(p); setPage('product'); },
    onAddToCart: addToCart,
    onCartClick: () => setPage('cart'),
    cartCount,
  };

  if (page === 'product' && selectedProduct) {
    return <ProductDetailPage product={selectedProduct} primaryColor={primaryColor} storeName={storeName} device={device} currencySymbol={currencySymbol} onBack={() => setPage('home')} onAddToCart={addToCart} onCartClick={() => setPage('cart')} cartCount={cartCount} />;
  }
  if (page === 'cart') {
    return <CartPage cart={cart} primaryColor={primaryColor} storeName={storeName} device={device} currencySymbol={currencySymbol} onBack={() => setPage('home')} onCheckout={() => setPage('checkout')} onUpdateQty={updateQty} />;
  }
  if (page === 'checkout') {
    return <CheckoutPage cart={cart} primaryColor={primaryColor} storeName={storeName} device={device} currencySymbol={currencySymbol} onBack={() => setPage('cart')} onPlaceOrder={() => { setPage('success'); }} />;
  }
  if (page === 'success') {
    return <SuccessPage primaryColor={primaryColor} storeName={storeName} orderNum={orderNum} total={cartTotal + shipping} currencySymbol={currencySymbol} onContinue={() => { setCart([]); setPage('home'); }} />;
  }

  if (!design) return <FallbackLayout store={store} device={device} {...shared} />;

  const props: LayoutProps = { storeName, primaryColor, design, device, currencySymbol, ...shared };

  switch (design.layoutStyle) {
    case 'minimal':  return <MinimalLayout {...props} />;
    case 'bold':     return <BoldLayout {...props} />;
    case 'elegant':  return <ElegantLayout {...props} />;
    case 'modern':   return <ModernLayout {...props} />;
    case 'playful':  return <PlayfulLayout {...props} />;
    default:         return <MinimalLayout {...props} />;
  }
}
