import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserFacingError } from '../../utils/errors';

type ErrorAlertProps = {
  error: UserFacingError;
  className?: string;
};

export function ErrorAlert({ error, className }: ErrorAlertProps) {
  return (
    <Alert variant="destructive" className={className}>
      <CircleAlert />
      <AlertTitle>{error.title}</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}
