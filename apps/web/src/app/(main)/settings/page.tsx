'use client';

import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/framer-variants';
import styles from './settings-page.module.css';

const settingsRows = [
  { title: 'Account', description: 'Manage profile, username, and email.' },
  { title: 'Privacy', description: 'Control visibility and discoverability.' },
  { title: 'Notifications', description: 'Choose what alerts you receive.' },
  { title: 'Appearance', description: 'Theme, fonts, and display options.' },
];

export default function SettingsPage() {
  return (
    <motion.section className={styles.page} variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </header>

      <div className={styles.list}>
        {settingsRows.map((row) => (
          <button key={row.title} className={styles.row}>
            <span className={styles.rowTitle}>{row.title}</span>
            <span className={styles.rowDesc}>{row.description}</span>
          </button>
        ))}
      </div>
    </motion.section>
  );
}
