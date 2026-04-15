'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createApiClient, ApiError } from '@/lib/api-client';
import { useStore } from '@/lib/store';
import { pageVariants } from '@/lib/framer-variants';
import { parseAuthPayload } from '../_auth-utils';
import styles from '../auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useStore((s) => ({
    setAuth: s.setAuth,
    isAuthenticated: s.isAuthenticated,
  }));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const payload = await createApiClient().auth.login(email.trim(), password);
      const parsed = parseAuthPayload(payload);
      setAuth(parsed.user, parsed.accessToken, parsed.refreshToken);
      router.replace('/');
    } catch (err) {
      if (err instanceof ApiError && (err.statusCode === 0 || err.statusCode >= 500)) {
        setError(
          'API Connection Failed: Ensure your DATABASE_URL is configured correctly and your PostgreSQL server is running.',
        );
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to sign in right now.');
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
        Welcome <span className="gradient-text">back</span>
      </h1>
      <p className={styles.subtitle}>Sign in to continue your momentum.</p>

      <form onSubmit={onSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@nexus.app"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your secure password"
          />
        </div>
        <button className={styles.submitBtn} disabled={pending} type="submit">
          {pending ? 'Signing in...' : 'Sign in'}
        </button>
        {error && <div className={styles.error}>{error}</div>}
      </form>

      <p className={styles.switchText}>
        New here? <Link href="/auth/register">Create an account</Link>
      </p>
    </motion.div>
  );
}
