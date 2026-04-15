// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENTS SERVICE & ROUTER
// Stripe-backed tipping, subscriptions, webhooks, payouts
// ═══════════════════════════════════════════════════════════════════════════════

import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { prisma } from '@nexus/database';
import { requireAuth } from '../../shared/middleware/auth';
import { sendSuccess, sendCreated } from '../../shared/response';
import { notFoundError, paymentError, conflictError } from '../../shared/middleware/error-handler';
import { createTipSchema, createSubscriptionTierSchema } from '../../shared/validation';
import { createLogger } from '../../shared/logger';
import { config } from '../../config';
import { z } from 'zod';
import { verifyWebhookSignature } from '../../shared/middleware/security';

const logger = createLogger('payments');

// ─────────────────────────────────────────────────────────────────────────────
// Stripe client
// ─────────────────────────────────────────────────────────────────────────────

function getStripe(): Stripe {
  if (!config.STRIPE_SECRET_KEY) {
    throw paymentError('Payment processing not configured');
  }
  return new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
}

// Platform fee percentage
const PLATFORM_FEE_PERCENT = 0.05; // 5%

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const paymentsRouter: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Subscription tiers
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/payments/tiers/:creatorId
paymentsRouter.get(
  '/tiers/:creatorId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tiers = await prisma.subscriptionTier.findMany({
        where: { creatorId: req.params['creatorId']!, isActive: true },
        orderBy: { priceMonthly: 'asc' },
      });
      sendSuccess(res, { tiers });
    } catch (err) { next(err); }
  },
);

// POST /api/payments/tiers
paymentsRouter.post(
  '/tiers',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = createSubscriptionTierSchema.parse(req.body);

      const tier = await prisma.subscriptionTier.create({
        data: {
          creatorId: req.userId!,
          name: body.name,
          description: body.description,
          priceMonthly: body.priceMonthly,
          priceYearly: body.priceYearly ?? null,
          benefits: body.benefits,
          isActive: true,
        },
      });

      sendCreated(res, { tier });
    } catch (err) { next(err); }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Tips
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/payments/tips
paymentsRouter.post(
  '/tips',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = createTipSchema.parse(req.body);

      if (body.recipientId === req.userId) throw conflictError('Cannot tip yourself');

      const [recipient, stripe] = await Promise.all([
        prisma.user.findUnique({
          where: { id: body.recipientId },
          select: { id: true, stripeCustomerId: true },
        }),
        Promise.resolve(getStripe()),
      ]);

      if (!recipient) throw notFoundError('Recipient');

      const platformFee = Math.round(body.amount * PLATFORM_FEE_PERCENT);
      const processingFee = Math.round(body.amount * 0.029 + 30); // Stripe fee estimate
      const netAmount = body.amount - platformFee - processingFee;

      // Create a PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: body.amount,
        currency: 'usd',
        metadata: {
          type: 'tip',
          senderId: req.userId!,
          recipientId: body.recipientId,
          postId: body.postId ?? '',
        },
      });

      // Record pending transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId: req.userId!,
          recipientId: body.recipientId,
          type: 'tip',
          status: 'pending',
          amount: body.amount,
          platformFee,
          processingFee,
          netAmount,
          currency: 'usd',
          postId: body.postId ?? null,
          stripePaymentIntentId: paymentIntent.id,
          description: body.message ?? null,
        },
      });

      sendCreated(res, {
        transaction,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (err) { next(err); }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Earnings
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/payments/earnings
paymentsRouter.get(
  '/earnings',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { period } = z
        .object({ period: z.enum(['day', 'week', 'month', 'year', 'all_time']).default('month') })
        .parse(req.query);

      const windowMs: Record<string, number> = {
        day: 86400000, week: 604800000, month: 2592000000,
        year: 31536000000, all_time: Infinity,
      };

      const since =
        period === 'all_time' ? new Date(0) : new Date(Date.now() - windowMs[period]!);

      const transactions = await prisma.transaction.findMany({
        where: {
          recipientId: req.userId!,
          status: 'completed',
          createdAt: { gte: since },
        },
        select: {
          amount: true, platformFee: true, processingFee: true,
          netAmount: true, type: true, createdAt: true,
        },
      });

      const summary = transactions.reduce(
        (acc: {
          totalRevenue: number;
          totalTips: number;
          totalSubscriptions: number;
          totalFees: number;
          netEarnings: number;
          tipCount: number;
          newSubscribers: number;
          canceledSubscribers: number;
          revenueChange: number;
          subscriberChange: number;
          period: string;
          periodStart: Date;
          periodEnd: Date;
        }, t: {
          amount: number;
          platformFee: number;
          processingFee: number;
          netAmount: number;
          type: string;
        }) => {
          acc.totalRevenue += t.amount;
          acc.totalFees += t.platformFee + t.processingFee;
          acc.netEarnings += t.netAmount;
          if (t.type === 'tip') { acc.totalTips += t.amount; acc.tipCount++; }
          if (t.type === 'subscription_payment') acc.totalSubscriptions += t.amount;
          return acc;
        },
        {
          totalRevenue: 0, totalTips: 0, totalSubscriptions: 0,
          totalFees: 0, netEarnings: 0, tipCount: 0,
          newSubscribers: 0, canceledSubscribers: 0,
          revenueChange: 0, subscriberChange: 0,
          period, periodStart: since, periodEnd: new Date(),
        },
      );

      sendSuccess(res, summary);
    } catch (err) { next(err); }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Stripe webhook
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/payments/webhook
paymentsRouter.post(
  '/webhook',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sig = req.headers['stripe-signature'] as string;

      if (!config.STRIPE_WEBHOOK_SECRET) {
        res.status(400).json({ error: 'Webhook secret not configured' });
        return;
      }

      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        res.status(400).json({ error: 'Raw body required for webhook' });
        return;
      }

      const valid = verifyWebhookSignature(rawBody, sig, config.STRIPE_WEBHOOK_SECRET);
      if (!valid) {
        res.status(400).json({ error: 'Invalid webhook signature' });
        return;
      }

      const stripe = getStripe();
      const event = stripe.webhooks.constructEvent(rawBody, sig, config.STRIPE_WEBHOOK_SECRET);

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const pi = event.data.object as Stripe.PaymentIntent;
          await prisma.transaction.updateMany({
            where: { stripePaymentIntentId: pi.id },
            data: { status: 'completed', completedAt: new Date() },
          });
          logger.info({ pi: pi.id }, 'Payment succeeded');
          break;
        }

        case 'payment_intent.payment_failed': {
          const pi = event.data.object as Stripe.PaymentIntent;
          await prisma.transaction.updateMany({
            where: { stripePaymentIntentId: pi.id },
            data: {
              status: 'failed',
              failureReason: pi.last_payment_error?.message ?? 'Payment failed',
            },
          });
          break;
        }

        default:
          logger.debug({ type: event.type }, 'Unhandled webhook event');
      }

      res.json({ received: true });
    } catch (err) { next(err); }
  },
);
