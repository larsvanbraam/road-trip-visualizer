import { CircleAlert, RotateCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { UserFacingError } from '../../utils/errors';

type ErrorAlertProps = {
  error: UserFacingError;
  className?: string;
  /** Shown as a "Try again" button when the error is temporary */
  onRetry?: () => void;
};

export function ErrorAlert({ error, className, onRetry }: ErrorAlertProps) {
  return (
    <Alert variant="destructive" className={className}>
      <CircleAlert />
      <AlertTitle>{error.title}</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
      {error.retryable && onRetry && (
        // Under the text, in the column of the text, so it does not change the height of a line
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="col-start-2 mt-2 justify-self-start border-destructive/30 bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onRetry}
        >
          <RotateCw data-icon="inline-start" />
          Try again
        </Button>
      )}
    </Alert>
  );
}
