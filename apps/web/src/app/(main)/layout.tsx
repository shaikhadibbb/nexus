import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';

export const metadata: Metadata = { title: 'Home' };

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
