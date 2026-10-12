import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@virtuocity/ui/styles.css';
import { App } from './App';
import { upgradeSettings } from './settings';

upgradeSettings();
const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
