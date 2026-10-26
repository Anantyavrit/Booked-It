import mongoose from 'mongoose';

/**
 * Middleware factory: validates that req.params[param] is a valid MongoDB ObjectId.
 * Returns 400 (not 500) for malformed ids so the error is clear.
 */
const validateObjectId = (param = 'id') => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[param])) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${param}: "${req.params[param]}" is not a valid ID`,
    });
  }
  next();
};

export default validateObjectId;
