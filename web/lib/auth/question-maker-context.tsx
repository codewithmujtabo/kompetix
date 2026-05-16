'use client';

import { questionMakerHttp } from '@/lib/api/client';
import { createRoleAuth } from './factory';

// Re-export so callers can import the HTTP client from the same module.
export { questionMakerHttp } from '@/lib/api/client';

const { Provider, useHook } = createRoleAuth({
  http: questionMakerHttp,
  acceptRole: (role) => role === 'question_maker',
  hookName: 'useQuestionMaker',
  deniedMessage: 'Access denied. A question-maker account is required.',
});

export const QuestionMakerProvider = Provider;
export const useQuestionMaker = useHook;
