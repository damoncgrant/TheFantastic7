import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppGate from './AppGate.jsx';
import './style.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppGate />
  </StrictMode>,
);
