import Razorpay from 'razorpay';

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret || key_id.includes('placeholder')) {
  console.warn(
    '[Razorpay Warning]: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured or using placeholder. Payment endpoints will require valid test keys.'
  );
}

// Instantiate Razorpay client with fallback strings to avoid crashing if empty
export const razorpay = new Razorpay({
  key_id: key_id || 'rzp_test_none',
  key_secret: key_secret || 'rzp_secret_none',
});
