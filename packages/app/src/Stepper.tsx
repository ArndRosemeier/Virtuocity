import { IconButton } from '@virtuocity/ui';

export interface StepperProps {
  readonly index: number;
  readonly count: number;
  readonly show: (index: number) => void;
  readonly busy: boolean;
  /** What is stepped through, for the buttons' labels, e.g. "version". */
  readonly noun: string;
}

/** "‹ 2/3 ›": steps back and forth through a few of something, e.g. a message's versions. */
export function Stepper({ index, count, show, busy, noun }: StepperProps) {
  return (
    <span className="message__versions">
      <IconButton
        size="sm"
        icon="back"
        label={`Show the earlier ${noun}`}
        disabled={busy || index === 0}
        onClick={() => show(index - 1)}
      />
      <span className="message__version">
        {index + 1}/{count}
      </span>
      <IconButton
        size="sm"
        icon="forward"
        label={`Show the later ${noun}`}
        disabled={busy || index === count - 1}
        onClick={() => show(index + 1)}
      />
    </span>
  );
}
