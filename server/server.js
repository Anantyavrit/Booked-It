import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { validateEnv } from './config/validateEnv.js';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import mongoSanitize from './middleware/mongoSanitize.js';
import { requestLogger } from './utils/logger.js';
import authRoutes         from './routes/authRoutes.js';
import movieRoutes        from './routes/movieRoutes.js';
import theatreRoutes      from './routes/theatreRoutes.js';
import showRoutes         from './routes/showRoutes.js';
import bookingRoutes      from './routes/bookingRoutes.js';
import paymentRoutes      from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes        from './routes/adminRoutes.js';
import { handleWebhook }  from './controllers/paymentController.js';
import { startHoldCleanup, stopHoldCleanup } from './utils/holdCleanup.js';
import { initSocket } from './utils/socket.js';
import './config/razorpay.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 1. Startup validation (must be called first) ──────────────────────────────
validateEnv();

// ── 2. Connect to MongoDB ─────────────────────────────────────────────────────
await connectDB();

// ── 3. App + HTTP server ──────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── 4. Initialize Socket.io ───────────────────────────────────────────────────
const io = initSocket(server);

// ── 5. Security & Pre-Routing Middleware (order matters) ──────────────────────
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Remove X-Powered-By
app.disable('x-powered-by');

// Helmet security headers (with Razorpay script allowance for dev tester)
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
              styleSrc: ["'self'", "'unsafe-inline'"],
              connectSrc: ["'self'", 'ws:', 'wss:', 'https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
              frameSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
              imgSrc: ["'self'", 'data:', 'https:'],
            },
          }
        : false,
    crossOriginEmbedderPolicy: false,
  })
);

// Compression
app.use(compression());

// Single origin CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: false,
  })
);

// Request duration / error logger
app.use(requestLogger);

// ── 6. Webhook Route (RAW BODY parsing required before express.json) ──────────
// Webhook route is exempt from general rate limiters and body sanitizers
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  handleWebhook
);

// Global JSON & URL-encoded parsing (clamped to 10kb)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// NoSQL injection sanitizer (strips keys starting with $ or containing .)
app.use(mongoSanitize);

// Static uploads
app.use('/uploads', express.static('uploads'));

// ── 7. Dev-only Checkout Test Page (not registered outside development) ──────
if (process.env.NODE_ENV === 'development') {
app.get('/dev/checkout-test', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>IMovies - Dev Razorpay Checkout Test</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body { background: #0f172a; color: #f8fafc; font-family: sans-serif; padding: 2rem; max-width: 600px; margin: auto; }
    input, button, textarea { width: 100%; padding: 0.75rem; margin-top: 0.5rem; margin-bottom: 1rem; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: white; box-sizing: border-box; }
    button { background: #e11d48; cursor: pointer; font-weight: bold; border: none; }
    button:hover { background: #be123c; }
    pre { background: #020617; padding: 1rem; border-radius: 6px; overflow-x: auto; color: #38bdf8; }
  </style>
</head>
<body>
  <h2>💳 Dev Razorpay Checkout Tester</h2>
  <p style="color: #94a3b8; font-size: 0.9rem;">Test creating a Razorpay order, opening the test modal, and verifying signature.</p>
  
  <label>JWT Token (Bearer):</label>
  <textarea id="token" rows="3" placeholder="Paste your JWT token here"></textarea>

  <label>Pending Booking ID:</label>
  <input type="text" id="bookingId" placeholder="e.g. 64a8b...">

  <button id="payBtn">Pay with Razorpay</button>

  <h3>Result:</h3>
  <pre id="result">Waiting for action...</pre>

  <script>
    const resultEl = document.getElementById('result');

    document.getElementById('payBtn').addEventListener('click', async () => {
      const token = document.getElementById('token').value.trim();
      const bookingId = document.getElementById('bookingId').value.trim();

      if (!token || !bookingId) {
        alert('Please provide both JWT token and Booking ID');
        return;
      }

      resultEl.textContent = 'Creating Razorpay order...';

      try {
        const orderRes = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ bookingId })
        });

        const orderData = await orderRes.json();
        resultEl.textContent = 'Order response:\n' + JSON.stringify(orderData, null, 2);

        if (!orderData.success) return;

        const { orderId, amount, currency, keyId } = orderData.data;

        const options = {
          key: keyId,
          amount: amount,
          currency: currency,
          name: 'IMovies Cinema',
          description: 'Movie Ticket Booking',
          order_id: orderId,
          handler: async function (response) {
            resultEl.textContent = 'Payment successful. Verifying signature on server...';
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();
            resultEl.textContent = 'Verification Result:\n' + JSON.stringify(verifyData, null, 2);
          },
          theme: { color: '#e11d48' }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', async function (response) {
          resultEl.textContent = 'Payment Failed:\n' + JSON.stringify(response.error, null, 2);
          await fetch('/api/payments/failed', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
              razorpay_order_id: orderId,
              reason: response.error?.description || 'Checkout modal dismissed or failed'
            })
          });
        });

        rzp.open();
      } catch (err) {
        resultEl.textContent = 'Error: ' + err.message;
      }
    });
  </script>
</body>
</html>`);
});
}

// ── 9. General Rate Limiter on /api (300 requests per 15 min per IP) ─────────
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

app.use('/api', generalApiLimiter);

// Health is intentionally covered by the general /api limiter as well.
app.get('/api/health', (_req, res) =>
  res.json({
    ok: true,
    uptime: Math.floor(process.uptime()),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
);

// ── 10. API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/movies',        movieRoutes);
app.use('/api/theatres',      theatreRoutes);
app.use('/api/shows',         showRoutes);
app.use('/api/bookings',      bookingRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin',         adminRoutes);

// ── 10b. Serve the built React client (single-service deployment) ────────────
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: '1h', index: false }));
    // SPA fallback: anything that is not an API / upload / socket route
    app.get(/^\/(?!api\/|uploads\/|socket\.io\/).*/, (_req, res) =>
      res.sendFile(path.join(clientDist, 'index.html'))
    );
  } else {
    console.warn('[Server] client/dist not found - API only mode. Run the client build.');
  }
}

// ── 11. Error Handling (always last) ──────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── 12. Start server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  startHoldCleanup();
});

// ── 13. Graceful Shutdown & Process Handlers ──────────────────────────────────
let isShuttingDown = false;
const handleShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[Server] ${signal} signal received. Starting graceful shutdown...`);

  // Force close process if cleanup takes more than 10 seconds
  const forceTimer = setTimeout(() => {
    console.error('[Server] Cleanup took too long. Forcefully terminating.');
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  server.close(async () => {
    console.log('[Server] HTTP connections closed.');
    stopHoldCleanup();
    console.log('[Server] Hold cleanup scheduler stopped.');

    if (io) {
      io.close();
      console.log('[Server] Socket.io server closed.');
    }

    try {
      await mongoose.connection.close(false);
      console.log('[Server] MongoDB connection closed.');
    } catch (err) {
      console.error('[Server] Error closing MongoDB:', err.message);
    }

    clearTimeout(forceTimer);
    console.log('[Server] Graceful shutdown complete. Exiting.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT',  () => handleShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
  handleShutdown('uncaughtException');
});

export { io };
