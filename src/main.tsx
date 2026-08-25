import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker } from './lib/pwaRegister';
import { initOfflineSyncEngine } from './services/offlineSyncService';

// Initialize PWA Service Worker & Offline Sync Engine
registerServiceWorker();
initOfflineSyncEngine();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
