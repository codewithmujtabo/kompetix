'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ClipboardCheck, FolderTree, PencilLine, Send } from 'lucide-react';
import { questionMakerHttp, useQuestionMaker } from '@/lib/auth/question-maker-context';
import { CompetitionPicker, useQuestionBank } from '@/lib/question-bank/context';
import { PageHeader } from '@/components/shell/page-header';
import { StatCard } from '@/components/shell/stat-card';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface QuestionRow {
  id: string;
  status: string;
  writerId: string;
}

export default function QuestionBankDashboard() {
  const { user } = useQuestionMaker();
  const { selectedId, selected, competitions, loading: compsLoading } = useQuestionBank();
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setRows([]);
      return;
    }
    setLoading(true);
    questionMakerHttp
      .get<QuestionRow[]>(`/question-bank/questions?compId=${encodeURIComponent(selectedId)}`)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const mine = rows.filter((q) => q.writerId === user?.id);
  const myDraft = mine.filter((q) => q.status === 'draft').length;
  const mySubmitted = mine.filter((q) => q.status === 'submitted').length;
  const myApproved = mine.filter((q) => q.status === 'approved').length;
  const reviewQueue = rows.filter((q) => q.status === 'submitted' && q.writerId !== user?.id).length;

  const busy = loading || compsLoading;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 lg:p-8">
      <PageHeader
        eyebrow="Question Bank"
        title="Dashboard"
        subtitle="Author and review competition questions for the bank."
      />

      {!compsLoading && competitions.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm font-medium text-foreground">No competitions assigned yet</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Ask an administrator to grant you question-bank access for a competition.
          </p>
        </Card>
      ) : (
        <>
          <CompetitionPicker />

          {selected && (
            <p className="text-sm text-muted-foreground">
              Showing the bank for{' '}
              <span className="font-medium text-foreground">{selected.name}</span>
              {selected.grades.length > 0 && (
                <>
                  {' · '}
                  <span className="font-mono text-xs">{selected.grades.join(' / ')}</span>
                </>
              )}
            </p>
          )}

          {busy ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="My Drafts" value={myDraft} icon={PencilLine} accent="amber" />
              <StatCard label="My Submitted" value={mySubmitted} icon={Send} accent="indigo" />
              <StatCard label="My Approved" value={myApproved} icon={CheckCircle2} accent="green" />
              <StatCard
                label="Review Queue"
                value={reviewQueue}
                icon={ClipboardCheck}
                accent="rose"
                hint="Submitted by other authors"
              />
            </div>
          )}

          <Card className="p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Get started
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Link
                href="/question-bank/taxonomy"
                className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1">
                  <FolderTree className="size-[1.1rem]" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">Manage taxonomy</p>
                  <p className="text-xs text-muted-foreground">
                    Subjects, topics and subtopics for this competition.
                  </p>
                </div>
              </Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
