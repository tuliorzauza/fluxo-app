import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initAnalytics } from './lib/analytics';

// No-op até VITE_POSTHOG_KEY existir — seguro chamar sempre.
initAnalytics();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
