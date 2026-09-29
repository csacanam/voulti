// Whole amounts keep no decimals ("50,000" COP), amounts with cents show both
// digits ("0.44", "10.50"). Rounding to 0 digits turned a $0.44 invoice into "0".
export const formatFiatNumber = (amount: number, language: string) => {
  const locale = language === 'es' ? 'es-CO' : 'en-US';
  const digits = Number.isInteger(amount) ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
};
