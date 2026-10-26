/**
 * Seed Script — creates one admin user.
 *
 * Reads ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD from .env.
 * Skips if that email already exists (safe to run multiple times).
 *
 * Run with:  npm run seed:admin
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error('Missing ADMIN_NAME, ADMIN_EMAIL or ADMIN_PASSWORD in .env');
      process.exit(1);
    }

    // Check if admin already exists
    const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (existing) {
      console.log(`Admin already exists: ${ADMIN_EMAIL}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create the admin — password gets hashed by the pre-save hook
    const admin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL.toLowerCase(),
      password: ADMIN_PASSWORD,
      role: 'admin',          // explicitly set to admin here in seed only
    });

    console.log(`Admin created successfully: ${admin.email}`);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }

  await mongoose.disconnect();
  process.exit(0);
};

seed();
