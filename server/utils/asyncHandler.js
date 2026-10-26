/**
 * asyncHandler - wraps async controller functions so we don't need
 * try/catch in every controller. Any rejected promise flows to
 * Express's central error handler via next(err).
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
