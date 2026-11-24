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
      className="rounded-full bg-card text-foreground shadow-lg hover:bg-card/90"
      onClick={onClick}
      disabled={disabled}
    >
      <Download data-icon="inline-start" />
      Export all days
    </Button>
  );
}
