import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA functionality
// This enables offline support, caching, and other PWA features
serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    console.log('Service Worker registered successfully:', registration);
  },
  onUpdate: (registration) => {
    console.log('New content is available; please refresh.', registration);
    // You can show a notification to the user here
    // For example, using a toast notification library
  },
  onError: (error) => {
    console.error('Service Worker registration failed:', error);
  },
  onOffline: () => {
    console.log('App is offline');
    // You can show an offline indicator to the user
  },
  onOnline: () => {
    console.log('App is back online');
    // You can hide the offline indicator
  },
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
