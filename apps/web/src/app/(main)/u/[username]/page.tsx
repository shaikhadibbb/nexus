'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createApiClient } from '@/lib/api-client';
import { PostCard, type PostCardData } from '@/components/posts/post-card';
import { useAuth } from '@/lib/store';
import { listContainerVariants, listItemVariants, pageVariants } from '@/lib/framer-variants';
import styles from './profile-page.module.css';

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  reputationScore: number;
  isFollowing?: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function extractProfile(payload: unknown): UserProfile | null {
  const root = asRecord(payload);
  const user = asRecord(root?.['user']) ?? root;
  if (!user?.['id'] || !user?.['username']) return null;

  return {
    id: String(user['id']),
    username: String(user['username']),
    displayName: String(user['displayName'] ?? user['username']),
    avatarUrl: (user['avatarUrl'] as string | null | undefined) ?? null,
    followerCount: Number(user['followerCount'] ?? 0),
    followingCount: Number(user['followingCount'] ?? 0),
    reputationScore: Number(user['reputationScore'] ?? 0),
    isFollowing: Boolean(user['isFollowing']),
  };
}

function extractPosts(payload: unknown): PostCardData[] {
  const root = asRecord(payload);
  const candidates = [root?.['posts'], root?.['items'], root?.['data']];
  const posts = candidates.find((entry) => Array.isArray(entry));
  return (posts as PostCardData[] | undefined) ?? [];
}

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const { token, user: me, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const api = useMemo(() => createApiClient(token ?? undefined), [token]);

  const profileQuery = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => extractProfile(await api.users.get(username)),
  });

  const postsQuery = useQuery({
    queryKey: ['profile-posts', username],
    queryFn: async () => {
      const profile = profileQuery.data;
      const payload = await api.feed.get({
        feedType: 'user',
        userId: profile?.id,
        username,
        limit: 20,
      });
      return extractPosts(payload);
    },
    enabled: !!profileQuery.data,
  });

  const followMutation = useMutation({
    mutationFn: async (nextFollowState: boolean) => {
      if (nextFollowState) return api.users.follow(username);
      return api.users.unfollow(username);
    },
    onMutate: async (nextFollowState) => {
      await queryClient.cancelQueries({ queryKey: ['profile', username] });
      const previous = queryClient.getQueryData<UserProfile | null>(['profile', username]);
      if (previous) {
        queryClient.setQueryData<UserProfile | null>(['profile', username], {
          ...previous,
          isFollowing: nextFollowState,
          followerCount: Math.max(0, previous.followerCount + (nextFollowState ? 1 : -1)),
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['profile', username], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
    },
  });

  const profile = profileQuery.data;
  const isSelf = me?.username === profile?.username;

  return (
    <motion.section
      className={styles.page}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {profileQuery.isLoading && <div className={styles.stateCard}>Loading profile...</div>}
      {profileQuery.isError && <div className={styles.stateCard}>Unable to load profile right now.</div>}
      {!profileQuery.isLoading && !profileQuery.isError && !profile && (
        <div className={styles.stateCard}>User not found.</div>
      )}

      {profile && (
        <>
          <header className={styles.header}>
            <div className={styles.cover} />
            <div className={styles.headerBody}>
              <div className={styles.topRow}>
                <div className={styles.avatar}>
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.displayName} />
                  ) : (
                    <span>{profile.displayName[0]?.toUpperCase()}</span>
                  )}
                </div>

                {isAuthenticated && !isSelf && (
                  <button
                    className={`${styles.followBtn} ${profile.isFollowing ? styles.followBtnAlt : ''}`}
                    onClick={() => followMutation.mutate(!profile.isFollowing)}
                    disabled={followMutation.isPending}
                  >
                    {followMutation.isPending
                      ? 'Updating...'
                      : profile.isFollowing
                        ? 'Following'
                        : 'Follow'}
                  </button>
                )}
              </div>

              <h1 className={styles.name}>{profile.displayName}</h1>
              <p className={styles.username}>@{profile.username}</p>
              <div className={styles.meta}>
                <span><strong>{profile.followerCount.toLocaleString()}</strong> Followers</span>
                <span><strong>{profile.followingCount.toLocaleString()}</strong> Following</span>
                <span className={styles.score}>Reputation {profile.reputationScore.toFixed(0)}</span>
              </div>
            </div>
          </header>

          <motion.div className={styles.feedList} variants={listContainerVariants} initial="initial" animate="animate">
            {postsQuery.isLoading && <div className={styles.stateCard}>Loading posts...</div>}

            {!postsQuery.isLoading && (postsQuery.data?.length ?? 0) === 0 && (
              <div className={styles.stateCard}>No posts published yet.</div>
            )}

            {postsQuery.data && (
              <AnimatePresence initial={false}>
                {postsQuery.data.map((post) => (
                  <motion.div key={post.id} className={styles.feedItem} variants={listItemVariants} layout>
                    <PostCard post={post} />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        </>
      )}
    </motion.section>
  );
}
