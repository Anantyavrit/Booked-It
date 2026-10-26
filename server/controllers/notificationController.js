import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parsePagination, buildPaginationMeta } from '../utils/queryHelpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get user's notifications (newest first, paginated)
// @route   GET /api/notifications
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const getMyNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [total, notifications] = await Promise.all([
    Notification.countDocuments({ user: req.user._id }),
    Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('booking', 'bookingCode seats amount status'),
  ]);

  res.json({
    success: true,
    pagination: buildPaginationMeta(total, page, limit),
    data: notifications,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Mark a notification as read (owner only)
// @route   PATCH /api/notifications/:id/read
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  if (notification.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorised to update this notification');
  }

  notification.read = true;
  await notification.save();

  res.json({
    success: true,
    data: notification,
  });
});
