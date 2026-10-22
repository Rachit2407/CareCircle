import { createRoot } from 'react-dom/client';
import { setTransport } from '../api-client';
import { createMockFetch } from './engine';
import { authRoutes } from './handlers/auth';
import { appMockRoutes } from './handlers/appHandlers';
import { MockControls } from './MockControls';

/** Swaps the network transport for the mock backend and mounts the developer panel. */
export function installMocks(): void {
  setTransport(createMockFetch([...authRoutes, ...appMockRoutes]));
  const host = document.createElement('div');
  host.id = 'mock-controls-root';
  document.body.append(host);
  createRoot(host).render(<MockControls />);
}
