'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bell, Mail, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUnreadNotifications, useAuth } from '@/lib/store';
import styles from './mobile-nav.module.css';

export function MobileNav() {
  const pathname = usePathname();
  const unread = useUnreadNotifications();
  const { user, isAuthenticated } = useAuth();

  const items = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/explore', icon: Search, label: 'Explore' },
    {
      href: '/notifications',
      icon: Bell,
      label: 'Alerts',
      badge: unread > 0 ? unread : undefined,
    },
    { href: '/messages', icon: Mail, label: 'DMs' },
    { href: isAuthenticated ? `/u/${user?.username}` : '/auth/login', icon: User, label: 'Profile' },
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className={styles.nav} aria-label="Mobile navigation">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`${styles.item} ${isActive(item.href) ? styles.active : ''}`}
          aria-label={item.label}
        >
          <div className={styles.iconWrap}>
            <item.icon size={22} strokeWidth={isActive(item.href) ? 2.5 : 1.8} />
            {item.badge !== undefined && (
              <span className={styles.badge}>{item.badge > 9 ? '9+' : item.badge}</span>
            )}
          </div>
          {isActive(item.href) && (
            <motion.div className={styles.dot} layoutId="mobile-nav-dot" />
          )}
        </Link>
      ))}
    </nav>
  );
}
