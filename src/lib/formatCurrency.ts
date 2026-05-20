/**
 * Locale-aware currency formatter.
 * Returns a formatted price string including the currency symbol,
 * using the correct thousands/decimal separator for each locale.
 *
 * Examples:
 *   formatPrice(1500000, 'IDR') → 'Rp1.500.000'
 *   formatPrice(1234,    'USD') → '$1,234'
 *   formatPrice(1234,    'EUR') → '1.234 €'
 *   formatPrice(1234,    'GBP') → '£1,234'
 *   formatPrice(1234,    'JPY') → '¥1,234'
 */

interface CurrencyConfig {
  locale: string;
  symbol: string;
  symbolAfter?: boolean; // symbol goes after the number (e.g. EUR in Europe)
  decimals: number;
}

const CURRENCY_CONFIG: Record<string, CurrencyConfig> = {
  USD: { locale: 'en-US', symbol: '$',   decimals: 0 },
  IDR: { locale: 'id-ID', symbol: 'Rp',  decimals: 0 },
  EUR: { locale: 'de-DE', symbol: '€',   symbolAfter: true, decimals: 0 },
  GBP: { locale: 'en-GB', symbol: '£',   decimals: 0 },
  JPY: { locale: 'ja-JP', symbol: '¥',   decimals: 0 },
  SGD: { locale: 'en-SG', symbol: 'S$',  decimals: 0 },
  AUD: { locale: 'en-AU', symbol: 'A$',  decimals: 0 },
  MYR: { locale: 'ms-MY', symbol: 'RM',  decimals: 0 },
};

export function formatPrice(amount: number, currencyCode = 'USD'): string {
  const cfg = CURRENCY_CONFIG[currencyCode] ?? CURRENCY_CONFIG['USD'];
  const formatted = new Intl.NumberFormat(cfg.locale, {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  }).format(Math.round(amount));
  return cfg.symbolAfter ? `${formatted} ${cfg.symbol}` : `${cfg.symbol}${formatted}`;
}

/** Shorthand: create a bound formatter for one currency code. */
export function makePriceFmt(currencyCode = 'USD') {
  return (amount: number) => formatPrice(amount, currencyCode);
}
