import React, { useState, useEffect, useCallback } from 'react';
import { SessionList } from '@/components/SessionList';
import { ChatArea } from '@/components/ChatArea';
import { DirModal } from '@/components/DirModal';
import { SettingsModal } from '@/components/SettingsModal';
import { PlatformsModal } from '@/components/PlatformsModal';
import { Toast } from '@/components/Toast';
import { api, createEventSource } from '@/api/client';
import { useTheme } from '@/hooks/useTheme';
import type { Session, Message, PlatformInfo, GatewayConfig } from '@/types';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [showDir, setShowDir] = useState(false);
  const [dirItems, setDirItems] = useState<string[]>([]);
  const [currentDir, setCurrentDir] = useState('~');
  const [showSettings, setShowSettings] = useState(false);
  const [showPlatforms, setShowPlatforms] = useState(false);
  const [config, setConfig] = useState<GatewayConfig | null>(null);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [toast, setToast] = useState<{ msg: string; error: boolean } | null>(null);
  const { theme, setTheme } = useTheme();
  const evtSourceRef = React.useRef<EventSource | null>(null);

  const showToast = useCallback((msg: string, error = false) => {
    setToast({ msg, error });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.listSessions();
        setSessions(data.sessions);
      } catch {}
    };
    fetch();
    const iv = setInterval(fetch, 3000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (evtSourceRef.current) {
      evtSourceRef.current.close();
      evtSourceRef.current = null;
    }
    if (!activeId) {
      setMessages([]);
      return;
    }
    const active = sessions.find((s) => s.id === activeId);
    if (!active) return;

    setReadOnly(active.source !== 'WebUI' && active.active);

    const load = async () => {
      try {
        const data = await api.getHistory(activeId);
        if (data.history?.length) {
          setMessages(data.history.map((h) => ({ role: h.role as Message['role'], content: h.content })));
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
          setMessages((prev) => [...prev, { role: data.role as Message['role'], content: data.content }]);
        }
      } catch {}
    };
    return () => {
      es.close();
      evtSourceRef.current = null;
    };
  }, [activeId, sessions]);

  const createSession = async () => {
    try {
      const data = await api.createSession('New Session', '~');
      if (data.session) {
        setSessions((prev) => [...prev, data.session!]);
        setActiveId(data.session.id);
        setMessages([]);
      }
    } catch {
      showToast('Failed to create session', true);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this session permanently?')) return;
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      showToast('Session deleted');
    } catch {
      showToast('Failed to delete session', true);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeId || sending) return;
    const text = input.trim();
    setMessages((prev) => [...prev, { role: 'user' as const, content: text }]);
    setInput('');
    setSending(true);
    try {
      const data = await api.sendMessage(activeId, text);
      if (data.error) {
        setMessages((prev) => [...prev, { role: 'system' as const, content: data.error || 'Error' }]);
      } else if (data.response) {
        setMessages((prev) => [...prev, { role: 'system' as const, content: data.response || '' }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'system' as const, content: 'Failed to send message' }]);
    } finally {
      setSending(false);
    }
  };

  const stopSession = async () => {
    if (!activeId) return;
    try {
      await api.stopSession(activeId);
      setMessages((prev) => [...prev, { role: 'system' as const, content: 'Session stopped. Send a message to resume.' }]);
      setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, active: false } : s)));
    } catch {
      showToast('Failed to stop session', true);
    }
  };

  const openDirModal = async () => {
    setShowDir(true);
    try {
      const data = await api.listDir(currentDir, activeId);
      setDirItems(data.items || []);
      setCurrentDir(data.dir || currentDir);
    } catch {
      setDirItems([]);
    }
  };

  const cdDir = async (name: string) => {
    const newPath = currentDir === '~' ? '~/' + name : currentDir + '/' + name;
    try {
      const data = await api.changeDir(newPath, activeId);
      if (!data.error) {
        const dirData = await api.listDir(data.dir || newPath, activeId);
        setDirItems(dirData.items || []);
        setCurrentDir(dirData.dir || newPath);
      }
    } catch {}
  };

  const handlePwd = async () => {
    try {
      const data = await api.pwd(activeId);
      showToast(data.dir || data.error || 'Unknown', !!data.error);
    } catch {
      showToast('Failed to get pwd', true);
    }
  };

  const handleResetDir = async () => {
    try {
      await api.resetDir(activeId);
      showToast('Reset to default');
    } catch {
      showToast('Failed to reset', true);
    }
  };

  const loadConfig = async () => {
    try {
      const data = await api.getConfig();
      setConfig(data.config);
    } catch {}
  };

  const saveConfig = async (partial: Partial<GatewayConfig>, newTheme: 'auto' | 'dark' | 'light') => {
    try {
      setTheme(newTheme);
      const data = await api.saveConfig(partial);
      if (data.status === 'saved') {
        showToast('Config saved');
        setConfig((prev) => (prev ? { ...prev, ...partial } : null));
      } else {
        showToast(data.error || 'Save failed', true);
      }
    } catch {
      showToast('Failed to save config', true);
    }
  };

  const loadPlatforms = async () => {
    try {
      const data = await api.getPlatforms();
      setPlatforms(data.platforms);
    } catch {}
  };

  const activeSession = sessions.find((s) => s.id === activeId);

  return (
    <>
      <SessionList
        sessions={sessions}
        activeId={activeId}
        onSelect={setActiveId}
        onDelete={deleteSession}
        onCreate={createSession}
        onOpenSettings={() => {
          setShowSettings(true);
          loadConfig();
        }}
        onOpenPlatforms={() => {
          setShowPlatforms(true);
          loadPlatforms();
        }}
      />
      <ChatArea
        session={activeSession}
        messages={messages}
        input={input}
        sending={sending}
        readOnly={readOnly}
        onInputChange={setInput}
        onSend={sendMessage}
        onStop={stopSession}
        onOpenDir={openDirModal}
        onPwd={handlePwd}
        onResetDir={handleResetDir}
      />
      {showDir && (
        <DirModal
          currentDir={currentDir}
          items={dirItems}
          onClose={() => setShowDir(false)}
          onCd={cdDir}
        />
      )}
      {showSettings && (
        <SettingsModal
          config={config}
          theme={theme}
          onClose={() => setShowSettings(false)}
          onSave={saveConfig}
        />
      )}
      {showPlatforms && (
        <PlatformsModal platforms={platforms} onClose={() => setShowPlatforms(false)} />
      )}
      {toast && <Toast message={toast.msg} isError={toast.error} onClose={dismissToast} />}
    </>
  );
};

export default App;
