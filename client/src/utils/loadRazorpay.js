let razorpayPromise = null;

/**
 * loadRazorpay()
 * Loads the official Razorpay checkout script once and caches the promise.
 * Rejects gracefully on network failure or adblock blocks.
 */
export function loadRazorpay() {
  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }

  if (razorpayPromise) {
    return razorpayPromise;
  }

  razorpayPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        razorpayPromise = null;
        reject(new Error('Razorpay SDK failed to initialize'));
      }
    };

    script.onerror = () => {
      razorpayPromise = null;
      reject(
        new Error(
          'Failed to load Razorpay checkout SDK. Please check your internet connection or disable ad-blockers.'
        )
      );
    };

    document.body.appendChild(script);
  });

  return razorpayPromise;
}
