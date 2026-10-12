import type { Job } from '@virtuocity/core';
import { Button } from '@virtuocity/ui';
import type { AppModule, PanelProps } from './types';

const RECENT = 3;

function JobRow({ job, name, onCancel }: { job: Job; name: string; onCancel: () => void }) {
  return (
    <li className="job" data-status={job.status}>
      <div className="job__text">
        <span className="job__label">
          {name}: {job.label}
        </span>
        {job.status === 'running' && job.detail && <span className="muted">{job.detail}</span>}
        {job.status === 'failed' && <span className="job__error">{job.error}</span>}
        {job.status === 'cancelled' && <span className="muted">Stopped</span>}
      </div>
      {job.status === 'running' && (
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Stop
        </Button>
      )}
    </li>
  );
}

/** Work running beside the story, plus the last few that ended without success. */
function JobsPanel({ session }: PanelProps) {
  const all = session.jobs.list();
  const running = all.filter((j) => j.status === 'running');
  const problems = all.filter((j) => j.status === 'failed' || j.status === 'cancelled');
  const shown = [...running, ...problems.slice(-RECENT).reverse()];
  if (shown.length === 0) return <p className="muted">Nothing running in the background.</p>;
  const nameOf = (id: string) => session.actors.find((a) => a.id === id)?.personality.name ?? id;
  return (
    <ul className="jobs">
      {shown.map((job) => (
        <JobRow
          key={job.id}
          job={job}
          name={nameOf(job.actorId)}
          onCancel={() => session.jobs.cancel(job.id)}
        />
      ))}
    </ul>
  );
}

export const jobsPanelModule: AppModule = {
  id: 'jobs-panel',
  register: (host) =>
    host.panels.register({ id: 'jobs', title: 'Background', slot: 'side', component: JobsPanel }),
};
