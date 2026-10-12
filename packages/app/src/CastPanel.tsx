import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AppModule, PanelProps } from './types';

function AddActorForm({ session }: PanelProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    void session.join({
      id: crypto.randomUUID(),
      controller: 'ai',
      personality: { name: name.trim(), description: description.trim() },
      skillIds: ['conversation'],
      ...(model.trim() ? { models: { text: model.trim() } } : {}),
    });
    setName('');
    setDescription('');
    setModel('');
  };

  return (
    <form className="add-actor" onSubmit={submit}>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea
        placeholder="Personality, role, backstory…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        placeholder="Model (optional)"
        value={model}
        onChange={(e) => setModel(e.target.value)}
      />
      <button type="submit">Add character</button>
    </form>
  );
}

/** Who is in the scene; characters can join and leave at any time. */
function CastPanel({ session }: PanelProps) {
  return (
    <div className="cast">
      <ul>
        {session.actors
          .filter((a) => a.controller === 'ai')
          .map((a) => (
            <li key={a.id}>
              <strong>{a.personality.name}</strong>
              {a.models?.text && <small> · {a.models.text}</small>}
              <button onClick={() => void session.leave(a.id)}>Remove</button>
            </li>
          ))}
      </ul>
      <AddActorForm session={session} />
    </div>
  );
}

export const castPanelModule: AppModule = {
  id: 'cast-panel',
  register: (host) =>
    host.panels.register({ id: 'cast', title: 'Cast', slot: 'side', component: CastPanel }),
};
