import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nProvider } from '@/i18n'
import App from './App'
import './index.css'

// Capture WebUI token from URL query param and persist across sessions.
// The backend passes ?token=xxx and also sets a long-lived cookie on any
// successful API request. Frontend stores the token in sessionStorage,
// localStorage, and checks the cookie as a reliable fallback.
const TOKEN_KEY = 'cc_gateway_token';
const params = new URLSearchParams(window.location.search);
const urlToken = params.get('token');
if (urlToken) {
  sessionStorage.setItem(TOKEN_KEY, urlToken);
  try { localStorage.setItem(TOKEN_KEY, urlToken); } catch { /* quota or private mode */ }
  const cleanUrl = window.location.pathname + (window.location.hash || '');
  window.history.replaceState(null, '', cleanUrl);
} else if (!sessionStorage.getItem(TOKEN_KEY)) {
  // Restore token: localStorage first, then cookie fallback
  const saved = (() => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } })();
  if (saved) {
    sessionStorage.setItem(TOKEN_KEY, saved);
  } else {
    const m = document.cookie.match(/(?:^|;\s*)cc_gateway_token=([^;]*)/);
    if (m && m[1]) {
      const decoded = (() => {
        try { return decodeURIComponent(m[1]); } catch { return m[1]; }
      })();
      if (decoded) sessionStorage.setItem(TOKEN_KEY, decoded);
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
)
