'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/framer-variants';
import styles from './bookmarks-page.module.css';

const starterCollections = [
  { name: 'Product Ideas', count: 12 },
  { name: 'Design Inspiration', count: 8 },
  { name: 'Growth Threads', count: 15 },
];

export default function BookmarksPage() {
  return (
    <motion.section className={styles.page} variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <header className={styles.header}>
        <h1 className={styles.title}>Bookmarks</h1>
      </header>

      <div className={styles.stateCard}>
        Your saved posts will appear here. Start by saving posts from Explore or Trending.
      </div>

      <div className={styles.collections}>
        {starterCollections.map((collection) => (
          <Link key={collection.name} href="/explore" className={styles.collection}>
            <div className={styles.collectionName}>{collection.name}</div>
            <div className={styles.collectionMeta}>{collection.count} items</div>
          </Link>
        ))}
      </div>
    </motion.section>
  );
}
