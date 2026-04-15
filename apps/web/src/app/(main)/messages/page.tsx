'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { createApiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/store';
import { listContainerVariants, listItemVariants, pageVariants } from '@/lib/framer-variants';
import styles from './messages-page.module.css';

interface ConversationListItem {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function extractConversations(payload: unknown): ConversationListItem[] {
  const root = asRecord(payload);
  const items = (root?.['items'] ?? root?.['conversations'] ?? root?.['data']) as unknown;
  if (!Array.isArray(items)) return [];

  return items.map((entry, idx) => {
    const row = asRecord(entry) ?? {};
    const participants = Array.isArray(row['participants']) ? (row['participants'] as unknown[]) : [];
    const names = participants
      .map((p) => {
        const participant = asRecord(p);
        return String(participant?.['displayName'] ?? participant?.['username'] ?? '');
      })
      .filter(Boolean);

    return {
      id: String(row['id'] ?? `conv-${idx}`),
      title: String(row['title'] ?? (names.length > 0 ? names.join(', ') : 'Conversation')),
      preview: String(row['lastMessagePreview'] ?? row['lastMessage'] ?? 'No messages yet'),
      updatedAt: String(row['updatedAt'] ?? row['lastMessageAt'] ?? new Date().toISOString()),
    };
  });
}

export default function MessagesPage() {
  const { token } = useAuth();
  const api = createApiClient(token ?? undefined);

  const query = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => extractConversations(await api.conversations.list()),
  });

  return (
    <motion.section className={styles.page} variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <header className={styles.header}>
        <h1 className={styles.title}>Messages</h1>
      </header>

      {query.isLoading && <div className={styles.stateCard}>Loading conversations...</div>}
      {query.isError && <div className={styles.stateCard}>Unable to load conversations right now.</div>}
      {!query.isLoading && !query.isError && (query.data?.length ?? 0) === 0 && (
        <div className={styles.stateCard}>No conversations yet.</div>
      )}

      <motion.div className={styles.list} variants={listContainerVariants} initial="initial" animate="animate">
        {(query.data ?? []).map((conversation) => (
          <motion.div key={conversation.id} variants={listItemVariants}>
            <Link href={`/messages/${conversation.id}`} className={styles.item}>
              <div>
                <p className={styles.names}>{conversation.title}</p>
                <p className={styles.preview}>{conversation.preview}</p>
              </div>
              <time className={styles.meta}>{new Date(conversation.updatedAt).toLocaleTimeString()}</time>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
