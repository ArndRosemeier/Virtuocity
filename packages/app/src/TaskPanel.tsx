import { useState } from 'react';
import type { HumanTask } from '@virtuocity/core';
import { Button, SchemaField, defaultValue, labelFor, pruneEmpty } from '@virtuocity/ui';
import type { AppModule, PanelProps } from './types';

/** Shows what a task is about: text fields as quotes, everything else as JSON. */
function TaskInput({ input }: { input: unknown }) {
  const entries =
    input !== null && typeof input === 'object' ? Object.entries(input) : [['input', input]];
  return (
    <dl className="task__input">
      {entries.map(([key, value]) => (
        <div key={String(key)}>
          <dt>{labelFor(String(key))}</dt>
          <dd>{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</dd>
        </div>
      ))}
    </dl>
  );
}

function TaskForm({ task, session }: { task: HumanTask } & Pick<PanelProps, 'session'>) {
  const [value, setValue] = useState(() => defaultValue(task.outputSchema));
  const [error, setError] = useState('');
  const submit = () =>
    void session.tasks
      .submit(task.id, pruneEmpty(task.outputSchema, value))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  return (
    <article className="task">
      <h3 className="task__title">{task.description}</h3>
      <TaskInput input={task.input} />
      <SchemaField schema={task.outputSchema} value={value} onChange={setValue} />
      {error && <p className="composer__error">{error}</p>}
      <div className="task__actions">
        <Button variant="primary" onClick={submit}>
          Submit
        </Button>
        <Button variant="ghost" onClick={() => void session.tasks.cancel(task.id, 'Skipped')}>
          Skip
        </Button>
      </div>
    </article>
  );
}

/** Contract actions the story is waiting for you to answer. */
function TaskPanel({ session }: PanelProps) {
  const tasks = session.tasks.pending();
  if (tasks.length === 0) return <p className="muted">Nothing is waiting for you.</p>;
  return (
    <div className="tasks">
      {tasks.map((task) => (
        <TaskForm key={task.id} task={task} session={session} />
      ))}
    </div>
  );
}

export const taskPanelModule: AppModule = {
  id: 'task-panel',
  register: (host) =>
    host.panels.register({ id: 'tasks', title: 'Your tasks', slot: 'side', component: TaskPanel }),
};
