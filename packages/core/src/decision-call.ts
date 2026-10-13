import type { DecisionRequest, DecisionResult } from './decisions';
import { DECISIONS_MODALITY } from './decisions';
import { parseModelRef } from './models';
import type { CompletionRequest, CompletionResult, ModelProvider } from './provider';

/**
 * A decision call shaped so the call log can trace and count it like any
 * other: the state and questions are its prompt, the answers its text.
 * `run` keeps the typed answers in `result`.
 */
export function decisionCall(
  model: string,
  request: Omit<DecisionRequest, 'model'>,
  providers: (id: string) => ModelProvider,
): {
  readonly traced: CompletionRequest;
  readonly run: (call: CompletionRequest) => Promise<CompletionResult>;
  readonly result: () => DecisionResult;
} {
  const asked = JSON.stringify({ state: request.state, questions: request.questions }, null, 2);
  const traced: CompletionRequest = {
    modality: DECISIONS_MODALITY.id,
    model,
    messages: [{ role: 'user', content: asked }],
    ...(request.signal ? { signal: request.signal } : {}),
  };
  let decided: DecisionResult | undefined;
  const run = async (call: CompletionRequest): Promise<CompletionResult> => {
    const ref = parseModelRef(call.model);
    const provider = providers(ref.provider);
    if (!provider.decide) throw new Error(`${provider.name} cannot run decision models`);
    const signal = call.signal ? { signal: call.signal } : {};
    const answer = await provider.decide({ ...request, model: ref.model, ...signal });
    decided = answer;
    return { text: JSON.stringify(answer.answers, null, 2), stats: answer.stats };
  };
  const result = () => {
    if (!decided) throw new Error('The decision call returned nothing');
    return decided;
  };
  return { traced, run, result };
}
