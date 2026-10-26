/**
 * Environment Variable Startup Validation
 * Runs before any server resources or database connections are initialized.
 * Never prints secret values to stdout/stderr.
 */

export const validateEnv = () => {
  const missing = [];

  // Required variables
  if (!process.env.MONGO_URI || !process.env.MONGO_URI.trim()) {
    missing.push('MONGO_URI');
  }

  if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    missing.push('JWT_SECRET');
  }

  if (!process.env.CLIENT_URL || !process.env.CLIENT_URL.trim()) {
    missing.push('CLIENT_URL');
  }

  // If any required variables are missing, exit immediately
  if (missing.length > 0) {
    console.error(`\n❌ [Fatal Error] Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please configure these in your .env file or environment before starting the server.\n');
    process.exit(1);
  }

  // Production security checks
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET.length < 32) {
      console.error('\n❌ [Fatal Error] In production, JWT_SECRET must be at least 32 characters long for cryptographic security.\n');
      process.exit(1);
    }
  }

  // Default allowed for PORT
  if (!process.env.PORT) {
    process.env.PORT = '5000';
  }

  if (process.env.NODE_ENV === 'production' && !process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.warn('⚠️  [Warning] RAZORPAY_WEBHOOK_SECRET is not set; webhooks will be rejected.');
  }

  // Warnings for non-critical services (Razorpay)
  const missingRazorpay = [];
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_placeholder') {
    missingRazorpay.push('RAZORPAY_KEY_ID');
  }
  if (!process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === 'rzp_secret_placeholder') {
    missingRazorpay.push('RAZORPAY_KEY_SECRET');
  }

  if (missingRazorpay.length > 0) {
    console.warn(`⚠️  [Warning] Razorpay keys not configured or using placeholder (${missingRazorpay.join(', ')}). Live payments will be simulated or disabled.`);
  }
};
