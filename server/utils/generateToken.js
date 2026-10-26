import jwt from 'jsonwebtoken';

/**
 * Signs a JWT containing the user's id and role.
 * Expires in 7 days. Secret comes from .env only.
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export default generateToken;
