import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nProvider } from '@/i18n'
import App from './App'
import './index.css'

// Capture WebUI token from URL query param and persist across sessions.
// The backend passes ?token=xxx; frontend reads it once, stores it in both
// sessionStorage (for current tab) and localStorage (for future visits),
// then cleans the URL.
const TOKEN_KEY = 'cc_gateway_token';
const params = new URLSearchParams(window.location.search);
const urlToken = params.get('token');
if (urlToken) {
  sessionStorage.setItem(TOKEN_KEY, urlToken);
  try { localStorage.setItem(TOKEN_KEY, urlToken); } catch {}
  const cleanUrl = window.location.pathname + (window.location.hash || '');
  window.history.replaceState(null, '', cleanUrl);
} else {
  // Restore token from localStorage so returning users don't need ?token=
  const saved = (() => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } })();
  if (saved) {
    sessionStorage.setItem(TOKEN_KEY, saved);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
)
