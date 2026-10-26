# IMovies

IMovies is a React/Vite client with an Express/MongoDB API for browsing movies, selecting seats, holding bookings, and completing payments.

## Requirements

- Node.js 18 or newer
- MongoDB running locally on `127.0.0.1:27017`, or a reachable MongoDB connection
- Razorpay test keys only if payment checkout is being tested

## Run locally

1. Copy `server/.env.example` to `server/.env` and set `JWT_SECRET` and `CLIENT_URL`. Keep secrets out of the ZIP and source control.
2. Install dependencies:

   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

3. Seed optional sample data:

   ```bash
   cd server
   npm run seed:sample
   ```

4. Start the API:

   ```bash
   cd server
   npm start
   ```

5. In another terminal, start the client:

   ```bash
   cd client
   npm run dev
   ```

Open `http://localhost:5173`.

## Production deployment

Deploy the `server` and `client` separately, or place both behind one HTTPS reverse proxy.

For a separately hosted client, copy `client/.env.example` to `client/.env.production` and set:

```env
VITE_API_URL=https://your-api-domain.example/api
```

Set these server variables in the hosting provider's secret/environment settings:

```env
NODE_ENV=production
PORT=5000
MONGO_URI=<reachable MongoDB connection string>
JWT_SECRET=<at least 32 random characters>
CLIENT_URL=https://your-client-domain.example
RAZORPAY_KEY_ID=<test or live key>
RAZORPAY_KEY_SECRET=<matching secret>
RAZORPAY_WEBHOOK_SECRET=<webhook secret>
```

The API must be reachable over HTTPS, and the hosting proxy must forward WebSocket upgrades for Socket.io. Configure Razorpay's webhook URL as `https://your-api-domain.example/api/payments/webhook`. The current poster upload middleware stores files on local disk; production hosting must provide persistent disk storage or replace that storage with object storage before relying on uploaded posters across redeploys.

Build the client with `npm run build` and publish `client/dist`. Configure the frontend host to rewrite application routes to `index.html`. Run `npm run seed:sample` and `npm run seed:admin` once against the production database only when sample/admin data is intended.

## Verification

```bash
cd server
npm run test:smoke
npm run test:concurrency -- TOKEN1 TOKEN2 SHOW_ID SEAT_LABEL
```

The ZIP intentionally excludes `node_modules`, build output, Git metadata, runtime uploads, and `.env` files. It is a runnable project package, not a self-contained desktop executable; MongoDB and Node.js are still required.
