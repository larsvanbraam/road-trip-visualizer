import { cn } from '@/lib/utils';

type LogoMarkProps = {
  className?: string;
};

/**
 * The app mark: a winding dotted route that ends in a pin
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label="Roadtrip Visualizer"
      className={cn('size-9 shrink-0', className)}
    >
      <rect width="40" height="40" rx="11" fill="#000b0d" />
      <path
        d="M10 30 C 16 30, 14 21, 20 21 S 25 12, 30 12"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="0.1 4.6"
      />
      <circle cx="10" cy="30" r="3.2" fill="none" stroke="#ffffff" strokeWidth="2" />
      <circle cx="30" cy="12" r="5" fill="#ef6024" />
      <circle cx="30" cy="12" r="1.8" fill="#ffffff" />
    </svg>
  );
}

type LogoProps = LogoMarkProps & {
  /** Hide the wordmark and only show the mark */
  markOnly?: boolean;
};

export function Logo({ className, markOnly }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      {!markOnly && (
        <span className="text-lg leading-none tracking-tight">
          <span className="font-semibold">Road Trip</span>{' '}
          <span className="text-muted-foreground">Visualizer</span>
        </span>
      )}
    </div>
  );
}
