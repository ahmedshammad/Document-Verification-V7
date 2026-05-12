import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// The platform UI is demo/investor facing and changes frequently. Older PWA
// service workers can keep serving stale bundles, so proactively clear prior
// registrations/caches before rendering the latest command-center experience.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch(() => undefined);
}

if ('caches' in window) {
  caches.keys()
    .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    .catch(() => undefined);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
