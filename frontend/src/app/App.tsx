import { RouterProvider } from 'react-router-dom';
import { Providers } from './providers';
import { router } from './router';

export function App() {
  return (
    <Providers>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </Providers>
  );
}
