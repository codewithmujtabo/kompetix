'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Trash2 } from 'lucide-react';
import { adminHttp } from '@/lib/api/client';
import { PageHeader } from '@/components/shell/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Indonesian K-12 school levels — the grades a maker may be scoped to.
const GRADES = ['SD', 'SMP', 'SMA'];

interface QuestionMaker {
  id: string;
  fullName: string;
  email: string;
  kid: string;
  accessCount: number;
}

interface Access {
  compId: string;
  competitionName: string;
  grades: string[];
}

interface Competition {
  id: string;
  name: string;
}

function AccessDialog({
  maker,
  competitions,
  onClose,
  onChanged,
}: {
  maker: QuestionMaker | null;
  competitions: Competition[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [accesses, setAccesses] = useState<Access[]>([]);
  const [loading, setLoading] = useState(false);
  const [grantCompId, setGrantCompId] = useState('');
  const [grantGrades, setGrantGrades] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      setAccesses(await adminHttp.get<Access[]>(`/admin/question-makers/${userId}/accesses`));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load access grants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (maker) {
      setGrantCompId('');
      setGrantGrades([]);
      load(maker.id);
    }
  }, [maker, load]);

  // Picking an already-granted competition pre-fills its current grades.
  const onPickCompetition = (compId: string) => {
    setGrantCompId(compId);
    setGrantGrades(accesses.find((a) => a.compId === compId)?.grades ?? []);
  };

  const toggleGrade = (g: string) =>
    setGrantGrades((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const grant = async () => {
    if (!maker || !grantCompId) return;
    setSaving(true);
    try {
      await adminHttp.post(`/admin/question-makers/${maker.id}/accesses`, {
        compId: grantCompId,
        grades: grantGrades,
      });
      toast.success('Access granted.');
      setGrantCompId('');
      setGrantGrades([]);
      await load(maker.id);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to grant access');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (compId: string) => {
    if (!maker) return;
    try {
      await adminHttp.delete(`/admin/question-makers/${maker.id}/accesses/${compId}`);
      toast.success('Access revoked.');
      await load(maker.id);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to revoke access');
    }
  };

  const existing = accesses.some((a) => a.compId === grantCompId);

  return (
    <Dialog open={!!maker} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Question-bank access</DialogTitle>
          <DialogDescription>
            {maker?.fullName} · grant per-competition access and the grades they may author for.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Current grants
          </p>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : accesses.length === 0 ? (
            <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              No competitions granted yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {accesses.map((a) => (
                <li
                  key={a.compId}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {a.competitionName}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {a.grades.length > 0 ? (
                        a.grades.map((g) => (
                          <Badge key={g} variant="outline" className="font-mono text-[10px]">
                            {g}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">All grades</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Revoke"
                    onClick={() => revoke(a.compId)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {existing ? 'Update grades' : 'Grant access'}
          </p>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">Competition</Label>
            <Select value={grantCompId || undefined} onValueChange={onPickCompetition}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a competition…" />
              </SelectTrigger>
              <SelectContent>
                {competitions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">
              Grades <span className="font-normal">(none = all grades)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <label
                  key={g}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={grantGrades.includes(g)}
                    onChange={() => toggleGrade(g)}
                    className="size-4 accent-primary"
                  />
                  {g}
                </label>
              ))}
            </div>
          </div>
          <Button onClick={grant} disabled={!grantCompId || saving} className="w-full">
            {saving ? 'Saving…' : existing ? 'Update grades' : 'Grant access'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function QuestionMakersPage() {
  const [makers, setMakers] = useState<QuestionMaker[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<QuestionMaker | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, c] = await Promise.all([
        adminHttp.get<QuestionMaker[]>('/admin/question-makers'),
        adminHttp.get<Competition[]>('/competitions'),
      ]);
      setMakers(m);
      setCompetitions(c);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load question makers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 lg:p-8">
      <PageHeader
        eyebrow="Management"
        title="Question Makers"
        subtitle="Authors of the competition question bank. Grant each one per-competition access."
      />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-40">Person ID</TableHead>
                <TableHead className="w-32">Competitions</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : makers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">
                    No question-maker accounts yet.
                  </TableCell>
                </TableRow>
              ) : (
                makers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-foreground">{m.fullName}</TableCell>
                    <TableCell className="font-mono text-[12px] text-muted-foreground">
                      {m.email}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {m.kid}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {m.accessCount} granted
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setActive(m)}>
                        <KeyRound className="size-3.5" />
                        Manage access
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AccessDialog
        maker={active}
        competitions={competitions}
        onClose={() => setActive(null)}
        onChanged={load}
      />
    </div>
  );
}
