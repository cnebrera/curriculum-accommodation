import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { I18nProvider } from './i18n/context.js';
import './styles/tokens.css';
import './styles/components.css';
// Where things sit, as opposed to what they look like (013).
import './styles/composition.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
