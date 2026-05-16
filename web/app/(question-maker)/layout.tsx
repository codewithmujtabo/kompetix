'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FolderTree, LayoutGrid, Library, Loader2 } from 'lucide-react';
import { QuestionMakerProvider, useQuestionMaker } from '@/lib/auth/question-maker-context';
import { QuestionBankProvider } from '@/lib/question-bank/context';
import { AppShell, type NavSection } from '@/components/shell/app-shell';

const NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/question-bank', icon: LayoutGrid, exact: true },
      { label: 'Taxonomy', href: '/question-bank/taxonomy', icon: FolderTree },
    ],
  },
];

export default function QuestionMakerLayout({ children }: { children: React.ReactNode }) {
  return (
    <QuestionMakerProvider>
      <QuestionMakerLayoutInner>{children}</QuestionMakerLayoutInner>
    </QuestionMakerProvider>
  );
}

function QuestionMakerLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useQuestionMaker();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppShell
      brand={{ name: 'Competzy', tagline: 'Question Bank', icon: Library }}
      nav={NAV}
      user={{
        name: user.full_name || 'Question Maker',
        email: user.email,
        role: 'Question Maker',
      }}
      onSignOut={async () => {
        await logout();
        router.replace('/');
      }}
    >
      <QuestionBankProvider>{children}</QuestionBankProvider>
    </AppShell>
  );
}
