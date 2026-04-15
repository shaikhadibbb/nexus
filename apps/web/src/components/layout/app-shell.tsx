'use client';

import { Sidebar } from './sidebar';
import { RightPanel } from './right-panel';
import { MobileNav } from './mobile-nav';
import { ComposeModal } from '@/components/compose/compose-modal';
import { useStore } from '@/lib/store';
import styles from './app-shell.module.css';

export function AppShell({ children }: { children: React.ReactNode }) {
  const composeOpen = useStore((s) => s.composeOpen);
  const setComposeOpen = useStore((s) => s.setComposeOpen);

  return (
    <div className={styles.shell}>
      <div className={`nexus-layout ${styles.layout}`}>
        {/* Left Sidebar */}
        <aside className={`nexus-sidebar ${styles.sidebarCol}`}>
          <Sidebar />
        </aside>

        {/* Main content */}
        <main className={styles.mainCol}>
          {children}
        </main>

        {/* Right panel */}
        <aside className={`nexus-right-panel ${styles.rightCol}`}>
          <RightPanel />
        </aside>
      </div>

      {/* Mobile bottom nav */}
      <div className="nexus-mobile-nav">
        <MobileNav />
      </div>

      {/* Compose modal */}
      <ComposeModal isOpen={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  );
}
