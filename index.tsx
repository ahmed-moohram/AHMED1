import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const faviconHref = new URL('./components/1.png', import.meta.url).href;
const existingFavicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
if (existingFavicon) {
  existingFavicon.href = faviconHref;
} else {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = faviconHref;
  document.head.appendChild(link);
}

const shouldRegisterSw = (() => {
  try {
    if (!('serviceWorker' in navigator)) return false;
    if (!import.meta.env.DEV) return true;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
})();

if (shouldRegisterSw) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // ignore
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);