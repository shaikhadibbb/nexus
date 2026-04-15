'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Search, Bell, Mail, Bookmark, User, Settings,
  PenSquare, TrendingUp, Users, LogOut, X, Menu,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStore, useAuth, useUnreadNotifications } from '@/lib/store';
import { sidebarVariants, dropdownVariants, listItemVariants, staggerContainer } from '@/lib/framer-variants';
import { useState } from 'react';
import styles from './sidebar.module.css';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const unread = useUnreadNotifications();
  const { setComposeOpen, clearAuth } = useStore((s) => ({
    setComposeOpen: s.setComposeOpen,
    clearAuth: s.clearAuth,
  }));
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems: NavItem[] = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/explore', label: 'Explore', icon: Search },
    { href: '/trending', label: 'Trending', icon: TrendingUp },
    ...(isAuthenticated
      ? [
          { href: '/notifications', label: 'Notifications', icon: Bell, badge: unread > 0 ? unread : undefined },
          { href: '/messages', label: 'Messages', icon: Mail },
          { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
          { href: '/people', label: 'People', icon: Users },
          { href: `/u/${user?.username ?? ''}`, label: 'Profile', icon: User },
          { href: '/settings', label: 'Settings', icon: Settings },
        ]
      : []),
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className={styles.sidebar}>
      {/* Logo */}
      <Link href="/" className={styles.logo}>
        <motion.div
          className={styles.logoMark}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        >
          <span className="gradient-text" style={{ fontSize: 24, fontWeight: 800 }}>N</span>
        </motion.div>
        <span className={styles.logoText}>nexus</span>
      </Link>

      {/* Navigation */}
      <motion.ul
        className={styles.nav}
        variants={staggerContainer(50, 80)}
        initial="initial"
        animate="animate"
      >
        {navItems.map((item) => (
          <motion.li key={item.href} variants={listItemVariants}>
            <Link
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
            >
              <motion.div
                className={styles.navIcon}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <item.icon size={22} strokeWidth={isActive(item.href) ? 2.5 : 1.8} />
                {item.badge !== undefined && (
                  <motion.span
                    className={styles.badge}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.span>
                )}
              </motion.div>
              <span className={styles.navLabel}>{item.label}</span>
              {isActive(item.href) && (
                <motion.div
                  className={styles.activeIndicator}
                  layoutId="sidebar-indicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          </motion.li>
        ))}
      </motion.ul>

      {/* Compose button */}
      {isAuthenticated && (
        <motion.button
          className={styles.composeBtn}
          onClick={() => setComposeOpen(true)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        >
          <PenSquare size={18} />
          <span>Create Post</span>
        </motion.button>
      )}

      {/* User account area */}
      {isAuthenticated && user && (
        <div className={styles.account}>
          <button
            className={styles.accountBtn}
            onClick={() => setProfileOpen((p) => !p)}
          >
            <div className={styles.accountAvatar}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} />
              ) : (
                <span>{user.displayName[0]?.toUpperCase()}</span>
              )}
              <div className={styles.onlineDot} />
            </div>
            <div className={styles.accountInfo}>
              <p className={styles.accountName}>{user.displayName}</p>
              <p className={styles.accountUsername}>@{user.username}</p>
            </div>
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                className={styles.profileDropdown}
                variants={dropdownVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Link href={`/u/${user.username}`} className={styles.dropdownItem}>
                  <User size={15} /> View Profile
                </Link>
                <Link href="/settings" className={styles.dropdownItem}>
                  <Settings size={15} /> Settings
                </Link>
                <div className={styles.dropdownDivider} />
                <button
                  className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                  onClick={() => { clearAuth(); setProfileOpen(false); }}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!isAuthenticated && (
        <div className={styles.authCta}>
          <Link href="/auth/login" className={styles.loginBtn}>Sign in</Link>
          <Link href="/auth/register" className={styles.registerBtn}>Join Nexus</Link>
        </div>
      )}
    </nav>
  );
}
