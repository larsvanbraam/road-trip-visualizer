import { createBrowserRouter } from 'react-router-dom';

export enum RouterLink {
  Home = '/',
  EnterSheetId = '/enter-sheet-id',
}

// Routes are loaded on demand to keep the initial bundle small
export const router = createBrowserRouter([
  {
    path: RouterLink.Home,
    lazy: async () => ({ Component: (await import('../pages/home/Home')).Home }),
  },
  {
    path: RouterLink.EnterSheetId,
    lazy: async () => ({
      Component: (await import('../pages/enter-sheet-id/EnterSheetId')).EnterSheetId,
    }),
  },
]);
