import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './design/tokens.css';
import { App } from './app/App';
import { startFetched } from './state/fetched';

// the fetched list of headlines: nothing is asked for unless its switch is on
startFetched();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
