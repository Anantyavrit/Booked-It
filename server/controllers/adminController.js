import asyncHandler from '../utils/asyncHandler.js';
import { getStats } from '../services/statsService.js';

// @desc  Get admin dashboard stats
// @route GET /api/admin/stats
// @access Private/Admin
export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await getStats();
  res.json({ success: true, data: stats });
});
