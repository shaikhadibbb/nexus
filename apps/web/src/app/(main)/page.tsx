'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { PostCard, type PostCardData } from '@/components/posts/post-card';
import { ApiError, createApiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/store';
import { listContainerVariants, listItemVariants, pageVariants } from '@/lib/framer-variants';
import styles from './home.module.css';

type FeedTab = 'for-you' | 'following';

interface FeedPageData {
  posts: PostCardData[];
  nextCursor: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function extractFeedPage(payload: unknown): FeedPageData {
  const root = asRecord(payload);
  const candidates = [
    root?.['items'],
    root?.['posts'],
    root?.['data'],
    root?.['edges'],
  ];
  const posts = candidates.find((entry) => Array.isArray(entry)) as PostCardData[] | undefined;

  const pageInfo = asRecord(root?.['pageInfo']);
  const nextCursor =
    (root?.['nextCursor'] as string | null | undefined) ??
    (pageInfo?.['nextCursor'] as string | null | undefined) ??
    null;

  return {
    posts: posts ?? [],
    nextCursor,
  };
}

function FeedSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={`skeleton-${idx}`} className={styles.skeletonPost}>
          <div className={`skeleton ${styles.skeletonAvatar}`} />
          <div className={styles.skeletonBody}>
            <div className={`skeleton ${styles.skeletonLine}`} style={{ width: '32%' }} />
            <div className={`skeleton ${styles.skeletonLine}`} style={{ width: '95%' }} />
            <div className={`skeleton ${styles.skeletonLine}`} style={{ width: '74%' }} />
          </div>
        </div>
      ))}
    </>
  );
}

export default function HomePage() {
  const [tab, setTab] = useState<FeedTab>('for-you');
  const { token } = useAuth();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const api = useMemo(() => createApiClient(token ?? undefined), [token]);

  const query = useInfiniteQuery({
    queryKey: ['feed', tab],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const feedType = tab === 'for-you' ? 'home' : 'following';
      const payload = await api.feed.get({
        feedType,
        cursor: pageParam ?? undefined,
        limit: 20,
      });
      return extractFeedPage(payload);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
          query.fetchNextPage();
        }
      },
      { rootMargin: '320px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [query]);

  const posts = query.data?.pages.flatMap((page) => page.posts) ?? [];
  const error = query.error;
  const isNetworkOrServerFailure =
    error instanceof ApiError
      ? error.statusCode === 0 || error.statusCode >= 500
      : error instanceof TypeError;

  return (
    <motion.section
      className={styles.page}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <header className={styles.topBar}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'for-you' ? styles.tabActive : ''}`}
            onClick={() => setTab('for-you')}
          >
            For You
            {tab === 'for-you' && <motion.div className={styles.activeIndicator} layoutId="feed-tab-indicator" />}
          </button>
          <button
            className={`${styles.tab} ${tab === 'following' ? styles.tabActive : ''}`}
            onClick={() => setTab('following')}
          >
            Following
            {tab === 'following' && <motion.div className={styles.activeIndicator} layoutId="feed-tab-indicator" />}
          </button>
        </div>
      </header>

      <motion.div
        className={styles.feed}
        variants={listContainerVariants}
        initial="initial"
        animate="animate"
      >
        {query.isLoading && <FeedSkeleton />}

        {!query.isLoading && !query.isError && posts.length === 0 && (
          <motion.div className={styles.stateCard} variants={listItemVariants}>
            <div className={styles.emptyTitle}>It&apos;s quiet here.</div>
            Follow some users or check out the Trending tab!
          </motion.div>
        )}

        {query.isError && (
          isNetworkOrServerFailure ? (
            <motion.div className={`${styles.stateCard} ${styles.errorState}`} variants={listItemVariants}>
              <AlertTriangle size={18} className={styles.errorIcon} />
              <div>
                <div className={styles.errorTitle}>API Connection Failed</div>
                <div className={styles.errorHint}>
                  Ensure your <code>DATABASE_URL</code> is configured correctly and your PostgreSQL server is running.
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div className={styles.stateCard} variants={listItemVariants}>
              {(error instanceof ApiError && error.message) ? error.message : 'Unable to load your feed right now.'}
            </motion.div>
          )
        )}

        <AnimatePresence initial={false}>
          {posts.map((post) => (
            <motion.div key={post.id} className={styles.postWrap} variants={listItemVariants} layout>
              <PostCard post={post} showMomentum={tab === 'for-you'} />
            </motion.div>
          ))}
        </AnimatePresence>

        {query.isFetchingNextPage && (
          <div className={styles.loadMore}>
            Loading more posts...
          </div>
        )}
      </motion.div>

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
    </motion.section>
  );
}
