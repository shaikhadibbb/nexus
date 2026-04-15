'use client';

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNowStrict } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Heart, Repeat2, MessageCircle, Bookmark, Share2,
  MoreHorizontal, BadgeCheck, Flame, Zap,
} from 'lucide-react';
import { createApiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/store';
import {
  heartVariants, repostVariants, bookmarkVariants,
  feedItemVariants, momentumBarVariants, velocitySparkVariants,
} from '@/lib/framer-variants';
import { ComposeModal } from '@/components/compose/compose-modal';
import styles from './post-card.module.css';

interface PostAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarBlurhash: string | null;
  isVerified: boolean;
  accountType: string;
}

interface PostMedia {
  media: {
    id: string;
    url: string;
    type: string;
    mimeType: string;
    width: number;
    height: number;
    aspectRatio: number;
    blurhash: string | null;
    altText: string | null;
    thumbnailUrl: string | null;
  };
}

export interface PostCardData {
  id: string;
  author: PostAuthor;
  content: string;
  contentHtml: string;
  postType: string;
  visibility: string;
  parentId: string | null;
  replyCount: number;
  likeCount: number;
  repostCount: number;
  quoteCount: number;
  viewCount: number;
  bookmarkCount: number;
  momentumScore: number;
  momentumVelocity: number;
  sensitiveContent: boolean;
  contentWarning: string | null;
  subscriberOnly: boolean;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
  media?: PostMedia[];
  quotedPost?: PostCardData | null;
}

interface PostCardProps {
  post: PostCardData;
  variant?: 'feed' | 'detail' | 'compact';
  showMomentum?: boolean;
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function getMomentumColor(score: number): string {
  if (score >= 80) return 'var(--momentum-hot)';
  if (score >= 50) return 'var(--color-warning)';
  return 'var(--momentum-cold)';
}

export const PostCard = memo(function PostCard({ post, variant = 'feed', showMomentum = false }: PostCardProps) {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [bookmarkCount, setBookmarkCount] = useState(post.bookmarkCount);
  const [showReply, setShowReply] = useState(false);
  const [showSensitive, setShowSensitive] = useState(!post.sensitiveContent);
  const [heartAnim, setHeartAnim] = useState<'idle' | 'liked' | 'unliked'>('idle');
  const [repostAnim, setRepostAnim] = useState<'idle' | 'reposted'>('idle');
  const [bookmarkAnim, setBookmarkAnim] = useState<'idle' | 'bookmarked' | 'unbookmarked'>('idle');

  const api = createApiClient(token ?? undefined);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: () => isLiked ? api.posts.unlike(post.id) : api.posts.like(post.id),
    onMutate: () => {
      const next = !isLiked;
      setIsLiked(next);
      setLikeCount((c) => c + (next ? 1 : -1));
      setHeartAnim(next ? 'liked' : 'unliked');
      setTimeout(() => setHeartAnim('idle'), 500);
    },
    onError: () => {
      // Revert
      setIsLiked(post.isLiked ?? false);
      setLikeCount(post.likeCount);
    },
  });

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: () => isBookmarked ? api.posts.unbookmark(post.id) : api.posts.bookmark(post.id),
    onMutate: () => {
      const next = !isBookmarked;
      setIsBookmarked(next);
      setBookmarkCount((c) => c + (next ? 1 : -1));
      setBookmarkAnim(next ? 'bookmarked' : 'unbookmarked');
      setTimeout(() => setBookmarkAnim('idle'), 450);
    },
    onError: () => {
      setIsBookmarked(post.isBookmarked ?? false);
      setBookmarkCount(post.bookmarkCount);
    },
  });

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    likeMutation.mutate();
  }, [isAuthenticated, isLiked, likeMutation]);

  const handleBookmark = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    bookmarkMutation.mutate();
  }, [isAuthenticated, isBookmarked, bookmarkMutation]);

  const handleCardClick = useCallback(() => {
    if (variant !== 'detail') {
      router.push(`/p/${post.id}`);
    }
  }, [variant, post.id, router]);

  const timeAgo = formatDistanceToNowStrict(
    new Date(typeof post.createdAt === 'string' ? post.createdAt : new Date()),
    { addSuffix: false },
  );
  const isHot = post.momentumScore >= 80;
  const isTrending = post.momentumVelocity > 5;

  return (
    <motion.article
      className={`${styles.card} ${styles[`card--${variant}`]}`}
      variants={variant === 'detail' ? undefined : feedItemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      onClick={handleCardClick}
      style={{ cursor: variant === 'detail' ? 'default' : 'pointer' }}
    >
      {/* Momentum indicator bar (top edge glow) */}
      {showMomentum && post.momentumScore > 20 && (
        <motion.div
          className={styles.momentumBar}
          style={{ background: getMomentumColor(post.momentumScore) }}
          custom={post.momentumScore}
          variants={momentumBarVariants}
          initial="initial"
          animate="animate"
        />
      )}

      <div className={styles.inner}>
        {/* Avatar column */}
        <div className={styles.avatarCol}>
          <Link
            href={`/u/${post.author.username}`}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className={styles.avatar}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
            >
              {post.author.avatarUrl ? (
                <img
                  src={post.author.avatarUrl}
                  alt={post.author.displayName}
                  loading="lazy"
                />
              ) : (
                <span>{post.author.displayName[0]?.toUpperCase()}</span>
              )}
            </motion.div>
          </Link>

          {/* Thread line */}
          {post.replyCount > 0 && variant === 'detail' && (
            <div className={styles.threadLine} />
          )}
        </div>

        {/* Content column */}
        <div className={styles.contentCol}>
          {/* Author row */}
          <div className={styles.authorRow}>
            <Link
              href={`/u/${post.author.username}`}
              className={styles.authorLink}
              onClick={(e) => e.stopPropagation()}
            >
              <span className={styles.displayName}>{post.author.displayName}</span>
              {post.author.isVerified && (
                <motion.span
                  className="verified-badge"
                  whileHover={{ scale: 1.2 }}
                  title="Verified"
                >
                  <BadgeCheck size={10} color="white" strokeWidth={2.5} />
                </motion.span>
              )}
              <span className={styles.username}>@{post.author.username}</span>
            </Link>

            <span className={styles.dot}>·</span>
            <time
              className={styles.time}
              dateTime={post.createdAt}
              title={new Date(post.createdAt).toLocaleString()}
            >
              {timeAgo}
            </time>

            {/* Trending badges */}
            <div className={styles.badges}>
              {isHot && (
                <motion.span
                  className={`${styles.badge} ${styles.badgeHot}`}
                  variants={velocitySparkVariants}
                  animate="active"
                  title="Hot — high momentum"
                >
                  <Flame size={10} />
                </motion.span>
              )}
              {isTrending && !isHot && (
                <span className={`${styles.badge} ${styles.badgeTrending}`} title="Rising fast">
                  <Zap size={10} />
                </span>
              )}
            </div>

            {/* More options */}
            <motion.button
              className={styles.moreBtn}
              onClick={(e) => e.stopPropagation()}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="More options"
            >
              <MoreHorizontal size={16} />
            </motion.button>
          </div>

          {/* Content warning */}
          {post.sensitiveContent && !showSensitive && (
            <div className={styles.contentWarning}>
              <span>⚠ {post.contentWarning ?? 'Sensitive content'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setShowSensitive(true); }}
                className={styles.showBtn}
              >
                Show
              </button>
            </div>
          )}

          {/* Post body */}
          {showSensitive && (
            <div
              className={`post-content ${styles.content} ${variant === 'compact' ? styles.contentCompact : ''}`}
              dangerouslySetInnerHTML={{ __html: post.contentHtml || post.content }}
            />
          )}

          {/* Media grid */}
          {showSensitive && post.media && post.media.length > 0 && (
            <div
              className={`media-grid-${Math.min(post.media.length, 4)} ${styles.mediaGrid}`}
              onClick={(e) => e.stopPropagation()}
            >
              {post.media.slice(0, 4).map((pm, i) => (
                <div key={pm.media.id} className={`media-item ${styles.mediaItem}`}>
                  {pm.media.type === 'video' ? (
                    <video
                      src={pm.media.url}
                      poster={pm.media.thumbnailUrl ?? undefined}
                      controls
                      className={styles.media}
                    />
                  ) : (
                    <img
                      src={pm.media.url}
                      alt={pm.media.altText ?? ''}
                      className={styles.media}
                      loading="lazy"
                    />
                  )}
                  {post.media!.length > 4 && i === 3 && (
                    <div className={styles.moreMedia}>+{post.media!.length - 4}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quoted post */}
          {post.quotedPost && (
            <div className={styles.quotedPost} onClick={(e) => { e.stopPropagation(); router.push(`/p/${post.quotedPost!.id}`); }}>
              <div className={styles.quotedAuthor}>
                <strong>{post.quotedPost.author.displayName}</strong>
                <span>@{post.quotedPost.author.username}</span>
              </div>
              <p className={styles.quotedContent}>{post.quotedPost.content}</p>
            </div>
          )}

          {/* Edited indicator */}
          {post.isEdited && (
            <span className={styles.editedBadge}>Edited</span>
          )}

          {/* Action bar */}
          <div className={styles.actions}>
            {/* Reply */}
            <motion.button
              className={`${styles.actionBtn} ${styles.actionReply}`}
              onClick={(e) => { e.stopPropagation(); if (!isAuthenticated) { router.push('/auth/login'); return; } setShowReply(true); }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.85 }}
              aria-label={`Reply, ${post.replyCount} replies`}
            >
              <MessageCircle size={17} strokeWidth={1.8} />
              {post.replyCount > 0 && <span>{formatCount(post.replyCount)}</span>}
            </motion.button>

            {/* Repost */}
            <motion.button
              className={`${styles.actionBtn} ${styles.actionRepost} ${post.isReposted ? styles.active : ''}`}
              onClick={(e) => e.stopPropagation()}
              variants={repostVariants}
              animate={repostAnim}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.85 }}
              aria-label={`Repost, ${post.repostCount} reposts`}
            >
              <Repeat2 size={17} strokeWidth={1.8} />
              {post.repostCount > 0 && <span>{formatCount(post.repostCount)}</span>}
            </motion.button>

            {/* Like */}
            <motion.button
              className={`${styles.actionBtn} ${styles.actionLike} ${isLiked ? styles.active : ''}`}
              onClick={handleLike}
              variants={heartVariants}
              animate={heartAnim}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.85 }}
              aria-label={`Like, ${likeCount} likes`}
              aria-pressed={isLiked}
            >
              <Heart
                size={17}
                strokeWidth={1.8}
                fill={isLiked ? 'var(--color-like)' : 'none'}
                stroke={isLiked ? 'var(--color-like)' : 'currentColor'}
              />
              {likeCount > 0 && (
                <span style={{ color: isLiked ? 'var(--color-like)' : undefined }}>
                  {formatCount(likeCount)}
                </span>
              )}
            </motion.button>

            {/* Bookmark */}
            <motion.button
              className={`${styles.actionBtn} ${styles.actionBookmark} ${isBookmarked ? styles.active : ''}`}
              onClick={handleBookmark}
              variants={bookmarkVariants}
              animate={bookmarkAnim}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.85 }}
              aria-label={`Bookmark${isBookmarked ? 'ed' : ''}`}
              aria-pressed={isBookmarked}
            >
              <Bookmark
                size={17}
                strokeWidth={1.8}
                fill={isBookmarked ? 'var(--color-bookmark)' : 'none'}
                stroke={isBookmarked ? 'var(--color-bookmark)' : 'currentColor'}
              />
            </motion.button>

            {/* Share */}
            <motion.button
              className={`${styles.actionBtn} ${styles.actionShare}`}
              onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(`${window.location.origin}/p/${post.id}`); }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.85 }}
              aria-label="Share"
            >
              <Share2 size={15} strokeWidth={1.8} />
            </motion.button>

            {/* Momentum score */}
            {showMomentum && (
              <div className={styles.momentumScore} style={{ color: getMomentumColor(post.momentumScore) }}>
                {post.momentumScore.toFixed(0)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reply modal */}
      <ComposeModal
        isOpen={showReply}
        onClose={() => setShowReply(false)}
        parentId={post.id}
      />
    </motion.article>
  );
});
