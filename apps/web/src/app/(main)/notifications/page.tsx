'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createApiClient } from '@/lib/api-client';
import { useAuth, useStore } from '@/lib/store';
import { listItemVariants, pageVariants } from '@/lib/framer-variants';
import styles from './notifications-page.module.css';

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function extractNotifications(payload: unknown): NotificationItem[] {
  const root = asRecord(payload);
  const items = (root?.['items'] ?? root?.['notifications'] ?? root?.['data']) as unknown;
  if (!Array.isArray(items)) return [];
  return items.map((entry, idx) => {
    const row = asRecord(entry) ?? {};
    return {
      id: String(row['id'] ?? `notif-${idx}`),
      type: String(row['type'] ?? 'general'),
      message: String(row['message'] ?? row['title'] ?? 'New activity'),
      createdAt: String(row['createdAt'] ?? new Date().toISOString()),
      readAt: (row['readAt'] as string | null | undefined) ?? null,
    };
  });
}

export default function NotificationsPage() {
  const { token } = useAuth();
  const clearNotifications = useStore((s) => s.clearNotifications);
  const queryClient = useQueryClient();
  const api = createApiClient(token ?? undefined);

  useEffect(() => {
    clearNotifications();
  }, [clearNotifications]);

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => extractNotifications(await api.notifications.list()),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      queryClient.setQueryData<NotificationItem[]>(['notifications'], (prev = []) =>
        prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      );
      clearNotifications();
    },
  });

  const grouped = (query.data ?? []).reduce<Record<string, NotificationItem[]>>((acc, item) => {
    const group = acc[item.type] ?? [];
    group.push(item);
    acc[item.type] = group;
    return acc;
  }, {});

  return (
    <motion.section className={styles.page} variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <header className={styles.header}>
        <h1 className={styles.title}>Notifications</h1>
        <button className={styles.markBtn} onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
          {markAllMutation.isPending ? 'Marking...' : 'Mark all read'}
        </button>
      </header>

      {query.isLoading && <div className={styles.stateCard}>Loading notifications...</div>}
      {query.isError && <div className={styles.stateCard}>Unable to load notifications right now.</div>}
      {!query.isLoading && !query.isError && (query.data?.length ?? 0) === 0 && (
        <div className={styles.stateCard}>You are all caught up.</div>
      )}

      <AnimatePresence initial={false}>
        {Object.entries(grouped).map(([type, rows]) => (
          <section key={type}>
            <div className={styles.groupHeader}>{type.replaceAll('_', ' ')}</div>
            {rows.map((item) => (
              <motion.article
                key={item.id}
                className={`${styles.item} ${item.readAt ? '' : styles.itemUnread}`}
                variants={listItemVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
              >
                {!item.readAt && <span className={styles.dot} />}
                <div className={styles.content}>
                  <p className={styles.message}>{item.message}</p>
                  <p className={styles.meta}>{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              </motion.article>
            ))}
          </section>
        ))}
      </AnimatePresence>
    </motion.section>
  );
}
