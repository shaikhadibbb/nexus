'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@/lib/api-client';
import { PostCard, type PostCardData } from '@/components/posts/post-card';
import { useAuth } from '@/lib/store';
import { listItemVariants, pageVariants } from '@/lib/framer-variants';
import styles from './explore-page.module.css';

interface TrendingTag {
  tag: string;
  postCount: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function extractTags(payload: unknown): TrendingTag[] {
  const root = asRecord(payload);
  const items = root?.['hashtags'];
  if (!Array.isArray(items)) return [];
  return items
    .map((entry) => {
      const row = asRecord(entry);
      if (!row?.['tag']) return null;
      return {
        tag: String(row['tag']),
        postCount: Number(row['postCount'] ?? 0),
      };
    })
    .filter((row): row is TrendingTag => Boolean(row));
}

function extractTrendingPosts(payload: unknown): PostCardData[] {
  const root = asRecord(payload);
  const items = root?.['items'];
  if (!Array.isArray(items)) return [];
  return items
    .map((entry) => {
      const row = asRecord(entry);
      const post = asRecord(row?.['post']);
      return post as unknown as PostCardData;
    })
    .filter((post): post is PostCardData => Boolean(post?.id));
}

export default function ExplorePage() {
  const { token } = useAuth();
  const api = createApiClient(token ?? undefined);

  const tagsQuery = useQuery({
    queryKey: ['explore-tags'],
    queryFn: async () => extractTags(await api.feed.trending('day')),
  });

  const postsQuery = useQuery({
    queryKey: ['explore-trending-posts'],
    queryFn: async () =>
      extractTrendingPosts(
        await api.feed.get({ feedType: 'trending', limit: 20 }),
      ),
  });

  return (
    <motion.section className={styles.page} variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <header className={styles.header}>
        <h1 className={styles.title}>Explore</h1>
      </header>

      <div className={styles.hashtags}>
        {(tagsQuery.data ?? []).slice(0, 12).map((tag) => (
          <Link key={tag.tag} href={`/hashtag/${tag.tag}`} className={styles.tag}>
            #{tag.tag}
          </Link>
        ))}
      </div>

      {postsQuery.isLoading && <div className={styles.stateCard}>Loading trending posts...</div>}
      {postsQuery.isError && <div className={styles.stateCard}>Unable to load explore content right now.</div>}
      {!postsQuery.isLoading && !postsQuery.isError && (postsQuery.data?.length ?? 0) === 0 && (
        <div className={styles.stateCard}>Nothing trending yet.</div>
      )}

      <AnimatePresence initial={false}>
        {(postsQuery.data ?? []).map((post) => (
          <motion.div key={post.id} className={styles.postWrap} variants={listItemVariants} initial="initial" animate="animate" exit="exit" layout>
            <PostCard post={post} showMomentum />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.section>
  );
}
