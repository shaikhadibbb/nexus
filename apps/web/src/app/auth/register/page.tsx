'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ApiError, createApiClient } from '@/lib/api-client';
import { useStore } from '@/lib/store';
import { pageVariants } from '@/lib/framer-variants';
import { parseAuthPayload } from '../_auth-utils';
import styles from '../auth.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useStore((s) => ({
    setAuth: s.setAuth,
    isAuthenticated: s.isAuthenticated,
  }));

  const [form, setForm] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated, router]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    try {
      const payload = await createApiClient().auth.register({
        email: form.email.trim(),
        username: form.username.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        password: form.password,
      });
      const parsed = parseAuthPayload(payload);
      setAuth(parsed.user, parsed.accessToken, parsed.refreshToken);
      router.replace('/');
    } catch (err) {
      if (err instanceof ApiError && (err.statusCode === 0 || err.statusCode >= 500)) {
        setError(
          'API Connection Failed: Ensure your DATABASE_URL is configured correctly and your PostgreSQL server is running.',
        );
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to create your account.');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <motion.div
      className={styles.authCard}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={styles.brand}>
        <div className={styles.brandMark}>
          <span className="gradient-text" style={{ fontWeight: 800, fontSize: 24 }}>N</span>
        </div>
      </div>
      <h1 className={styles.title}>
        Join <span className="gradient-text">Nexus</span>
      </h1>
      <p className={styles.subtitle}>Create your account and publish your first post.</p>

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.field}>
          <label htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            type="text"
            required
            minLength={2}
            maxLength={60}
            value={form.displayName}
            onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
            placeholder="Your name"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_]+"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            placeholder="your_handle"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="you@nexus.app"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder="At least 8 characters"
          />
        </div>
        <button className={styles.submitBtn} disabled={pending} type="submit">
          {pending ? 'Creating account...' : 'Create account'}
        </button>
        {error && <div className={styles.error}>{error}</div>}
      </form>

      <p className={styles.switchText}>
        Already have an account? <Link href="/auth/login">Sign in</Link>
      </p>
    </motion.div>
  );
}
