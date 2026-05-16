'use client';

// Question-bank portal scoping context. A question_maker may hold `accesses`
// to several competitions; the whole portal (taxonomy, questions, review) is
// scoped to whichever one is selected here. The choice is persisted so it
// survives navigation and refreshes.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { questionMakerHttp } from '@/lib/api/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface QBCompetition {
  id: string;
  name: string;
  slug: string | null;
  /** The grades this maker may author for in this competition. */
  grades: string[];
}

interface QBContext {
  competitions: QBCompetition[];
  loading: boolean;
  selectedId: string;
  selected: QBCompetition | null;
  setSelectedId: (id: string) => void;
}

const Ctx = createContext<QBContext | null>(null);
const STORAGE_KEY = 'competzy.qb.comp';

export function QuestionBankProvider({ children }: { children: ReactNode }) {
  const [competitions, setCompetitions] = useState<QBCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedIdState] = useState('');

  useEffect(() => {
    questionMakerHttp
      .get<QBCompetition[]>('/question-bank/competitions')
      .then((rows) => {
        setCompetitions(rows);
        const stored =
          typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        const valid = stored && rows.some((c) => c.id === stored) ? stored : rows[0]?.id ?? '';
        setSelectedIdState(valid);
      })
      .catch(() => setCompetitions([]))
      .finally(() => setLoading(false));
  }, []);

  const setSelectedId = useCallback((id: string) => {
    setSelectedIdState(id);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const selected = competitions.find((c) => c.id === selectedId) ?? null;

  return (
    <Ctx.Provider value={{ competitions, loading, selectedId, selected, setSelectedId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useQuestionBank() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useQuestionBank must be used inside QuestionBankProvider');
  return ctx;
}

/** The competition selector — render it at the top of every portal page. */
export function CompetitionPicker({ className }: { className?: string }) {
  const { competitions, selectedId, setSelectedId, loading } = useQuestionBank();
  if (loading || competitions.length === 0) return null;
  return (
    <Select value={selectedId || undefined} onValueChange={setSelectedId}>
      <SelectTrigger className={className ?? 'w-full sm:w-80'}>
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
  );
}
