// Force entry point to load polyfills first
import './polyfills';
// Override default PDF pipeline with legacy WebKit worker configurations
import './utils/pdfInit';

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
