'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createApiClient } from '@/lib/api-client';
import { useAuth, useSocket } from '@/lib/store';
import { listItemVariants, pageVariants, typingDotVariants } from '@/lib/framer-variants';
import styles from './conversation-page.module.css';

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function extractMessages(payload: unknown, conversationId: string): ChatMessage[] {
  const root = asRecord(payload);
  const entries = (root?.['items'] ?? root?.['messages'] ?? root?.['data']) as unknown;
  if (!Array.isArray(entries)) return [];

  return entries.map((entry, idx) => {
    const row = asRecord(entry) ?? {};
    return {
      id: String(row['id'] ?? `${conversationId}-${idx}`),
      conversationId: String(row['conversationId'] ?? conversationId),
      senderId: String(row['senderId'] ?? row['authorId'] ?? ''),
      content: String(row['content'] ?? row['text'] ?? ''),
      createdAt: String(row['createdAt'] ?? new Date().toISOString()),
    };
  });
}

function extractIncomingMessage(payload: unknown): ChatMessage | null {
  const row = asRecord(payload);
  if (!row) return null;
  if (!row['conversationId']) return null;
  return {
    id: String(row['id'] ?? `msg-${Date.now()}`),
    conversationId: String(row['conversationId']),
    senderId: String(row['senderId'] ?? row['authorId'] ?? ''),
    content: String(row['content'] ?? row['text'] ?? ''),
    createdAt: String(row['createdAt'] ?? new Date().toISOString()),
  };
}

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const { token, user } = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const api = useMemo(() => createApiClient(token ?? undefined), [token]);
  const [draft, setDraft] = useState('');
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const query = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: async () => extractMessages(await api.conversations.messages(conversationId), conversationId),
    enabled: Boolean(conversationId),
  });

  useEffect(() => {
    if (!socket) return;

    const handleTyping = (payload: unknown) => {
      const row = asRecord(payload);
      if (!row) return;
      if (String(row['conversationId'] ?? '') !== conversationId) return;
      const senderId = String(row['userId'] ?? row['senderId'] ?? '');
      if (!senderId || senderId === user?.id) return;
      setTypingLabel(String(row['username'] ?? 'Someone is typing'));
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => {
        setTypingLabel(null);
      }, 1200);
    };

    const handleMessageReceived = (payload: unknown) => {
      const incoming = extractIncomingMessage(payload);
      if (!incoming || incoming.conversationId !== conversationId) return;

      queryClient.setQueryData<ChatMessage[]>(['conversation-messages', conversationId], (prev = []) => {
        if (prev.some((item) => item.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    };

    socket.on('typing', handleTyping);
    socket.on('message_received', handleMessageReceived);
    return () => {
      socket.off('typing', handleTyping);
      socket.off('message_received', handleMessageReceived);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [conversationId, queryClient, socket, user?.id]);

  useEffect(() => {
    if (!socket || !draft.trim()) return;
    socket.emit('typing_start', { conversationId });
    return () => {
      socket.emit('typing_stop', { conversationId });
    };
  }, [conversationId, draft, socket]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const content = draft.trim();
      if (!content) return null;
      return api.conversations.send(conversationId, { content });
    },
    onMutate: async () => {
      const content = draft.trim();
      if (!content || !user) return;
      setDraft('');
      const optimistic: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        conversationId,
        senderId: user.id,
        content,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ChatMessage[]>(['conversation-messages', conversationId], (prev = []) => [...prev, optimistic]);
    },
    onSuccess: (payload) => {
      const confirmed = extractIncomingMessage(payload);
      if (!confirmed) return;
      queryClient.setQueryData<ChatMessage[]>(['conversation-messages', conversationId], (prev = []) => {
        const withoutOptimistic = prev.filter((item) => !item.id.startsWith('optimistic-'));
        if (withoutOptimistic.some((item) => item.id === confirmed.id)) return withoutOptimistic;
        return [...withoutOptimistic, confirmed];
      });
    },
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.trim() || sendMutation.isPending) return;
    sendMutation.mutate();
  };

  return (
    <motion.section className={styles.page} variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <header className={styles.header}>
        <h1 className={styles.title}>Conversation</h1>
        {typingLabel && (
          <motion.div className={styles.typing} variants={typingDotVariants} animate="typing">
            {typingLabel}...
          </motion.div>
        )}
      </header>

      {query.isLoading && <div className={styles.stateCard}>Loading messages...</div>}
      {query.isError && <div className={styles.stateCard}>Unable to load this conversation.</div>}

      <div className={styles.list}>
        <AnimatePresence initial={false}>
          {(query.data ?? []).map((msg) => (
            <motion.article
              key={msg.id}
              className={`${styles.bubble} ${msg.senderId === user?.id ? styles.mine : ''}`}
              variants={listItemVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
            >
              <p className={styles.text}>{msg.content}</p>
              <p className={styles.meta}>{new Date(msg.createdAt).toLocaleTimeString()}</p>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      <form className={styles.composer} onSubmit={onSubmit}>
        <input
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message..."
          maxLength={1000}
        />
        <button className={styles.sendBtn} type="submit" disabled={sendMutation.isPending || !draft.trim()}>
          {sendMutation.isPending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </motion.section>
  );
}
