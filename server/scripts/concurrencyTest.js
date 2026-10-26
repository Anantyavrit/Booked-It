/**
 * Concurrency Test Script
 *
 * Simulates two users attempting to hold the EXACT SAME seat at the exact same millisecond.
 * Verifies that the conditional atomic update guarantees exactly one 201 (success)
 * and one 409 (conflict).
 *
 * Usage:
 *   node scripts/concurrencyTest.js <tokenUser1> <tokenUser2> <showId> <seatLabel>
 * Or:
 *   npm run test:concurrency -- <tokenUser1> <tokenUser2> <showId> <seatLabel>
 */

const [token1, token2, showId, seatLabel] = process.argv.slice(2);

if (!token1 || !token2 || !showId || !seatLabel) {
  console.error('\nUsage: npm run test:concurrency -- <tokenUser1> <tokenUser2> <showId> <seatLabel>\n');
  process.exit(1);
}

const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 5001}/api/bookings/hold`;

const sendHoldRequest = async (userLabel, token) => {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        showId,
        seats: [seatLabel],
      }),
    });

    const data = await res.json();
    return { user: userLabel, status: res.status, data };
  } catch (err) {
    return { user: userLabel, error: err.message };
  }
};

const run = async () => {
  console.log(`\n🚀 Firing concurrent hold requests for seat: ${seatLabel} on show: ${showId}...`);

  const [res1, res2] = await Promise.all([
    sendHoldRequest('User 1', token1),
    sendHoldRequest('User 2', token2),
  ]);

  console.log('\n--- Result for User 1 ---');
  console.log(`Status: ${res1.status}`);
  console.log('Response:', JSON.stringify(res1.data, null, 2));

  console.log('\n--- Result for User 2 ---');
  console.log(`Status: ${res2.status}`);
  console.log('Response:', JSON.stringify(res2.data, null, 2));

  const statuses = [res1.status, res2.status];
  const has201 = statuses.includes(201);
  const has409 = statuses.includes(409);

  console.log('\n--- Test Verification ---');
  if (has201 && has409) {
    console.log('✅ PASS: Exactly one user succeeded (201) and one received a conflict (409). No double booking!');
    process.exitCode = 0;
  } else {
    console.log(`❌ FAIL: Expected one 201 and one 409, got: ${statuses.join(', ')}`);
    process.exitCode = 1;
  }
};

run();
