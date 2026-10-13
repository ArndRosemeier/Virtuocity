import type { ModalityInfo } from './models';
import type { CallStats } from './stats';

/**
 * Decision models (OpenRouter calls the modality `decisions`, e.g. TypeSafe's
 * Jev) answer typed questions about a state with calibrated probabilities
 * instead of writing text: fast and cheap for choices such as who speaks next.
 */
export const DECISIONS_MODALITY: ModalityInfo = {
  id: 'decisions',
  label: 'Decisions',
  description: 'Quick typed choices, such as who speaks next, from decision models like Jev.',
};

/** Guidance per option; for a `noul` question the options are `true` and `false`. */
type Criteria = Readonly<Record<string, string>>;

/** One question about the state: pick an option, judge a condition, or place on a scale. */
export type DecisionQuestion =
  | { readonly type: 'choice'; readonly instructions: string; readonly criteria: Criteria }
  | {
      readonly type: 'noul';
      readonly instructions: string;
      readonly criteria: { readonly true: string; readonly false: string };
    }
  | {
      readonly type: 'score';
      readonly instructions: string;
      /** The levels of the scale, lowest first. */
      readonly criteria: readonly string[];
    };

export type DecisionAnswer =
  | {
      readonly type: 'choice';
      readonly choice: string;
      readonly confidence?: number;
      readonly probabilities?: Readonly<Record<string, number>>;
    }
  | { readonly type: 'noul'; readonly noul: number }
  | { readonly type: 'score'; readonly score: number; readonly confidence?: number };

export interface DecisionRequest {
  readonly model: string;
  /** What the questions are about: any JSON value. */
  readonly state: unknown;
  /** By an id the caller picks; answers come back under the same ids. */
  readonly questions: Readonly<Record<string, DecisionQuestion>>;
  readonly signal?: AbortSignal;
}

export interface DecisionResult {
  readonly answers: Readonly<Record<string, DecisionAnswer>>;
  readonly stats: CallStats;
}

/** A decision call as skills make it: the runtime picks the decisions model. */
export type Decide = (request: Omit<DecisionRequest, 'model'>) => Promise<DecisionResult>;

/** The choice a decision model made for a choice question, or `undefined` if it gave none. */
export function chosen(result: DecisionResult, questionId: string): string | undefined {
  const answer = result.answers[questionId];
  return answer?.type === 'choice' ? answer.choice : undefined;
}
