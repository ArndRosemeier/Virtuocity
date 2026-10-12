import { ModuleHost, blueprintProblems, loadModules } from '@virtuocity/core';
import { describe, expect, it } from 'vitest';
import { bookRoomModule } from './index';

describe('book room blueprint', () => {
  it('is installed with the module and asks for a writer and a reviewer', () => {
    const host = loadModules(new ModuleHost(), [bookRoomModule]);
    expect(blueprintProblems(host.blueprints.get('book-room'), [])).toEqual([
      'No installed skill can fill "writer@1.0" for Quill.',
      'No installed skill can fill "reviewer@1.0" for Marlow.',
    ]);
  });
});
