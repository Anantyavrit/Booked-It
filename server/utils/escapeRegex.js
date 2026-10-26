/**
 * Shared escapeRegex helper
 * Escapes regex special characters and limits input length to 100 characters
 * to prevent ReDoS (Regular Expression Denial of Service).
 */
export const escapeRegex = (text) => {
  if (!text) return '';
  const trimmed = String(text).slice(0, 100);
  return trimmed.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

export default escapeRegex;
