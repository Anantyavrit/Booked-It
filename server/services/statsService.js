import mongoose from 'mongoose';
import Movie from '../models/Movie.js';
import Theatre from '../models/Theatre.js';
import Show from '../models/Show.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getDayBoundaries(daysAgo) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return cutoff;
}

// Returns "YYYY-MM-DD" in IST for a UTC Date
function toISTDateString(utcDate) {
  const ist = new Date(utcDate.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getStats() {
  const now = new Date();
  const last7 = getDayBoundaries(7);
  const last30 = getDayBoundaries(30);
  const last14 = getDayBoundaries(14);

  const [
    totalMovies,
    totalTheatres,
    upcomingShows,
    bookingStats,
    totalUsers,
    revenueByDayRaw,
    topMoviesRaw,
    occupancyRaw,
  ] = await Promise.all([
    Movie.countDocuments(),
    Theatre.countDocuments(),
    Show.countDocuments({ startTime: { $gt: now } }),
    // confirmed+cancelled counts + revenue breakdowns
    Booking.aggregate([
      {
        $facet: {
          confirmed: [{ $match: { status: 'confirmed' } }, { $count: 'count' }],
          cancelled: [{ $match: { status: 'cancelled' } }, { $count: 'count' }],
          totalRevenue: [
            { $match: { status: 'confirmed' } },
            { $group: { _id: null, sum: { $sum: '$amount' } } },
          ],
          last7Revenue: [
            { $match: { status: 'confirmed', createdAt: { $gte: last7 } } },
            { $group: { _id: null, sum: { $sum: '$amount' } } },
          ],
          last30Revenue: [
            { $match: { status: 'confirmed', createdAt: { $gte: last30 } } },
            { $group: { _id: null, sum: { $sum: '$amount' } } },
          ],
        },
      },
    ]),
    User.countDocuments({ role: 'user' }),
    // revenue by day: last 14 days, confirmed bookings grouped by IST date
    Booking.aggregate([
      { $match: { status: 'confirmed', createdAt: { $gte: last14 } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: { $add: ['$createdAt', IST_OFFSET_MS] },
            },
          },
          revenue: { $sum: '$amount' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // top 5 movies by confirmed booking count + revenue
    Booking.aggregate([
      { $match: { status: 'confirmed' } },
      {
        $lookup: {
          from: 'shows',
          localField: 'show',
          foreignField: '_id',
          as: 'showDoc',
        },
      },
      { $unwind: '$showDoc' },
      {
        $group: {
          _id: '$showDoc.movie',
          bookings: { $sum: 1 },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { bookings: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'movies',
          localField: '_id',
          foreignField: '_id',
          as: 'movieDoc',
        },
      },
      { $unwind: '$movieDoc' },
      {
        $project: {
          movieId: '$_id',
          title: '$movieDoc.title',
          bookings: 1,
          revenue: 1,
          _id: 0,
        },
      },
    ]),
    // next 5 upcoming shows with seat occupancy
    Show.aggregate([
      { $match: { startTime: { $gt: now } } },
      { $sort: { startTime: 1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'movies',
          localField: 'movie',
          foreignField: '_id',
          as: 'movieDoc',
        },
      },
      { $unwind: '$movieDoc' },
      {
        $lookup: {
          from: 'theatres',
          localField: 'theatre',
          foreignField: '_id',
          as: 'theatreDoc',
        },
      },
      { $unwind: '$theatreDoc' },
      {
        $lookup: {
          from: 'seats',
          let: { showId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$show', '$$showId'] } } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                booked: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'booked'] }, 1, 0],
                  },
                },
              },
            },
          ],
          as: 'seatStats',
        },
      },
      {
        $project: {
          showId: '$_id',
          movieTitle: '$movieDoc.title',
          startTime: 1,
          screenName: 1,
          booked: { $ifNull: [{ $arrayElemAt: ['$seatStats.booked', 0] }, 0] },
          total: { $ifNull: [{ $arrayElemAt: ['$seatStats.total', 0] }, 0] },
          _id: 0,
        },
      },
    ]),
  ]);

  // Flatten bookingStats facet
  const bs = bookingStats[0] || {};
  const confirmedCount = bs.confirmed?.[0]?.count || 0;
  const cancelledCount = bs.cancelled?.[0]?.count || 0;
  const totalRevenue = bs.totalRevenue?.[0]?.sum || 0;
  const last7Revenue = bs.last7Revenue?.[0]?.sum || 0;
  const last30Revenue = bs.last30Revenue?.[0]?.sum || 0;

  // Fill in zero-revenue days for the last 14 days
  const dayMap = {};
  for (const d of revenueByDayRaw) {
    dayMap[d._id] = { revenue: d.revenue, bookings: d.bookings };
  }
  const revenueByDay = [];
  for (let i = 13; i >= 0; i--) {
    const date = toISTDateString(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
    revenueByDay.push({
      date,
      revenue: dayMap[date]?.revenue || 0,
      bookings: dayMap[date]?.bookings || 0,
    });
  }

  return {
    totals: {
      movies: totalMovies,
      theatres: totalTheatres,
      upcomingShows,
      confirmedBookings: confirmedCount,
      cancelledBookings: cancelledCount,
      users: totalUsers,
    },
    revenue: {
      total: totalRevenue,
      last7Days: last7Revenue,
      last30Days: last30Revenue,
    },
    revenueByDay,
    topMovies: topMoviesRaw,
    occupancy: occupancyRaw,
  };
}
