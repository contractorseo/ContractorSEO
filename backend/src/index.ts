import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import businessesRouter from './routes/businesses';
import postsRouter from './routes/posts';
import reviewsRouter from './routes/reviews';
import keywordsRouter from './routes/keywords';
import competitorsRouter from './routes/competitors';
import citationsRouter from './routes/citations';
import stripeRouter from './routes/stripe';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true }));

// Raw body needed for Stripe webhooks
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

app.use('/api/businesses', businessesRouter);
app.use('/api/posts', postsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/keywords', keywordsRouter);
app.use('/api/competitors', competitorsRouter);
app.use('/api/citations', citationsRouter);
app.use('/api/stripe', stripeRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`ContractorSEO API running on port ${PORT}`);
});

export default app;
