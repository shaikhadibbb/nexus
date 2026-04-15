'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Image, BarChart2, MapPin, AlertCircle, Lock, Globe, Users } from 'lucide-react';
import { createApiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/store';
import { modalBackdropVariants, modalContentVariants } from '@/lib/framer-variants';
import styles from './compose-modal.module.css';

const MAX_CHARS = 500;

type Visibility = 'public' | 'followers' | 'subscribers';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string;
  quotedPostId?: string;
}

const visibilityConfig = {
  public: { icon: Globe, label: 'Everyone', color: 'var(--color-success)' },
  followers: { icon: Users, label: 'Followers', color: 'var(--brand-mid)' },
  subscribers: { icon: Lock, label: 'Subscribers only', color: 'var(--color-bookmark)' },
};

export function ComposeModal({ isOpen, onClose, parentId, quotedPostId }: ComposeModalProps) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [sensitiveContent, setSensitiveContent] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);

  const charsLeft = MAX_CHARS - content.length;
  const isOverLimit = charsLeft < 0;
  const isEmpty = content.trim().length === 0;

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const api = createApiClient(token ?? undefined);
      return api.posts.create({
        content,
        visibility,
        sensitiveContent,
        parentId: parentId ?? undefined,
        quotedPostId: quotedPostId ?? undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      setContent('');
      setSensitiveContent(false);
      onClose();
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (!isEmpty && !isOverLimit) createPostMutation.mutate();
    }
    if (e.key === 'Escape') onClose();
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Auto-resize
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 400)}px`;
    }
  };

  const visConfig = visibilityConfig[visibility];
  const VisIcon = visConfig.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={styles.modal}
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Create post"
          >
            {/* Header */}
            <div className={styles.header}>
              <motion.button
                className={styles.closeBtn}
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Close"
              >
                <X size={18} />
              </motion.button>
              <h2 className={styles.title}>
                {parentId ? 'Reply' : quotedPostId ? 'Quote post' : 'Create post'}
              </h2>
            </div>

            {/* Body */}
            <div className={styles.body}>
              {/* Avatar */}
              <div className={styles.composerRow}>
                <div className={styles.avatar}>
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} />
                  ) : (
                    <span>{user?.displayName?.[0]?.toUpperCase() ?? 'U'}</span>
                  )}
                </div>

                {/* Textarea */}
                <div className={styles.textareaWrap}>
                  <textarea
                    ref={textareaRef}
                    className={`compose-textarea ${styles.textarea}`}
                    placeholder={
                      parentId
                        ? 'Write your reply...'
                        : "What's on your mind?"
                    }
                    value={content}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    maxLength={MAX_CHARS + 100}
                    aria-label="Post content"
                  />
                </div>
              </div>

              {/* Visibility picker */}
              <div className={styles.visRow}>
                <div style={{ position: 'relative' }}>
                  <button
                    className={styles.visBtn}
                    onClick={() => setShowVisibilityPicker((p) => !p)}
                    style={{ color: visConfig.color }}
                  >
                    <VisIcon size={13} />
                    <span>{visConfig.label}</span>
                  </button>

                  <AnimatePresence>
                    {showVisibilityPicker && (
                      <motion.div
                        className={styles.visPicker}
                        initial={{ opacity: 0, scale: 0.9, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        {(Object.entries(visibilityConfig) as [Visibility, typeof visibilityConfig.public][]).map(([key, cfg]) => {
                          const Icon = cfg.icon;
                          return (
                            <button
                              key={key}
                              className={`${styles.visOption} ${visibility === key ? styles.visOptionActive : ''}`}
                              onClick={() => { setVisibility(key); setShowVisibilityPicker(false); }}
                            >
                              <Icon size={14} style={{ color: cfg.color }} />
                              <span>{cfg.label}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              {/* Toolbar */}
              <div className={styles.toolbar}>
                <button className={styles.toolBtn} title="Add media" aria-label="Add image">
                  <Image size={18} />
                </button>
                <button className={styles.toolBtn} title="Add poll" aria-label="Add poll">
                  <BarChart2 size={18} />
                </button>
                <button className={styles.toolBtn} title="Add location" aria-label="Add location">
                  <MapPin size={18} />
                </button>
                <button
                  className={`${styles.toolBtn} ${sensitiveContent ? styles.toolBtnActive : ''}`}
                  title="Mark sensitive content"
                  onClick={() => setSensitiveContent((p) => !p)}
                  aria-label="Toggle sensitive content"
                >
                  <AlertCircle size={18} />
                </button>
              </div>

              {/* Char counter + submit */}
              <div className={styles.actions}>
                {content.length > 0 && (
                  <div className={styles.charCounter}>
                    <svg width="28" height="28" viewBox="0 0 28 28">
                      <circle cx="14" cy="14" r="11" fill="none" stroke="var(--color-border)" strokeWidth="2.5" />
                      <circle
                        cx="14" cy="14" r="11"
                        fill="none"
                        stroke={isOverLimit ? 'var(--color-error)' : charsLeft <= 40 ? 'var(--color-warning)' : 'var(--brand-mid)'}
                        strokeWidth="2.5"
                        strokeDasharray={`${Math.PI * 2 * 11}`}
                        strokeDashoffset={`${Math.PI * 2 * 11 * (1 - Math.min(content.length / MAX_CHARS, 1))}`}
                        strokeLinecap="round"
                        transform="rotate(-90 14 14)"
                        style={{ transition: 'stroke-dashoffset 0.2s, stroke 0.2s' }}
                      />
                    </svg>
                    {charsLeft <= 40 && (
                      <span
                        className={styles.charCount}
                        style={{ color: isOverLimit ? 'var(--color-error)' : 'var(--color-warning)' }}
                      >
                        {charsLeft}
                      </span>
                    )}
                  </div>
                )}

                <motion.button
                  className={styles.submitBtn}
                  onClick={() => createPostMutation.mutate()}
                  disabled={isEmpty || isOverLimit || createPostMutation.isPending}
                  whileHover={{ scale: isEmpty || isOverLimit ? 1 : 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {createPostMutation.isPending ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                      style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }}
                    />
                  ) : (
                    parentId ? 'Reply' : 'Post'
                  )}
                </motion.button>
              </div>
            </div>

            {createPostMutation.isError && (
              <div className={styles.error}>
                {(createPostMutation.error as Error).message}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
