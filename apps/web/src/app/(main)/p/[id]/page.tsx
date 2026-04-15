'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ComposeModal } from '@/components/compose/compose-modal';
import { PostCard, type PostCardData } from '@/components/posts/post-card';
import { createApiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/store';
import { listContainerVariants, listItemVariants, pageVariants } from '@/lib/framer-variants';
import styles from './thread-page.module.css';

interface ThreadPayload {
  ancestors: PostCardData[];
  post: PostCardData | null;
  replies: PostCardData[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function extractThreadPayload(payload: unknown): ThreadPayload {
  const root = asRecord(payload);
  const context = asRecord(root?.['context']);
  const node = asRecord(root?.['node']);

  const post =
    (root?.['post'] as PostCardData | null | undefined) ??
    (node as PostCardData | null | undefined) ??
    null;

  return {
    ancestors:
      (root?.['ancestors'] as PostCardData[] | undefined) ??
      (context?.['ancestors'] as PostCardData[] | undefined) ??
      [],
    post,
    replies:
      (root?.['replies'] as PostCardData[] | undefined) ??
      (context?.['replies'] as PostCardData[] | undefined) ??
      [],
  };
}

export default function PostThreadPage() {
  const params = useParams<{ id: string }>();
  const { token, isAuthenticated } = useAuth();
  const [showReply, setShowReply] = useState(false);
  const postId = params.id;

  const query = useQuery({
    queryKey: ['post-thread', postId],
    queryFn: async () => {
      const data = await createApiClient(token ?? undefined).posts.thread(postId);
      return extractThreadPayload(data);
    },
  });

  const payload = query.data;
  const mainPost = payload?.post ?? null;
  const ancestors = payload?.ancestors ?? [];
  const replies = payload?.replies ?? [];

  return (
    <motion.section
      className={styles.page}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <header className={styles.header}>
        <h1 className={styles.title}>Post</h1>
      </header>

      {query.isLoading && <div className={styles.stateCard}>Loading thread...</div>}

      {query.isError && <div className={styles.stateCard}>Unable to load this thread right now.</div>}

      {!query.isLoading && !query.isError && !mainPost && (
        <div className={styles.stateCard}>This post is unavailable.</div>
      )}

      {mainPost && (
        <motion.div variants={listContainerVariants} initial="initial" animate="animate">
          {ancestors.length > 0 && <div className={styles.subTitle}>Conversation context</div>}
          <AnimatePresence initial={false}>
            {ancestors.map((ancestor) => (
              <motion.div key={ancestor.id} className={styles.ancestorWrap} variants={listItemVariants} layout>
                <PostCard post={ancestor} variant="compact" />
              </motion.div>
            ))}
          </AnimatePresence>

          <div className={styles.section}>
            <PostCard post={mainPost} variant="detail" showMomentum />
          </div>

          <div className={styles.replyComposer}>
            <p className={styles.replyHint}>
              {isAuthenticated ? 'Join the conversation.' : 'Sign in to reply.'}
            </p>
            <button className={styles.replyBtn} onClick={() => setShowReply(true)}>
              Reply
            </button>
          </div>

          {replies.length > 0 && <div className={styles.subTitle}>Replies</div>}
          <AnimatePresence initial={false}>
            {replies.map((reply) => (
              <motion.div key={reply.id} className={styles.section} variants={listItemVariants} layout>
                <PostCard post={reply} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {mainPost && (
        <ComposeModal isOpen={showReply} onClose={() => setShowReply(false)} parentId={mainPost.id} />
      )}
    </motion.section>
  );
}
