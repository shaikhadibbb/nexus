import type { Metadata } from 'next';
import styles from './auth.module.css';

export const metadata: Metadata = {
  title: 'Auth',
  description: 'Sign in or create your Nexus account.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.authRoot}>{children}</div>;
}
