import type { Question } from '../types';
import { languageQuestions } from './language';
import { dataAnalysisQuestions } from './data-analysis';
import { mathQuestions } from './math';
import { logicQuestions } from './logic';
import { sequenceQuestions } from './sequence';

export const allQuestions: Question[] = [
  ...languageQuestions,
  ...dataAnalysisQuestions,
  ...mathQuestions,
  ...logicQuestions,
  ...sequenceQuestions,
];

export { languageQuestions, dataAnalysisQuestions, mathQuestions, logicQuestions, sequenceQuestions };
