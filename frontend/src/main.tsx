import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';

async function bootstrap(): Promise<void> {
  // Mock mode swaps the network transport before the app mounts. The app itself is unaware of it.
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const { installMocks } = await import('./services/mock/installMocks');
    installMocks();
  }
  const root = document.getElementById('root');
  if (!root) throw new Error('Root element not found.');
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
