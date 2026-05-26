import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SessionList } from '@/components/SessionList';
import { ChatArea } from '@/components/ChatArea';
import { DirModal } from '@/components/DirModal';
import { SettingsModal } from '@/components/SettingsModal';
import { Toast } from '@/components/Toast';
import { api, createEventSource } from '@/api/client';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/i18n';
import { stripAnsi } from '@/utils/ansi';
import type { Session, Message, PlatformInfo, GatewayConfig, SourceFilter } from '@/types';

const App: React.FC = () => {
  const { t, locale, setLocale } = useI18n();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showDir, setShowDir] = useState(false);
  const [dirItems, setDirItems] = useState<string[]>([]);
  const [currentDir, setCurrentDir] = useState('~');
  const [showHidden, setShowHidden] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<GatewayConfig | null>(null);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [version, setVersion] = useState('…');
  const [toast, setToast] = useState<{ msg: string; error: boolean } | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('WebUI');
  const [restarting, setRestarting] = useState(false);
  const [starting, setStarting] = useState(false);
  const { theme, setTheme } = useTheme();
  const evtSourceRef = useRef<EventSource | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const newSessionRef = useRef<string | null>(null);

  // Re-fetch directory when showHidden toggles while modal is open
  useEffect(() => {
    if (!showDir) return;
    const fetch = async () => {
      try {
        const dirData = await api.listDir(currentDir, activeId, showHidden);
        setDirItems(dirData.items || []);
      } catch {}
    };
    fetch();
  }, [showHidden, showDir, currentDir, activeId]);

  const showToast = useCallback((msg: string, error = false) => {
    setToast({ msg, error });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.listSessions(sourceFilter);
        setSessions(data.sessions);
      } catch {}
    };
    fetch();
    const iv = setInterval(fetch, 3000);
    return () => clearInterval(iv);
  }, [sourceFilter]);

  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const data = await api.getPlatforms();
        setPlatforms(data.platforms);
      } catch {}
    };
    fetchPlatforms();
    const iv = setInterval(fetchPlatforms, 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const data = await api.getVersion();
        if (data.version) setVersion(data.version);
        else setVersion('unknown');
      } catch {
        setVersion('unknown');
      }
    };
    fetchVersion();
  }, []);

  useEffect(() => {
    if (evtSourceRef.current) {
      evtSourceRef.current.close();
      evtSourceRef.current = null;
    }
    // Abort any in-flight sendMessage POST
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setSending(false);
    if (!activeId) {
      setMessages([]);
      return;
    }

    // Skip history fetch for sessions just created (they have no history)
    const isNewSession = newSessionRef.current === activeId;
    if (isNewSession) {
      newSessionRef.current = null;
    }

    const load = async () => {
      if (isNewSession) return;
      try {
        const data = await api.getHistory(activeId);
        if (data.history?.length) {
          setMessages(data.history.map((h) => ({ role: h.role as Message['role'], content: stripAnsi(h.content) })));
        } else {
          setMessages([]);
        }
      } catch {
        setMessages([]);
      }
    };
    load();

    const es = createEventSource(activeId);
    evtSourceRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.session_id === activeId) {
          setMessages((prev) => [...prev, { role: data.role as Message['role'], content: stripAnsi(data.content) }]);
          if (data.role !== 'user') {
            setSending(false);
          }
        }
      } catch {}
    };
    return () => {
      es.close();
      evtSourceRef.current = null;
      // Abort any in-flight sendMessage POST when switching sessions
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [activeId]);

  const createSession = async () => {
    try {
      const defaultDir = config?.default_dir || '~';
      const data = await api.createSession('New Session', defaultDir);
      if (data.session) {
        setSessions((prev) => [...prev, data.session!]);
        newSessionRef.current = data.session.id;
        setActiveId(data.session.id);
        setMessages([]);
      }
    } catch {
      showToast(t('app.failed_create_session'), true);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('app.delete_confirm'))) return;
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      showToast(t('app.session_deleted'));
    } catch {
      showToast(t('app.failed_delete_session'), true);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeId || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Use AbortController to cancel in-flight POST when session switches
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await api.sendMessage(activeId, text, controller.signal);
      if (data.error) {
        setMessages((prev) => [...prev, { role: 'system' as const, content: stripAnsi(data.error || 'Error') }]);
        setSending(false);
      } else if (data.response) {
        // Bug 4 fix: strip ANSI from POST response text
        setMessages((prev) => [...prev, { role: 'system' as const, content: stripAnsi(data.response || '') }]);
        setSending(false);
      }
      // If status === 'forwarded', user message already appended above;
      // assistant reply comes via SSE; keep sending true until then
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Request was intentionally aborted (session switch); do nothing
      } else {
        setMessages((prev) => [...prev, { role: 'system' as const, content: stripAnsi(t('app.failed_send')) }]);
        setSending(false);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  const startSession = async () => {
    if (!activeId || starting) return;
    setStarting(true);
    try {
      const data = await api.startSession(activeId);
      if (data.error) {
        showToast(data.error || t('app.failed_start'), true);
      } else {
        setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, ...data.session, active: true } : s)));
      }
    } catch {
      showToast(t('app.failed_start'), true);
    } finally {
      setStarting(false);
    }
  };

  const stopSession = async () => {
    if (!activeId) return;
    try {
      await api.stopSession(activeId);
      setMessages((prev) => [...prev, { role: 'system' as const, content: t('app.session_stopped') }]);
      setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, active: false } : s)));
    } catch {
      showToast(t('app.failed_stop'), true);
    }
  };

  const openDirModal = async () => {
    const dir = activeSession?.work_dir || '~';
    setCurrentDir(dir);
    setShowDir(true);
    try {
      const data = await api.listDir(dir, activeId, showHidden);
      setDirItems(data.items || []);
      setCurrentDir(data.dir || dir);
    } catch {
      setDirItems([]);
      showToast(t('app.failed_list_dir'), true);
    }
  };

  const enterDir = async (name: string) => {
    const newPath = currentDir === '~' ? '~/' + name : currentDir + '/' + name;
    try {
      const dirData = await api.listDir(newPath, activeId, showHidden);
      setDirItems(dirData.items || []);
      setCurrentDir(dirData.dir || newPath);
    } catch {}
  };

  const goUpDir = async () => {
    const parts = currentDir.split('/').filter(Boolean);
    if (parts.length <= 1) {
      setCurrentDir('~');
      try {
        const dirData = await api.listDir('~', activeId, showHidden);
        setDirItems(dirData.items || []);
      } catch {}
      return;
    }
    parts.pop();
    const parent = parts.join('/') || '/';
    // Bug 3 fix: don't prepend / if path starts with ~
    const newPath = parent.startsWith('~') ? parent : `/${parent}`;
    try {
      const dirData = await api.listDir(newPath, activeId, showHidden);
      setDirItems(dirData.items || []);
      setCurrentDir(dirData.dir || newPath);
    } catch {}
  };

  const toggleHidden = () => {
    setShowHidden((prev) => !prev);
  };

  const selectDir = async (dir: string) => {
    try {
      await api.changeDir(dir, activeId);
      showToast(t('app.dir_set_to', { dir }));
      setShowDir(false);
      setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, work_dir: dir } : s)));
    } catch {
      showToast(t('app.failed_set_dir'), true);
    }
  };

  const loadConfig = async () => {
    try {
      const data = await api.getConfig();
      setConfig(data.config);
    } catch {
      showToast(t('settings.load_failed'), true);
    }
  };

  const saveConfig = async (partial: Partial<GatewayConfig>) => {
    try {
      const data = await api.saveConfig(partial);
      if (data.status === 'saved') {
        showToast(t('app.config_saved'));
        setConfig((prev) => (prev ? { ...prev, ...partial } : null));
      } else {
        showToast(data.error || t('app.save_failed'), true);
      }
    } catch {
      showToast(t('app.failed_save_config'), true);
    }
  };

  const activeSession = sessions.find((s) => s.id === activeId);
  // Only WebUI sessions are operable in WebUI; all others are read-only regardless of state.
  const readOnly = activeSession ? activeSession.source !== 'WebUI' || !activeSession.active : true;

  // Server handles source filtering; sessions already filtered by sourceFilter
  const displaySessions = sessions;

  const handleRestart = async () => {
    if (restarting) return;
    if (!confirm(t('app.restart_confirm'))) return;
    setRestarting(true);
    try {
      const data = await api.restart();
      showToast(data.status === 'restarting' ? t('app.restarting') : (data.error || t('app.restart_requested')));
    } catch {
      showToast(t('app.restart_failed'), true);
    } finally {
      setRestarting(false);
    }
  };

  return (
    <>
      <SessionList
        sessions={displaySessions}
        activeId={activeId}
        platforms={platforms}
        theme={theme}
        version={version}
        sourceFilter={sourceFilter}
        onSelect={setActiveId}
        onDelete={deleteSession}
        onCreate={createSession}
        onOpenSettings={() => {
          setShowSettings(true);
          loadConfig();
        }}
        onThemeChange={setTheme}
        onRestart={handleRestart}
        onSourceFilterChange={setSourceFilter}
        restarting={restarting}
      />
      <ChatArea
        session={activeSession}
        messages={messages}
        input={input}
        sending={sending}
        starting={starting}
        readOnly={readOnly}
        workDir={activeSession?.work_dir || '~'}
        locale={locale}
        onInputChange={setInput}
        onSend={sendMessage}
        onStart={startSession}
        onStop={stopSession}
        onOpenDir={openDirModal}
        onLocaleChange={setLocale}
      />
      {showDir && (
        <DirModal
          currentDir={currentDir}
          items={dirItems}
          showHidden={showHidden}
          onClose={() => setShowDir(false)}
          onEnter={enterDir}
          onGoUp={goUpDir}
          onSelect={selectDir}
          onToggleHidden={toggleHidden}
        />
      )}
      {showSettings && (
        <SettingsModal
          config={config}
          onClose={() => setShowSettings(false)}
          onSave={saveConfig}
        />
      )}
      {toast && <Toast message={toast.msg} isError={toast.error} onClose={dismissToast} />}
    </>
  );
};

export default App;
