// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT TYPE DEFINITIONS
// Types for creator economy features: tips, subscriptions, payouts
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseEntity } from './common';
import { UserReference } from './user';

/**
 * Payment transaction
 */
export interface Transaction extends BaseEntity {
  userId: string; // Payer
  recipientId: string; // Payee
  
  type: TransactionType;
  status: TransactionStatus;
  
  // Amounts (all in cents)
  amount: number;
  platformFee: number;
  processingFee: number;
  netAmount: number; // Amount recipient receives
  
  currency: string;
  
  // References
  postId: string | null; // For tips on specific posts
  subscriptionId: string | null;
  stripePaymentIntentId: string | null;
  
  // Metadata
  description: string | null;
  failureReason: string | null;
  
  // Timestamps
  completedAt: Date | string | null;
}

export type TransactionType = 
  | 'tip'
  | 'subscription_payment'
  | 'subscription_refund'
  | 'payout';

export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'canceled';

/**
 * Creator payout account (Stripe Connect)
 */
export interface PayoutAccount extends BaseEntity {
  userId: string;
  stripeAccountId: string;
  status: PayoutAccountStatus;
  
  // Verification
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  
  // Payout settings
  payoutSchedule: 'daily' | 'weekly' | 'monthly';
  defaultCurrency: string;
  
  // Balance
  availableBalance: number;
  pendingBalance: number;
}

export type PayoutAccountStatus =
  | 'pending'
  | 'active'
  | 'restricted'
  | 'disabled';

/**
 * Tip input
 */
export interface CreateTipInput {
  recipientId: string;
  amount: number; // In cents
  postId?: string;
  message?: string;
}

/**
 * Subscription creation input
 */
export interface CreateSubscriptionInput {
  creatorId: string;
  tierId: string;
  paymentMethodId?: string;
}

/**
 * Creator earnings summary
 */
export interface EarningsSummary {
  period: 'day' | 'week' | 'month' | 'year' | 'all_time';
  periodStart: Date | string;
  periodEnd: Date | string;
  
  // Totals
  totalRevenue: number;
  totalTips: number;
  totalSubscriptions: number;
  totalFees: number;
  netEarnings: number;
  
  // Counts
  tipCount: number;
  newSubscribers: number;
  canceledSubscribers: number;
  
  // Comparison to previous period
  revenueChange: number;
  subscriberChange: number;
}

/**
 * Tip leaderboard entry
 */
export interface TopSupporter {
  user: UserReference;
  totalAmount: number;
  tipCount: number;
  subscriptionMonths: number;
}
