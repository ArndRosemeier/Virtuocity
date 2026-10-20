import { useState } from 'react';
import type { CallTrace, ChatMessage, SessionRuntime } from '@virtuocity/core';
import { actorName, chatText, everyone } from '@virtuocity/core';
import { IconButton, Modal, Pill, formatUsd } from '@virtuocity/ui';

const STATUS: Record<CallTrace['status'], string> = {
  running: 'Running',
  done: 'Done',
  failed: 'Failed',
  cancelled: 'Stopped',
};

function duration(trace: CallTrace): string {
  if (trace.endedAt === undefined) return '…';
  return `${((trace.endedAt - trace.startedAt) / 1000).toFixed(1)}s`;
}

function messageLabel(message: ChatMessage): string {
  if (message.role === 'tool') return `tool result (${message.toolCallId})`;
  if (message.role === 'assistant' && message.toolCalls?.length) {
    return `assistant, calling ${message.toolCalls.map((c) => c.name).join(', ')}`;
  }
  return message.role;
}

function TraceDetails({ trace }: { trace: CallTrace }) {
  const { request } = trace;
  return (
    <div className="trace__details">
      {request.tools?.length ? (
        <p className="trace__note">Tools offered: {request.tools.map((t) => t.name).join(', ')}</p>
      ) : null}
      {request.responseSchema && (
        <p className="trace__note">Asked for JSON matching “{request.responseSchema.name}”</p>
      )}
      {request.messages.map((m, i) => (
        <div key={i} className="trace__message">
          <span className="trace__role">{messageLabel(m)}</span>
          {m.content && <pre>{chatText(m.content)}</pre>}
        </div>
      ))}
      <div className="trace__message trace__message--answer">
        <span className="trace__role">{trace.error ? 'error' : 'answer'}</span>
        <pre>{trace.error ?? trace.text}</pre>
        {trace.toolCalls?.map((c) => (
          <pre key={c.id}>
            {c.name}({c.arguments})
          </pre>
        ))}
      </div>
    </div>
  );
}

function TraceRow({ trace, actor }: { trace: CallTrace; actor: string }) {
  const { stats } = trace;
  return (
    <details className="trace" data-status={trace.status}>
      <summary>
        <span className="trace__who">
          {actor} · {trace.skillId}
        </span>
        <span className="trace__model">{stats?.model ?? trace.request.model}</span>
        <span className="trace__meta">
          <Pill>{STATUS[trace.status]}</Pill>
          <span>{duration(trace)}</span>
          {stats && <span>{stats.promptTokens + stats.completionTokens} tok</span>}
          {stats?.costUsd !== undefined && <span>{formatUsd(stats.costUsd)}</span>}
        </span>
      </summary>
      <TraceDetails trace={trace} />
    </details>
  );
}

/** Every recent model call: who made it, what was sent, what came back and what it cost. */
export function Calls({ session }: { session: SessionRuntime }) {
  const [open, setOpen] = useState(false);
  const traces = [...session.calls.list()].reverse();
  const known = everyone(session);
  const nameOf = (id: string) => actorName(known, id);
  return (
    <>
      <IconButton icon="activity" label="Model calls" onClick={() => setOpen(true)} />
      <Modal open={open} title="Model calls" onClose={() => setOpen(false)} doneLabel="Done">
        <p className="settings-note">
          The most recent calls in this browser tab, newest first. Open one to see the full prompt.
        </p>
        {traces.length === 0 && <p className="muted">No model calls yet.</p>}
        <div className="traces">
          {traces.map((t) => (
            <TraceRow key={t.id} trace={t} actor={nameOf(t.actorId)} />
          ))}
        </div>
      </Modal>
    </>
  );
}
