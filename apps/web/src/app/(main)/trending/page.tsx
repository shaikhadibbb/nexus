'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@/lib/api-client';
import { PostCard, type PostCardData } from '@/components/posts/post-card';
import { useAuth } from '@/lib/store';
import { listItemVariants, pageVariants } from '@/lib/framer-variants';
import styles from './trending-page.module.css';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
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

export default function TrendingPage() {
  const { token } = useAuth();
  const api = createApiClient(token ?? undefined);

  const postsQuery = useQuery({
    queryKey: ['trending-posts'],
    queryFn: async () =>
      extractTrendingPosts(
        await api.feed.get({ feedType: 'trending', limit: 30 }),
      ),
  });

  return (
    <motion.section
      className={styles.page}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <header className={styles.header}>
        <h1 className={styles.title}>Trending Today</h1>
        <p className={styles.subtitle}>The hottest posts right now</p>
      </header>

      {postsQuery.isLoading && <div className={styles.stateCard}>Loading trending posts...</div>}
      {postsQuery.isError && <div className={styles.stateCard}>Unable to load trending content right now.</div>}
      {!postsQuery.isLoading && !postsQuery.isError && (postsQuery.data?.length ?? 0) === 0 && (
        <div className={styles.stateCard}>Nothing trending yet.</div>
      )}

      <AnimatePresence initial={false}>
        {(postsQuery.data ?? []).map((post) => (
          <motion.div
            key={post.id}
            className={styles.postWrap}
            variants={listItemVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            layout
          >
            <PostCard post={post} showMomentum />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.section>
  );
}
