import { reviewerContract } from '@virtuocity/contract-critique';
import { chatText, conformanceSuite, conformanceTarget, scriptedProvider } from '@virtuocity/core';
import { describe, it } from 'vitest';
import { reviewerSkill } from './index';

const reply = (system: string) =>
  system.includes('Decide whether')
    ? '```json\n{"approved": false, "summary": "Strong mood, thin stakes.", "notes": []}\n```'
    : '{"notes": [{"comment": "Show the waiting.", "quote": "Mira waited by the door"}]}';

describe('reviewer skill conforms to reviewer and critic', () => {
  const provider = scriptedProvider((request) =>
    reply(chatText(request.messages[0]?.content ?? '')),
  );
  const target = conformanceTarget(reviewerContract, { skills: [reviewerSkill], provider });
  for (const testCase of conformanceSuite(reviewerContract)) {
    it(`${testCase.contractId}: ${testCase.name}`, () => testCase.run(target));
  }
});
