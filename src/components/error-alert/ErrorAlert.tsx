import { CircleAlert } from 'lucide-react';
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
      <AlertDescription>
        {error.message}
        {error.retryable && onRetry && (
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
