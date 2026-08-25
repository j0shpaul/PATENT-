/**
 * PATENT+ Centralized Jurisdiction-Aware Currency Formatting Utility
 * 
 * Automatically converts and formats patent renewal/maintenance costs
 * based on the patent's specific filing jurisdiction (US, EP, IN, GB, JP, CN, AU, CA).
 */

export const CURRENCY_BY_JURISDICTION = {
  US: { currency: "USD", locale: "en-US", rateFromUSD: 1.0, symbol: "$", name: "US Dollar" },
  EP: { currency: "EUR", locale: "en-IE", rateFromUSD: 0.92, symbol: "€", name: "Euro" },
  IN: { currency: "INR", locale: "en-IN", rateFromUSD: 83.7, symbol: "₹", name: "Indian Rupee" },
  GB: { currency: "GBP", locale: "en-GB", rateFromUSD: 0.79, symbol: "£", name: "British Pound" },
  JP: { currency: "JPY", locale: "ja-JP", rateFromUSD: 155.0, symbol: "¥", name: "Japanese Yen" },
  CN: { currency: "CNY", locale: "zh-CN", rateFromUSD: 7.25, symbol: "¥", name: "Chinese Yuan" },
  AU: { currency: "AUD", locale: "en-AU", rateFromUSD: 1.52, symbol: "A$", name: "Australian Dollar" },
  CA: { currency: "CAD", locale: "en-CA", rateFromUSD: 1.36, symbol: "C$", name: "Canadian Dollar" }
};

/**
 * Normalizes varied jurisdiction representations into canonical 2-letter codes.
 *
 * @param {string} jurisdiction - Raw jurisdiction string (e.g. "USPTO", "European Patent Office", "India")
 * @returns {string} 2-letter jurisdiction code (e.g. "US", "EP", "IN")
 */
export function normalizeJurisdiction(jurisdiction) {
  if (!jurisdiction || typeof jurisdiction !== 'string') {
    return 'IN'; // Safe fallback when genuinely missing
  }

  const clean = jurisdiction.trim().toUpperCase();

  if (clean === 'US' || clean.includes('USPTO') || clean.includes('UNITED STATES') || clean.includes('USA')) {
    return 'US';
  }
  if (clean === 'EP' || clean.includes('EPO') || clean.includes('EUROPE') || clean.includes('EU')) {
    return 'EP';
  }
  if (clean === 'IN' || clean.includes('INDIA') || clean.includes('IPO') || clean.includes('IP INDIA')) {
    return 'IN';
  }
  if (clean === 'GB' || clean === 'UK' || clean.includes('UNITED KINGDOM') || clean.includes('BRITAIN') || clean.includes('UKIPO')) {
    return 'GB';
  }
  if (clean === 'JP' || clean.includes('JAPAN') || clean.includes('JPO')) {
    return 'JP';
  }
  if (clean === 'CN' || clean.includes('CHINA') || clean.includes('CNIPA') || clean.includes('SIPO')) {
    return 'CN';
  }
  if (clean === 'AU' || clean.includes('AUSTRALIA') || clean.includes('IP AUSTRALIA')) {
    return 'AU';
  }
  if (clean === 'CA' || clean.includes('CANADA') || clean.includes('CIPO')) {
    return 'CA';
  }

  return 'IN'; // Default fallback
}

/**
 * Retrieves the currency configuration for a given jurisdiction.
 *
 * @param {string} jurisdiction - Raw or canonical jurisdiction string
 * @returns {Object} Currency configuration object
 */
export function getCurrencyConfig(jurisdiction) {
  const code = normalizeJurisdiction(jurisdiction);
  return CURRENCY_BY_JURISDICTION[code] || CURRENCY_BY_JURISDICTION.IN;
}

/**
 * Formats a patent renewal/maintenance cost according to its specific jurisdiction currency.
 *
 * @param {number|string} cost - The base cost value (in USD or normalized float)
 * @param {string} jurisdiction - The patent jurisdiction (e.g. "US", "EP", "IN", "GB")
 * @param {Object} options - Formatting options
 * @param {boolean} options.showCode - If true, appends the currency code (e.g. "$1,600 USD")
 * @param {boolean} options.showFreq - If true, appends "/year"
 * @param {number} options.maximumFractionDigits - Decimal places (default: 0)
 * @returns {string} Fully formatted cost string matching the jurisdiction
 */
export function formatPatentCost(cost, jurisdiction, options = {}) {
  if (cost === null || cost === undefined || cost === '' || isNaN(Number(cost))) {
    return '—';
  }

  const numCost = Number(cost);
  const config = getCurrencyConfig(jurisdiction);
  const converted = Math.round(numCost * config.rateFromUSD);

  let formatted = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
    minimumFractionDigits: 0
  }).format(converted);

  if (options.showCode) {
    formatted = `${formatted} ${config.currency}`;
  }

  if (options.showFreq) {
    formatted = `${formatted} /year`;
  }

  return formatted;
}

/**
 * Formats aggregate portfolio renewal exposure.
 *
 * @param {number} totalUSD - Total aggregate portfolio renewal cost
 * @param {Object} options - Formatting options
 * @returns {string} Compact or formatted exposure string
 */
export function formatPortfolioExposure(totalUSD, options = {}) {
  if (!totalUSD || isNaN(Number(totalUSD))) return '$0';
  const total = Number(totalUSD);

  if (total >= 1000000) {
    return `$${(total / 1000000).toFixed(1)}M`;
  }
  if (total >= 1000) {
    return `$${Math.round(total / 1000)}k`;
  }
  return `$${Math.round(total).toLocaleString()}`;
}

/**
 * Legacy compatibility helper for INR formatting.
 */
export function formatINRFromUSD(usdAmount, options = {}) {
  return formatPatentCost(usdAmount, 'IN', options);
}

/**
 * Scans and converts embedded fee references in plain-English rationales
 * to match the patent's jurisdiction currency.
 *
 * @param {string} text - Raw rationale text
 * @param {string} jurisdiction - Patent jurisdiction
 * @returns {string} Formatted text with jurisdiction-aware currency
 */
export function sanitizeCurrencyText(text, jurisdiction = 'US') {
  if (!text || typeof text !== 'string') return text;

  // Replace patterns like $4,200 or ₹3,51,540 or €1,900
  return text.replace(/([$€₹£¥])\s*([\d,]+(?:\.\d+)?)\s*(M|K|k|B|Cr|Lakh)?/g, (match, symbol, numStr, suffix) => {
    let cleanNum = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(cleanNum)) return match;

    // If source symbol was INR, normalize back to USD base first
    if (symbol === '₹') {
      cleanNum = cleanNum / CURRENCY_BY_JURISDICTION.IN.rateFromUSD;
    } else if (symbol === '€') {
      cleanNum = cleanNum / CURRENCY_BY_JURISDICTION.EP.rateFromUSD;
    }

    if (suffix) {
      const s = suffix.toUpperCase();
      if (s === 'M') cleanNum *= 1000000;
      else if (s === 'K') cleanNum *= 1000;
      else if (s === 'B') cleanNum *= 1000000000;
    }

    return formatPatentCost(cleanNum, jurisdiction);
  });
}
