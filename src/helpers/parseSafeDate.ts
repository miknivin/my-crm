/**
 * Safely parse a date argument.
 * Supports:
 *  - ISO date strings (e.g., "2026-02-01")
 *  - JS date expressions (e.g., "new Date(new Date().setMonth(new Date().getMonth() - 1, 1))")
 */
export function parseSafeDate(arg: string): Date {
  if (!arg || typeof arg !== 'string') {
    throw new Error('Invalid date argument: must be a string');
  }

  arg = arg.trim();

  // 1️⃣ Try ISO date string
  const isoDate = new Date(arg);
  if (!isNaN(isoDate.getTime()) && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(arg)) {
    return isoDate;
  }

  // 2️⃣ If not ISO, treat as JS date expression
  // Only allow safe date methods
  const allowedPatterns = [
    /new Date\(/g,
    /\.setDate\(/g,
    /\.setMonth\(/g,
    /\.setFullYear\(/g,
    /\.setHours\(/g,
    /\.setMinutes\(/g,
    /\.setSeconds\(/g,
    /\.setMilliseconds\(/g,
    /\.getDate\(\)/g,
    /\.getMonth\(\)/g,
    /\.getFullYear\(\)/g,
    /\.getHours\(\)/g,
    /\.getMinutes\(\)/g,
    /\.getSeconds\(\)/g,
    /\.getMilliseconds\(\)/g,
    /[0-9+\-(), ]+/g
  ];

  let exprCopy = arg;
  for (const pattern of allowedPatterns) {
    exprCopy = exprCopy.replace(pattern, '');
  }

  if (exprCopy.trim().length > 0) {
    throw new Error(`Unsafe or unsupported expression detected: "${exprCopy}"`);
  }

  const result = eval(arg); // trusted environment
  if (!(result instanceof Date) || isNaN(result.getTime())) {
    throw new Error(`Expression did not evaluate to a valid Date: "${arg}"`);
  }

  return result;
}