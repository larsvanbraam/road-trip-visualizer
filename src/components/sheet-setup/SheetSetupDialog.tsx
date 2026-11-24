import { Copy, ExternalLink } from 'lucide-react';
import { ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { env } from '../../config/env';
import { TEMPLATE_COPY_URL, TEMPLATE_URL } from '../../config/template';

type SheetSetupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type StepProps = {
  number: number;
  title: string;
  children: ReactNode;
};

function Step({ number, title, children }: StepProps) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums"
      >
        {number}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="font-medium">{title}</h3>
        <div className="flex flex-col gap-2 text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

const columns: Array<{ name: string; hint?: string }> = [
  { name: 'Day' },
  { name: 'Date' },
  { name: 'Morning location (address)' },
  { name: 'Through (address)', hint: 'optional, separate extra stops with |' },
  { name: 'Evening location (address)' },
  { name: 'Distance (km)', hint: 'calculated by the template' },
  { name: 'Travel time', hint: 'calculated by the template' },
];

/**
 * Explains how to get a sheet that works with the app, starting from the template
 */
export function SheetSetupDialog({ open, onOpenChange }: SheetSetupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Set up your trip sheet</DialogTitle>
          <DialogDescription>
            Road Trip Visualizer reads your trip from a Google Sheet. Start from the template, it
            works out distances and drive times for you.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <a
            href={TEMPLATE_COPY_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'bg-brand text-brand-foreground hover:bg-brand/90',
            )}
          >
            <Copy data-icon="inline-start" />
            Make a copy of the template
          </a>
          <a
            href={TEMPLATE_URL}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            <ExternalLink data-icon="inline-start" />
            Preview the template
          </a>
        </div>

        <ol className="flex flex-col gap-5">
          <Step number={1} title="Make your own copy">
            <p>
              Use the button above. Google asks you to confirm and saves the copy in your own Drive.
              Edit your copy, not the original.
            </p>
          </Step>

          <Step number={2} title="Fill in the Overview tab">
            <p>
              Enter your departure and return flights. This creates the <b>{env.tabName}</b> tab for
              you.
            </p>
          </Step>

          <Step number={3} title="Plan your stops">
            <p>
              Add the addresses for every day in the <b>{env.tabName}</b> tab. Keep that tab name,
              the app looks for it. These are the columns it reads:
            </p>
            <ul className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
              {columns.map(({ name, hint }) => (
                <li key={name} className="flex flex-col">
                  <span className="font-medium text-foreground">{name}</span>
                  {hint && <span className="text-xs">{hint}</span>}
                </li>
              ))}
            </ul>
          </Step>

          <Step number={4} title="Share the sheet">
            <p>
              Choose <b>Share</b>, then under general access pick <b>Anyone with the link</b> as a
              viewer. The app cannot read a private sheet.
            </p>
          </Step>

          <Step number={5} title="Paste the sheet id">
            <p>
              The id is the long part of the sheet&apos;s address. Copy it and paste it in the app.
            </p>
            <code className="overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs whitespace-nowrap">
              docs.google.com/spreadsheets/d/
              <mark className="rounded bg-accent px-1 font-semibold text-accent-foreground">
                your-sheet-id
              </mark>
              /edit
            </code>
          </Step>
        </ol>

        <DialogFooter>
          <DialogClose render={<Button variant="secondary" />}>Got it</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
