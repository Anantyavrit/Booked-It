/**
 * Reusable server-side input validators.
 * Each function returns an error string on failure, or null on pass.
 */

export const validateEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return 'Email is required';
  }
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
};

export const validateName = (name) => {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'Name is required';
  }
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  if (name.trim().length > 50) return 'Name cannot exceed 50 characters';
  return null;
};

/**
 * Collect multiple validation results and throw a 400-shaped error
 * if any exist. Pass an array of [validator(value), ...] results.
 * Usage: throwIfInvalid(res, [validateName(name), validateEmail(email)])
 */
export const collectErrors = (...results) => {
  return results.filter(Boolean); // keep non-null (failing) messages
};
