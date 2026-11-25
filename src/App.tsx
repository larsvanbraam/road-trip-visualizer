import { RouterProvider } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { router } from './config/router';

function App() {
  return (
    <TooltipProvider>
      <RouterProvider router={router} />
      <Analytics />
    </TooltipProvider>
  );
}

export default App;
