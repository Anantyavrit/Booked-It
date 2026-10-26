/**
 * E2E Smoke Test Script
 * Verifies core server functionality over HTTP:
 *   1. Health check
 *   2. Register / login test user
 *   3. Movie listing
 *   4. Show seat map
 *   5. Seat hold
 *   6. Seat release
 *   7. Bad token rejection (401)
 *   8. Normal user rejected from admin stats (403)
 *
 * Usage:
 *   npm run test:smoke
 */

const BASE_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 5001}/api`;

const testResults = [];

function logStep(stepNum, name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} [Step ${stepNum}] ${name}${details ? ` (${details})` : ''}`);
  testResults.push({ stepNum, name, passed, details });
}

async function runSmokeTests() {
  console.log(`\n🔍 Starting IMovies E2E Smoke Tests against ${BASE_URL}\n`);

  let userToken = null;
  let testShowId = null;
  let availableSeatLabel = null;
  let heldBookingId = null;

  try {
  // ── Step 1: Health Check ───────────────────────────────────────────────────
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    const passed = res.status === 200 && data.ok === true && (data.db === 'connected' || data.db === 'disconnected');
    logStep(1, 'Health check', passed, `status: ${res.status}, db: ${data.db}`);
    if (!passed) throw new Error('Health check failed');
  } catch (err) {
    logStep(1, 'Health check', false, err.message);
    throw err;
  }

  // ── Step 2: Register a test user ──────────────────────────────────────────
  try {
    const uniqueEmail = `smoke_${Date.now()}_${Math.floor(Math.random() * 1000)}@imovies.test`;
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Smoke Tester',
        email: uniqueEmail,
        password: 'Password@123',
      }),
    });
    const data = await res.json();
    const passed = res.status === 201 && !!data.token && data.user?.role === 'user';
    userToken = data.token;
    logStep(2, 'Register test user', passed, `user: ${data.user?.email || 'N/A'}`);
    if (!passed) throw new Error(data.message || 'Registration failed');
  } catch (err) {
    logStep(2, 'Register test user', false, err.message);
    throw err;
  }

  // ── Step 3: Movie List ─────────────────────────────────────────────────────
  try {
    const res = await fetch(`${BASE_URL}/movies`);
    const data = await res.json();
    const passed = res.status === 200 && data.success === true && Array.isArray(data.data);
    logStep(3, 'Fetch movie list', passed, `count: ${data.data?.length || 0}`);
  } catch (err) {
    logStep(3, 'Fetch movie list', false, err.message);
  }

  // ── Step 4: Show's Seat Map ────────────────────────────────────────────────
  try {
    const showsRes = await fetch(`${BASE_URL}/shows?limit=5`);
    const showsData = await showsRes.json();

    if (showsData.data && showsData.data.length > 0) {
      testShowId = showsData.data[0]._id;
      const seatsRes = await fetch(`${BASE_URL}/shows/${testShowId}/seats`);
      const seatsData = await seatsRes.json();
      const seatsList = seatsData.data?.seats || [];
      const passed = seatsRes.status === 200 && seatsData.success === true && seatsList.length > 0;

      // Find an available seat
      const foundSeat = seatsList.find((s) => s.status === 'available');
      if (foundSeat) {
        availableSeatLabel = foundSeat.label;
      }

      logStep(4, 'Fetch show seat map', passed, `show: ${testShowId}, seats: ${seatsList.length}`);
    } else {
      logStep(4, 'Fetch show seat map', false, 'No upcoming shows available');
      throw new Error('No upcoming shows available for smoke test');
    }
  } catch (err) {
    logStep(4, 'Fetch show seat map', false, err.message);
  }

  // ── Step 5: Seat Hold (if show and seat exist) ──────────────────────────────
  if (testShowId && availableSeatLabel) {
    try {
      const holdRes = await fetch(`${BASE_URL}/bookings/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          showId: testShowId,
          seats: [availableSeatLabel],
        }),
      });
      const holdData = await holdRes.json();
      const passed = holdRes.status === 201 && holdData.success === true && !!(holdData.data?._id || holdData.data?.booking?._id);
      heldBookingId = holdData.data?._id || holdData.data?.booking?._id;
      logStep(5, 'Hold seat', passed, `seat: ${availableSeatLabel}, booking: ${heldBookingId}`);
    } catch (err) {
      logStep(5, 'Hold seat', false, err.message);
    }
  } else {
    logStep(5, 'Hold seat', false, 'No show/seat available');
    throw new Error('No show/seat available for hold test');
  }

  // ── Step 6: Release Hold ───────────────────────────────────────────────────
  if (heldBookingId) {
    try {
      const releaseRes = await fetch(`${BASE_URL}/bookings/${heldBookingId}/hold`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      const releaseData = await releaseRes.json();
      const passed = releaseRes.status === 200 && releaseData.success === true;
      logStep(6, 'Release seat hold', passed, `released booking: ${heldBookingId}`);
      if (passed) heldBookingId = null;
    } catch (err) {
      logStep(6, 'Release seat hold', false, err.message);
    }
  } else {
    logStep(6, 'Release seat hold', false, 'No booking held');
    throw new Error('No booking held for release test');
  }

  // ── Step 7: Bad Token Rejection (401) ──────────────────────────────────────
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: {
        Authorization: 'Bearer invalid_garbage_token_123',
      },
    });
    const passed = res.status === 401;
    logStep(7, 'Bad token rejection', passed, `status: ${res.status}`);
  } catch (err) {
    logStep(7, 'Bad token rejection', false, err.message);
  }

  // ── Step 8: Normal User Forbidden from Admin Stats (403) ───────────────────
  try {
    const res = await fetch(`${BASE_URL}/admin/stats`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });
    const passed = res.status === 403;
    logStep(8, 'Normal user blocked from admin stats', passed, `status: ${res.status}`);
  } catch (err) {
    logStep(8, 'Normal user blocked from admin stats', false, err.message);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const allPassed = testResults.every((t) => t.passed);
  console.log('\n──────────────────────────────────────────────────');
  if (allPassed) {
    console.log('🎉 ALL SMOKE TESTS PASSED SUCCESSFULLY!');
    console.log('──────────────────────────────────────────────────\n');
    return 0;
  } else {
    console.error('💥 SOME SMOKE TESTS FAILED. See log above.');
    console.log('──────────────────────────────────────────────────\n');
    return 1;
  }
  } finally {
    // If a later assertion fails, release any hold created by this run.
    if (heldBookingId && userToken) {
      try {
        await fetch(`${BASE_URL}/bookings/${heldBookingId}/hold`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userToken}` },
        });
      } catch (_cleanupError) {
        // Preserve the original smoke-test result; cleanup is best effort.
      }
    }
  }
}

runSmokeTests()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`❌ FAIL Smoke test aborted: ${err.message}`);
    process.exit(1);
  });
