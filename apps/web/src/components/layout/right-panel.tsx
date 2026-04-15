'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { TrendingUp, Hash, Users } from 'lucide-react';
import { createApiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/store';
import { listContainerVariants, listItemVariants } from '@/lib/framer-variants';
import styles from './right-panel.module.css';

const client = createApiClient();

export function RightPanel() {
  const { data: trends } = useQuery({
    queryKey: ['trending-hashtags'],
    queryFn: () => client.feed.trending('day'),
    staleTime: 5 * 60 * 1000,
  });

  const hashtags = (trends as { hashtags?: { tag: string; postCount: number; velocity: number }[] })?.hashtags ?? [];

  return (
    <div className={styles.panel}>
      {/* Search */}
      <div className={styles.searchBox}>
        <input
          type="search"
          placeholder="Search Nexus..."
          className={styles.searchInput}
          aria-label="Search"
        />
      </div>

      {/* Trending topics */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <TrendingUp size={16} />
          <h2 className={styles.cardTitle}>Trending today</h2>
        </div>
        <motion.ul
          className={styles.list}
          variants={listContainerVariants}
          initial="initial"
          animate="animate"
        >
          {hashtags.slice(0, 8).map((h, i) => (
            <motion.li key={h.tag} variants={listItemVariants}>
              <Link href={`/hashtag/${h.tag}`} className={styles.trendItem}>
                <div className={styles.trendRank}>#{i + 1}</div>
                <div className={styles.trendInfo}>
                  <div className={styles.trendTag}>
                    <Hash size={13} />
                    <span>{h.tag}</span>
                  </div>
                  <div className={styles.trendMeta}>
                    {h.postCount.toLocaleString()} posts
                    {h.velocity > 0 && (
                      <span className={styles.velocityBadge}>
                        ↑ fast
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </motion.li>
          ))}

          {/* Skeleton when loading */}
          {hashtags.length === 0 &&
            Array.from({ length: 6 }).map((_, i) => (
              <li key={i}>
                <div className={styles.skeleton}>
                  <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 10, width: '60%' }} />
                </div>
              </li>
            ))}
        </motion.ul>
      </div>

      {/* Footer links */}
      <div className={styles.footer}>
        <Link href="/about">About</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="https://github.com" target="_blank">GitHub</Link>
        <span>© 2026 Nexus</span>
      </div>
    </div>
  );
}
