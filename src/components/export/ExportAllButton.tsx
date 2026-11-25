import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ExportAllButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

export function ExportAllButton({ onClick, disabled }: ExportAllButtonProps) {
  return (
    <Button
      size="lg"
      aria-label="Export all days"
      className="rounded-full bg-card text-foreground shadow-lg hover:bg-card/90 max-md:size-11 max-md:gap-0 max-md:p-0 max-md:has-data-[icon=inline-start]:pl-0"
      onClick={onClick}
      disabled={disabled}
    >
      <Download data-icon="inline-start" />
      <span className="max-md:sr-only">Export all days</span>
    </Button>
  );
}
