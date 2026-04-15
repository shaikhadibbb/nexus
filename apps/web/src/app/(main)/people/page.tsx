'use client';

import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/framer-variants';
import styles from './people-page.module.css';

const suggestedPeople = [
  { name: 'Alex Rivera', username: 'alexdev', bio: 'Building AI products in public.' },
  { name: 'Maya Chen', username: 'mayadesign', bio: 'Product designer sharing UI breakdowns.' },
  { name: 'Noah Kim', username: 'noahgrowth', bio: 'Growth experiments, weekly.' },
];

export default function PeoplePage() {
  return (
    <motion.section className={styles.page} variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <header className={styles.header}>
        <h1 className={styles.title}>People</h1>
      </header>

      <div className={styles.list}>
        {suggestedPeople.map((person) => (
          <article key={person.username} className={styles.item}>
            <div className={styles.avatar}>{person.name[0]}</div>
            <div className={styles.info}>
              <p className={styles.name}>{person.name}</p>
              <p className={styles.username}>@{person.username}</p>
              <p className={styles.bio}>{person.bio}</p>
            </div>
            <button className={styles.followBtn}>Follow</button>
          </article>
        ))}
      </div>
    </motion.section>
  );
}
