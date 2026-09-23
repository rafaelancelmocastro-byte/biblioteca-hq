import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppUpdateManager } from './components/layout/AppUpdateManager';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppUpdateManager />
    <App />
  </StrictMode>,
);
