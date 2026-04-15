// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE SEED
// Development seed with realistic demo data
// ═══════════════════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Simple password hash for dev — NOT for production
function hashPassword(password: string): string {
  // In production, bcrypt is used in the API layer
  // Seed uses crypto for zero-dep seeding
  return `$dev$${createHash('sha256').update(password).digest('hex')}`;
}

async function main(): Promise<void> {
  console.log('🌱 Seeding Nexus database...');

  // ──────────────────────────────────────────────────────
  // Clean existing data (dev only)
  // ──────────────────────────────────────────────────────
  await prisma.transaction.deleteMany();
  await prisma.subscriptionTier.deleteMany();
  await prisma.messageRead.deleteMany();
  await prisma.messageReaction.deleteMany();
  await prisma.messageMedia.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationMember.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.postHashtag.deleteMany();
  await prisma.hashtag.deleteMany();
  await prisma.postMention.deleteMany();
  await prisma.postLike.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.pollVote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.postMedia.deleteMany();
  await prisma.postEdit.deleteMany();
  await prisma.post.deleteMany();
  await prisma.mute.deleteMany();
  await prisma.block.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.user.deleteMany();
  await prisma.userList.deleteMany();

  console.log('✓ Cleaned existing data');

  // ──────────────────────────────────────────────────────
  // Create users
  // ──────────────────────────────────────────────────────
  const [alice, bob, carol, dave] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alice@nexus.dev',
        username: 'alice',
        displayName: 'Alice Anderson',
        passwordHash: hashPassword('Password123'),
        bio: 'Product designer & creative technologist. Building the future one pixel at a time. ✨',
        accountType: 'creator',
        isVerified: true,
        emailVerified: true,
        followerCount: 12400,
        followingCount: 890,
        postCount: 3,
        reputationScore: 9240,
        avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=alice',
        theme: 'dark',
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob@nexus.dev',
        username: 'bob_builds',
        displayName: 'Bob Builder',
        passwordHash: hashPassword('Password123'),
        bio: 'Full-stack engineer. Open source contributor. Coffee addict ☕',
        accountType: 'personal',
        isVerified: false,
        emailVerified: true,
        followerCount: 3200,
        followingCount: 420,
        postCount: 2,
        reputationScore: 2800,
        avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=bob',
      },
    }),
    prisma.user.create({
      data: {
        email: 'carol@nexus.dev',
        username: 'carol_creates',
        displayName: 'Carol Chen',
        passwordHash: hashPassword('Password123'),
        bio: 'AI researcher & writer. Exploring the human-machine interface.',
        accountType: 'creator',
        isVerified: true,
        emailVerified: true,
        followerCount: 28900,
        followingCount: 512,
        postCount: 2,
        reputationScore: 18600,
        avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=carol',
      },
    }),
    prisma.user.create({
      data: {
        email: 'dave@nexus.dev',
        username: 'davecode',
        displayName: 'Dave Code',
        passwordHash: hashPassword('Password123'),
        bio: 'DevOps & infrastructure. Everything as code.',
        accountType: 'personal',
        isVerified: false,
        emailVerified: true,
        followerCount: 1100,
        followingCount: 320,
        postCount: 1,
        reputationScore: 940,
        avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=dave',
      },
    }),
  ]);

  console.log('✓ Created 4 users');

  // ──────────────────────────────────────────────────────
  // Create follows
  // ──────────────────────────────────────────────────────
  await prisma.follow.createMany({
    data: [
      { followerId: bob.id, followingId: alice.id },
      { followerId: carol.id, followingId: alice.id },
      { followerId: dave.id, followingId: alice.id },
      { followerId: alice.id, followingId: carol.id },
      { followerId: bob.id, followingId: carol.id },
      { followerId: dave.id, followingId: bob.id },
      { followerId: alice.id, followingId: bob.id },
    ],
  });

  console.log('✓ Created follow relationships');

  // ──────────────────────────────────────────────────────
  // Create posts
  // ──────────────────────────────────────────────────────
  const post1 = await prisma.post.create({
    data: {
      authorId: alice.id,
      content: 'Just shipped the Nexus momentum feed algorithm 🚀 Engagement velocity + acceleration scoring is live. Early results: 3.2x more relevant posts surfaced for users. Details in thread 🧵',
      contentHtml: '<p>Just shipped the Nexus momentum feed algorithm 🚀 Engagement velocity + acceleration scoring is live. Early results: 3.2x more relevant posts surfaced for users. Details in thread 🧵</p>',
      postType: 'text',
      visibility: 'public',
      likeCount: 847,
      repostCount: 212,
      quoteCount: 38,
      viewCount: 14200,
      momentumScore: 94.7,
      momentumVelocity: 12.3,
      threadPath: '/',
    },
  });

  const post2 = await prisma.post.create({
    data: {
      authorId: carol.id,
      content: 'Hot take: context collapse is the core UX failure of every social platform. We show content without the conversational scaffolding that makes it meaningful. Nexus is the first platform I\'ve seen that genuinely addresses this.',
      contentHtml: '<p>Hot take: context collapse is the core UX failure of every social platform. We show content without the conversational scaffolding that makes it meaningful. Nexus is the first platform I\'ve seen that genuinely addresses this.</p>',
      postType: 'text',
      visibility: 'public',
      likeCount: 2341,
      repostCount: 891,
      quoteCount: 204,
      viewCount: 48900,
      momentumScore: 98.2,
      momentumVelocity: 28.7,
      threadPath: '/',
    },
  });

  const reply1 = await prisma.post.create({
    data: {
      authorId: bob.id,
      content: 'The momentum scoring makes so much sense. Likes that happen 6 hours after posting matter less than likes in the first 30 minutes — that\'s real signal vs. lagging indicator.',
      contentHtml: '<p>The momentum scoring makes so much sense. Likes that happen 6 hours after posting matter less than likes in the first 30 minutes — that\'s real signal vs. lagging indicator.</p>',
      postType: 'text',
      visibility: 'public',
      parentId: post1.id,
      rootId: post1.id,
      threadPath: `/${post1.id}`,
      likeCount: 143,
      repostCount: 28,
      viewCount: 3800,
      momentumScore: 62.4,
      momentumVelocity: 4.1,
    },
  });

  const post3 = await prisma.post.create({
    data: {
      authorId: bob.id,
      content: 'Working on the Nexus API infra. The Socket.io + Redis adapter combo for fan-out is genuinely elegant. Presence at scale without the usual nightmare.',
      contentHtml: '<p>Working on the Nexus API infra. The Socket.io + Redis adapter combo for fan-out is genuinely elegant. Presence at scale without the usual nightmare.</p>',
      postType: 'text',
      visibility: 'public',
      likeCount: 89,
      repostCount: 12,
      viewCount: 1200,
      momentumScore: 44.1,
      momentumVelocity: 2.8,
      threadPath: '/',
    },
  });

  const post4 = await prisma.post.create({
    data: {
      authorId: dave.id,
      content: 'Docker Compose + health checks + proper dependency ordering = sanity preserved. Too many devs skip this.',
      contentHtml: '<p>Docker Compose + health checks + proper dependency ordering = sanity preserved. Too many devs skip this.</p>',
      postType: 'text',
      visibility: 'public',
      likeCount: 56,
      repostCount: 7,
      viewCount: 890,
      momentumScore: 31.2,
      momentumVelocity: 1.4,
      threadPath: '/',
    },
  });

  const post5 = await prisma.post.create({
    data: {
      authorId: carol.id,
      content: 'Update to my earlier post on context collapse — I\'ve been thinking more about the "thread grouping" UX in Nexus. The materialized path approach for threads is underrated for solving this.',
      contentHtml: '<p>Update to my earlier post on context collapse — I\'ve been thinking more about the "thread grouping" UX in Nexus. The materialized path approach for threads is underrated for solving this.</p>',
      postType: 'quote',
      visibility: 'public',
      quotedPostId: post2.id,
      likeCount: 318,
      repostCount: 71,
      viewCount: 6700,
      momentumScore: 71.8,
      momentumVelocity: 8.9,
      threadPath: '/',
    },
  });

  // Update reply counts
  await prisma.post.update({ where: { id: post1.id }, data: { replyCount: 1 } });

  console.log('✓ Created posts and replies');

  // ──────────────────────────────────────────────────────
  // Create hashtags
  // ──────────────────────────────────────────────────────
  const [ht1, ht2, ht3, ht4] = await Promise.all([
    prisma.hashtag.create({ data: { tag: 'nexus', postCount: 4 } }),
    prisma.hashtag.create({ data: { tag: 'buildinpublic', postCount: 3 } }),
    prisma.hashtag.create({ data: { tag: 'webdev', postCount: 2 } }),
    prisma.hashtag.create({ data: { tag: 'ux', postCount: 2 } }),
  ]);

  await prisma.postHashtag.createMany({
    data: [
      { postId: post1.id, hashtagId: ht1.id },
      { postId: post1.id, hashtagId: ht2.id },
      { postId: post2.id, hashtagId: ht4.id },
      { postId: post3.id, hashtagId: ht1.id },
      { postId: post3.id, hashtagId: ht3.id },
    ],
  });

  console.log('✓ Created hashtags');

  // ──────────────────────────────────────────────────────
  // Create likes
  // ──────────────────────────────────────────────────────
  await prisma.postLike.createMany({
    data: [
      { postId: post1.id, userId: bob.id },
      { postId: post1.id, userId: carol.id },
      { postId: post2.id, userId: alice.id },
      { postId: post2.id, userId: bob.id },
      { postId: post2.id, userId: dave.id },
      { postId: reply1.id, userId: alice.id },
      { postId: post3.id, userId: alice.id },
      { postId: post4.id, userId: bob.id },
    ],
  });

  console.log('✓ Created likes');

  // ──────────────────────────────────────────────────────
  // Creator subscription tier
  // ──────────────────────────────────────────────────────
  await prisma.subscriptionTier.create({
    data: {
      creatorId: alice.id,
      name: 'Supporter',
      description: 'Support Alice\'s work and get exclusive design breakdowns and early access to articles.',
      priceMonthly: 500, // $5/month
      benefits: ['Exclusive design breakdowns', 'Early article access', 'Monthly Q&A thread'],
      subscriberCount: 247,
      isActive: true,
    },
  });

  await prisma.subscriptionTier.create({
    data: {
      creatorId: carol.id,
      name: 'Research Access',
      description: 'Full access to Carol\'s AI research notes, reading lists, and early findings.',
      priceMonthly: 900, // $9/month
      benefits: ['AI research notes', 'Curated reading lists', 'Private Discord server', 'Monthly deep-dive'],
      subscriberCount: 891,
      isActive: true,
    },
  });

  console.log('✓ Created subscription tiers');

  // ──────────────────────────────────────────────────────
  // Create a conversation
  // ──────────────────────────────────────────────────────
  const conversation = await prisma.conversation.create({
    data: {
      type: 'direct',
      isAccepted: true,
      members: {
        createMany: {
          data: [
            { userId: alice.id, role: 'member', lastReadAt: new Date() },
            { userId: bob.id, role: 'member' },
          ],
        },
      },
    },
  });

  const msg1 = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: alice.id,
      content: 'Hey Bob! The momentum algorithm PR looks great. Left a few comments.',
      contentType: 'text',
    },
  });

  const msg2 = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: bob.id,
      content: 'Thanks Alice! Will address those comments today. The sliding window rate limiter is the piece I\'m most proud of.',
      contentType: 'text',
      replyToId: msg1.id,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageId: msg2.id },
  });

  console.log('✓ Created conversation and messages');

  // ──────────────────────────────────────────────────────
  // Create notifications
  // ──────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        recipientId: alice.id,
        type: 'like',
        actorId: carol.id,
        postId: post1.id,
        title: 'Carol liked your post',
        body: 'Just shipped the Nexus momentum feed algorithm 🚀',
        actionUrl: `/posts/${post1.id}`,
        groupKey: `like:post:${post1.id}`,
        isRead: false,
      },
      {
        recipientId: alice.id,
        type: 'follow',
        actorId: dave.id,
        title: 'Dave Code followed you',
        body: 'DevOps & infrastructure. Everything as code.',
        actionUrl: `/users/davecode`,
        isRead: false,
      },
      {
        recipientId: alice.id,
        type: 'reply',
        actorId: bob.id,
        postId: reply1.id,
        title: 'Bob Builder replied to your post',
        body: 'The momentum scoring makes so much sense...',
        actionUrl: `/posts/${reply1.id}`,
        isRead: true,
        readAt: new Date(Date.now() - 3600000),
      },
    ],
  });

  console.log('✓ Created notifications');

  console.log('\n✅ Nexus database seeded successfully!');
  console.log('\n📬 Test accounts:');
  console.log('  alice@nexus.dev  / Password123  (creator, verified)');
  console.log('  bob@nexus.dev    / Password123  (personal)');
  console.log('  carol@nexus.dev  / Password123  (creator, verified)');
  console.log('  dave@nexus.dev   / Password123  (personal)');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
