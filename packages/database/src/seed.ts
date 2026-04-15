// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE SEEDER
// Seeds the database with sample data for development and testing
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from './index';
import { hash } from 'bcryptjs';

const SALT_ROUNDS = 12;

async function main(): Promise<void> {
  console.log('🌱 Starting database seed...');

  // Clean existing data in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...');
    await prisma.notification.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.postLike.deleteMany();
    await prisma.bookmark.deleteMany();
    await prisma.pollVote.deleteMany();
    await prisma.pollOption.deleteMany();
    await prisma.poll.deleteMany();
    await prisma.postMedia.deleteMany();
    await prisma.post.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  }

  // Create users
  console.log('👤 Creating users...');
  
  const hashedPassword = await hash('password123', SALT_ROUNDS);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alice@example.com',
        username: 'alice',
        displayName: 'Alice Chen',
        password: hashedPassword,
        bio: 'Software engineer passionate about building great products. Open source contributor.',
        status: 'active',
        accountType: 'creator',
        isVerified: true,
        emailVerified: true,
        website: '[alice.dev](https://alice.dev)',
        location: 'San Francisco, CA',
        reputationScore: 1500,
        followerCount: 2500,
        followingCount: 350,
        postCount: 142,
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob@example.com',
        username: 'bob',
        displayName: 'Bob Martinez',
        password: hashedPassword,
        bio: 'Designer & creative director. Making the digital world beautiful.',
        status: 'active',
        accountType: 'creator',
        isVerified: true,
        emailVerified: true,
        website: '[bobdesigns.co](https://bobdesigns.co)',
        location: 'Austin, TX',
        reputationScore: 2100,
        followerCount: 5000,
        followingCount: 200,
        postCount: 89,
      },
    }),
    prisma.user.create({
      data: {
        email: 'carol@example.com',
        username: 'carol',
        displayName: 'Carol Williams',
        password: hashedPassword,
        bio: 'Tech journalist covering startups and innovation.',
        status: 'active',
        accountType: 'verified',
        isVerified: true,
        emailVerified: true,
        reputationScore: 3200,
        followerCount: 15000,
        followingCount: 500,
        postCount: 450,
      },
    }),
    prisma.user.create({
      data: {
        email: 'david@example.com',
        username: 'david',
        displayName: 'David Kim',
        password: hashedPassword,
        bio: 'Startup founder. Building the future of social.',
        status: 'active',
        accountType: 'business',
        isVerified: true,
        emailVerified: true,
        location: 'New York, NY',
        reputationScore: 1800,
        followerCount: 8000,
        followingCount: 150,
        postCount: 230,
      },
    }),
    prisma.user.create({
      data: {
        email: 'emma@example.com',
        username: 'emma',
        displayName: 'Emma Johnson',
        password: hashedPassword,
        bio: 'Product manager. Love building things users actually want.',
        status: 'active',
        accountType: 'personal',
        emailVerified: true,
        reputationScore: 750,
        followerCount: 1200,
        followingCount: 400,
        postCount: 78,
      },
    }),
  ]);

  const [alice, bob, carol, david, emma] = users;

  // Create follows
  console.log('🔗 Creating follow relationships...');
  
  await prisma.follow.createMany({
    data: [
      { followerId: alice.id, followingId: bob.id },
      { followerId: alice.id, followingId: carol.id },
      { followerId: alice.id, followingId: david.id },
      { followerId: bob.id, followingId: alice.id },
      { followerId: bob.id, followingId: carol.id },
      { followerId: carol.id, followingId: alice.id },
      { followerId: carol.id, followingId: bob.id },
      { followerId: carol.id, followingId: david.id },
      { followerId: david.id, followingId: carol.id },
      { followerId: emma.id, followingId: alice.id },
      { followerId: emma.id, followingId: bob.id },
      { followerId: emma.id, followingId: carol.id },
      { followerId: emma.id, followingId: david.id },
    ],
  });

  // Create posts
  console.log('📝 Creating posts...');

  const posts = await Promise.all([
    prisma.post.create({
      data: {
        authorId: alice.id,
        content: 'Just shipped a major update to our platform! 🚀 Been working on this for months and so excited to finally share it with everyone.',
        contentHtml: '<p>Just shipped a major update to our platform! 🚀 Been working on this for months and so excited to finally share it with everyone.</p>',
        postType: 'text',
        visibility: 'public',
        likeCount: 245,
        repostCount: 32,
        quoteCount: 8,
        viewCount: 5600,
        momentumScore: 85.5,
        momentumVelocity: 12.3,
      },
    }),
    prisma.post.create({
      data: {
        authorId: bob.id,
        content: 'Design tip: Whitespace isn\'t empty space, it\'s breathing room for your content. Don\'t be afraid to let your designs breathe.',
        contentHtml: '<p>Design tip: Whitespace isn\'t empty space, it\'s breathing room for your content. Don\'t be afraid to let your designs breathe.</p>',
        postType: 'text',
        visibility: 'public',
        likeCount: 892,
        repostCount: 156,
        quoteCount: 23,
        viewCount: 15000,
        momentumScore: 156.2,
        momentumVelocity: 28.7,
      },
    }),
    prisma.post.create({
      data: {
        authorId: carol.id,
        content: 'BREAKING: Major tech company announces plans to integrate AI into their entire product suite. This could reshape the industry. Thread below 🧵',
        contentHtml: '<p>BREAKING: Major tech company announces plans to integrate AI into their entire product suite. This could reshape the industry. Thread below 🧵</p>',
        postType: 'text',
        visibility: 'public',
        likeCount: 1523,
        repostCount: 678,
        quoteCount: 89,
        viewCount: 45000,
        momentumScore: 342.8,
        momentumVelocity: 65.2,
      },
    }),
    prisma.post.create({
      data: {
        authorId: david.id,
        content: 'Hot take: The best startup advice is to ignore most startup advice. Build something you believe in, solve real problems, talk to your users.',
        contentHtml: '<p>Hot take: The best startup advice is to ignore most startup advice. Build something you believe in, solve real problems, talk to your users.</p>',
        postType: 'text',
        visibility: 'public',
        likeCount: 567,
        repostCount: 89,
        quoteCount: 34,
        viewCount: 12000,
        momentumScore: 98.4,
        momentumVelocity: 15.6,
      },
    }),
    prisma.post.create({
      data: {
        authorId: emma.id,
        content: 'What features would you most want to see in a social media platform? Genuinely curious! Reply below 👇',
        contentHtml: '<p>What features would you most want to see in a social media platform? Genuinely curious! Reply below 👇</p>',
        postType: 'text',
        visibility: 'public',
        likeCount: 123,
        repostCount: 12,
        quoteCount: 5,
        viewCount: 3400,
        momentumScore: 45.2,
        momentumVelocity: 8.1,
      },
    }),
  ]);

  const [alicePost, bobPost, carolPost, davidPost, emmaPost] = posts;

  // Create replies
  console.log('💬 Creating replies...');

  await prisma.post.create({
    data: {
      authorId: bob.id,
      parentId: alicePost.id,
      rootId: alicePost.id,
      threadPath: `${alicePost.id}/`,
      threadDepth: 1,
      content: 'Congrats Alice! Can\'t wait to try it out. The preview looked amazing 🔥',
      contentHtml: '<p>Congrats Alice! Can\'t wait to try it out. The preview looked amazing 🔥</p>',
      postType: 'text',
      visibility: 'public',
      likeCount: 34,
      viewCount: 800,
    },
  });

  await prisma.post.create({
    data: {
      authorId: alice.id,
      parentId: emmaPost.id,
      rootId: emmaPost.id,
      threadPath: `${emmaPost.id}/`,
      threadDepth: 1,
      content: 'Better content moderation and less algorithmic manipulation! Users should control what they see.',
      contentHtml: '<p>Better content moderation and less algorithmic manipulation! Users should control what they see.</p>',
      postType: 'text',
      visibility: 'public',
      likeCount: 78,
      viewCount: 1200,
    },
  });

  // Create post with poll
  console.log('📊 Creating poll...');

  const pollPost = await prisma.post.create({
    data: {
      authorId: carol.id,
      content: 'Which tech trend will have the biggest impact in 2025?',
      contentHtml: '<p>Which tech trend will have the biggest impact in 2025?</p>',
      postType: 'poll',
      visibility: 'public',
      likeCount: 342,
      viewCount: 8500,
    },
  });

  await prisma.poll.create({
    data: {
      postId: pollPost.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      totalVotes: 1256,
      options: {
        create: [
          { text: 'Artificial Intelligence', voteCount: 534, position: 0 },
          { text: 'Augmented Reality', voteCount: 312, position: 1 },
          { text: 'Quantum Computing', voteCount: 189, position: 2 },
          { text: 'Web3/Blockchain', voteCount: 221, position: 3 },
        ],
      },
    },
  });

  // Create likes
  console.log('❤️ Creating likes...');

  await prisma.postLike.createMany({
    data: [
      { postId: alicePost.id, userId: bob.id },
      { postId: alicePost.id, userId: carol.id },
      { postId: alicePost.id, userId: david.id },
      { postId: alicePost.id, userId: emma.id },
      { postId: bobPost.id, userId: alice.id },
      { postId: bobPost.id, userId: carol.id },
      { postId: bobPost.id, userId: emma.id },
      { postId: carolPost.id, userId: alice.id },
      { postId: carolPost.id, userId: bob.id },
      { postId: carolPost.id, userId: david.id },
      { postId: carolPost.id, userId: emma.id },
      { postId: davidPost.id, userId: alice.id },
      { postId: davidPost.id, userId: carol.id },
      { postId: emmaPost.id, userId: alice.id },
      { postId: emmaPost.id, userId: bob.id },
    ],
  });

  // Update reply counts
  await prisma.post.update({
    where: { id: alicePost.id },
    data: { replyCount: 1 },
  });

  await prisma.post.update({
    where: { id: emmaPost.id },
    data: { replyCount: 1 },
  });

  // Create subscription tier
  console.log('💳 Creating subscription tier...');

  await prisma.subscriptionTier.create({
    data: {
      creatorId: bob.id,
      name: 'Design Pro',
      description: 'Get exclusive design tutorials, source files, and early access to new content.',
      priceMonthly: 999, // $9.99
      priceYearly: 9900, // $99.00
      benefits: [
        'Exclusive design tutorials',
        'Downloadable source files',
        'Early access to new content',
        'Monthly Q&A sessions',
        'Discord community access',
      ],
      subscriberCount: 234,
    },
  });

  // Create conversation
  console.log('💬 Creating conversation...');

  const conversation = await prisma.conversation.create({
    data: {
      lastMessageAt: new Date(),
      participants: {
        create: [
          { userId: alice.id },
          { userId: bob.id },
        ],
      },
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: bob.id,
      content: 'Hey Alice! Saw your launch - looks incredible! Would love to chat about a potential collaboration.',
      contentHtml: '<p>Hey Alice! Saw your launch - looks incredible! Would love to chat about a potential collaboration.</p>',
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: alice.id,
      content: 'Thanks Bob! That sounds great - what did you have in mind?',
      contentHtml: '<p>Thanks Bob! That sounds great - what did you have in mind?</p>',
    },
  });

  // Create notifications
  console.log('🔔 Creating notifications...');

  await prisma.notification.createMany({
    data: [
      {
        recipientId: alice.id,
        type: 'like',
        actorId: bob.id,
        postId: alicePost.id,
        title: 'New like',
        body: 'Bob Martinez liked your post',
        actionUrl: `/post/${alicePost.id}`,
        groupKey: `like:${alicePost.id}`,
      },
      {
        recipientId: alice.id,
        type: 'follow',
        actorId: emma.id,
        title: 'New follower',
        body: 'Emma Johnson started following you',
        actionUrl: '/emma',
      },
      {
        recipientId: bob.id,
        type: 'reply',
        actorId: alice.id,
        postId: emmaPost.id,
        title: 'New reply',
        body: 'Alice Chen replied to a post you\'re in',
        actionUrl: `/post/${emmaPost.id}`,
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log(`   Created ${users.length} users`);
  console.log(`   Created ${posts.length + 2} posts (including replies)`);
  console.log('   Created 1 poll with 4 options');
  console.log('   Created 15 likes');
  console.log('   Created 1 subscription tier');
  console.log('   Created 1 conversation with 2 messages');
  console.log('   Created 3 notifications');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
