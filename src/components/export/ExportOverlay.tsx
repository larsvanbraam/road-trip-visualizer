import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportProgress } from '../../hooks/useDayExport';

type ExportOverlayProps = {
  progress: ExportProgress;
  onCancel: () => void;
};

function formatTimeLeft(seconds: number): string {
  if (seconds < 60) return `about ${seconds} s left`;

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `about ${minutes} min${rest > 0 ? ` ${rest} s` : ''} left`;
}

/**
 * Blocks the page while the screenshots are taken, because the map is changing underneath. It is
 * not dimmed, so the map can be watched while it is photographed.
 */
export function ExportOverlay({ progress, onCancel }: ExportOverlayProps) {
  const percentage = Math.round((Math.max(progress.current - 1, 0) / progress.total) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-6">
      <div
        role="alertdialog"
        aria-live="polite"
        aria-label="Taking screenshots"
        className="glass flex w-full max-w-sm flex-col gap-3 rounded-2xl p-4"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="flex items-center gap-2 font-medium">
            <Loader2 className="size-4 animate-spin text-brand" aria-hidden />
            Taking screenshots
          </p>
          <span className="text-sm text-muted-foreground tabular-nums">
            {progress.current} / {progress.total}
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex items-baseline justify-between gap-3 text-sm text-muted-foreground">
          <p className="truncate">{progress.label}</p>
          {progress.secondsLeft !== undefined && (
            <span className="shrink-0 tabular-nums">{formatTimeLeft(progress.secondsLeft)}</span>
          )}
        </div>

        <Button variant="outline" size="sm" className="self-end" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
