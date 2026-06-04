import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SessionList } from '@/components/SessionList';
import { ChatArea } from '@/components/ChatArea';
import { DirModal } from '@/components/DirModal';
import { PairingModal } from '@/components/PairingModal';
import { SettingsModal } from '@/components/SettingsModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toast } from '@/components/Toast';
import { TokenPage } from '@/components/TokenPage';
import { api, createEventSource, ApiError } from '@/api/client';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/i18n';
import { stripAnsi } from '@/utils/ansi';
import { appendMessage, historyRoleForDisplay } from '@/utils/chatMessages';
import { joinDir } from '@/utils/path';
import { normalizeGatewayConfig } from '@/utils/normalizeConfig';
import type {
  Session,
  Message,
  PlatformInfo,
  GatewayConfig,
  PlatformFilter,
  AgentsApiResponse,
  AgentCatalogEntry,
} from '@/types';
import {
  resolveStartProviderId,
  saveLastStartProvider,
} from '@/utils/startProviderPreference';

const ACTIVE_SESSION_KEY = 'cc_gateway_active_session';

const App: React.FC = () => {
  const { t, locale, setLocale } = useI18n();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ACTIVE_SESSION_KEY);
    } catch {
      return null;
    }
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showDir, setShowDir] = useState(false);
  const [dirItems, setDirItems] = useState<string[]>([]);
  const [currentDir, setCurrentDir] = useState('~');
  const [dirError, setDirError] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<GatewayConfig | null>(null);
  const [agentsCatalog, setAgentsCatalog] = useState<AgentsApiResponse | null>(null);
  const [startProviderId, setStartProviderId] = useState('claude');
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [version, setVersion] = useState('…');
  const [toast, setToast] = useState<{ msg: string; error: boolean } | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('webui');
  const [restarting, setRestarting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [restartConfirm, setRestartConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showPairing, setShowPairing] = useState(false);
  const [pairingCount, setPairingCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [needsToken, setNeedsToken] = useState(false);
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

  const errMsg = useCallback(
    (e: unknown, fallback: string) => {
      if (e instanceof ApiError && e.errorKey) {
        const translated = t(e.errorKey as any);
        if (translated && translated !== e.errorKey) return translated;
        // Fall back to backend message if frontend dict doesn't have this key.
        if (e.message) return e.message;
        return fallback || t('app.error_generic');
      }
      if (e instanceof Error) {
        // eslint-disable-next-line no-console
        console.warn('[webui] Error:', e.message);
      }
      return fallback || t('app.error_generic');
    },
    [t]
  );

  const dismissToast = useCallback(() => setToast(null), []);

  const loadConfig = useCallback(async () => {
    try {
      const data = await api.getConfig();
      const normalized = normalizeGatewayConfig(data.config);
      setConfig(normalized);
      const catalog =
        data.agents ??
        (await api.getAgents().catch(() => null));
      if (catalog) {
        setAgentsCatalog(catalog);
        setStartProviderId((prev) => {
          const enabled = catalog.providers.filter((p) => p.config?.enabled !== false);
          if (enabled.some((p) => p.id === prev)) return prev;
          return resolveStartProviderId(catalog, data.config.agent?.default);
        });
      }
      setNeedsToken(false);
      return normalized;
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) {
        setNeedsToken(true);
      } else {
        showToast(t('settings.load_failed'), true);
      }
      return null;
    }
  }, [showToast, t]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.listSessions({ platform: platformFilter });
        setSessions(data.sessions);
        setActiveId((prev) => {
          if (prev && data.sessions.some((s) => s.id === prev)) return prev;
          try {
            const saved = sessionStorage.getItem(ACTIVE_SESSION_KEY);
            if (saved && data.sessions.some((s) => s.id === saved)) return saved;
          } catch {
            /* ignore */
          }
          return prev;
        });
      } catch {}
    };
    fetch();
    const iv = setInterval(fetch, 3000);
    return () => clearInterval(iv);
  }, [platformFilter]);

  useEffect(() => {
    try {
      if (activeId) sessionStorage.setItem(ACTIVE_SESSION_KEY, activeId);
      else sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, [activeId]);

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
    if (platformFilter === 'webui') return;
    const stillEnabled = platforms.some(
      (p) => p.enabled && (p.id ?? p.name) === platformFilter,
    );
    if (!stillEnabled) {
      setPlatformFilter('webui');
    }
  }, [platforms, platformFilter]);

  const toggleRequirePairing = useCallback(async (platform: string, value: boolean) => {
    // Optimistic update; revert on failure.
    setPlatforms((prev) => prev.map((p) => (p.name === platform ? { ...p, require_pairing: value } : p)));
    try {
      await api.setRequirePairing(platform, value);
    } catch {
      setPlatforms((prev) => prev.map((p) => (p.name === platform ? { ...p, require_pairing: !value } : p)));
    }
  }, []);

  useEffect(() => {
    const fetchPairings = async () => {
      try {
        const data = await api.listPairings();
        setPairingCount((data.pending || []).length);
      } catch {}
    };
    fetchPairings();
    const iv = setInterval(fetchPairings, 5000);
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
          setMessages(data.history.map((h) => {
            if (h.role === 'permission_request') {
              const nl = h.content.indexOf('\n');
              return {
                role: 'permission_request' as const,
                content: stripAnsi(nl > 0 ? h.content.slice(nl + 1) : h.content),
                requestId: nl > 0 ? h.content.slice(0, nl) : '',
              };
            }
            return {
              role: historyRoleForDisplay(h.role),
              content: stripAnsi(h.content),
            };
          }));
        } else {
          setMessages([]);
        }
      } catch (e: unknown) {
        showToast(errMsg(e, t('app.failed_list_dir')), true);
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
          if (data.role === 'permission_request') {
            // Structured format: first line = request_id, rest = display text
            const nl = data.content.indexOf('\n');
            const requestId = nl > 0 ? data.content.slice(0, nl) : '';
            const body = nl > 0 ? data.content.slice(nl + 1) : data.content;
            setMessages((prev) =>
              appendMessage(prev, {
                role: 'permission_request',
                content: stripAnsi(body),
                requestId,
              }),
            );
            setSending(false);
          } else {
            const role =
              data.role === 'system'
                ? 'assistant'
                : (data.role as Message['role']);
            setMessages((prev) =>
              appendMessage(prev, { role, content: stripAnsi(data.content) }),
            );
            if (role !== 'user') {
              setSending(false);
            }
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

  const activeSession = sessions.find((s) => s.id === activeId);

  const createSession = async () => {
    if (platformFilter !== 'webui') {
      showToast(t('sidebar.webui_only_create'), true);
      return;
    }
    try {
      const currentConfig = config || (await loadConfig());
      const defaultDir = currentConfig?.default_dir || '~';
      const data = await api.createSession('New Session', defaultDir);
      if (data.session) {
        setSessions((prev) => [...prev, data.session!]);
        newSessionRef.current = data.session.id;
        setActiveId(data.session.id);
        setMessages([]);
      }
    } catch (e: unknown) {
      showToast(errMsg(e, t('app.failed_create_session')), true);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = sessions.find((s) => s.id === id);
    if (target) {
      setDeleteTarget(target);
    }
  };

  const confirmDeleteSession = async () => {
    if (!deleteTarget || deleting) return;
    const id = deleteTarget.id;
    setDeleting(true);
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      setDeleteTarget(null);
      showToast(t('app.session_deleted'));
    } catch (e: unknown) {
      showToast(errMsg(e, t('app.failed_delete_session')), true);
    } finally {
      setDeleting(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!activeId || uploading || sending) return;
    const caption = input.trim();
    setUploading(true);
    try {
      const data = await api.uploadSessionFile(activeId, file, caption || undefined);
      if (caption) {
        setInput('');
      }
      if (!data.forwarded && activeSession?.source === 'WebUI') {
        showToast(t('chat.upload_not_forwarded'), false);
      }
    } catch (err: unknown) {
      showToast(errMsg(err, t('chat.upload_failed')), true);
    } finally {
      setUploading(false);
    }
  };

  const selectModel = async (modelId: string) => {
    if (
      !activeId ||
      sending ||
      !activeSession ||
      activeSession.source !== 'WebUI' ||
      !activeSession.active
    ) {
      return;
    }
    const text = `/models ${modelId}`;
    setSending(true);
    setMessages((prev) => appendMessage(prev, { role: 'user', content: text }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await api.sendMessage(activeId, text, controller.signal);
      if (data.status === 'stopped') {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeId ? { ...s, active: false } : s)),
        );
        setSending(false);
      } else if (data.response) {
        setSending(false);
      }
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        showToast(errMsg(err, t('chat.model_switch_failed')), true);
        setSending(false);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeId || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    setMessages((prev) => appendMessage(prev, { role: 'user', content: text }));

    // Use AbortController to cancel in-flight POST when session switches
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await api.sendMessage(activeId, text, controller.signal);
      if (data.status === 'stopped') {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeId ? { ...s, active: false } : s))
        );
        setSending(false);
      } else if (data.status === 'started') {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeId ? { ...s, active: true } : s))
        );
        setSending(false);
      } else if (data.response) {
        // Slash/gateway replies are delivered via SSE as assistant bubbles.
        setSending(false);
      }
      // If status === 'forwarded', assistant reply comes via SSE; keep sending true until then.
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Request was intentionally aborted (session switch); do nothing
      } else {
        setMessages((prev) =>
          appendMessage(prev, {
            role: 'assistant',
            content: stripAnsi(errMsg(err, t('app.failed_send'))),
          }),
        );
        setSending(false);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  const enabledStartProviders: AgentCatalogEntry[] =
    agentsCatalog?.providers.filter((p) => p.config?.enabled !== false) ?? [];

  const handleStartProviderChange = useCallback((id: string) => {
    setStartProviderId(id);
    saveLastStartProvider(id);
  }, []);

  const startSession = async () => {
    if (!activeId || starting || enabledStartProviders.length === 0) return;
    const provider = startProviderId || resolveStartProviderId(agentsCatalog, config?.agent?.default);
    saveLastStartProvider(provider);
    setStarting(true);
    try {
      const data = await api.startSession(activeId, provider);
      setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, ...data.session, active: true } : s)));
    } catch (e: unknown) {
      showToast(errMsg(e, t('app.failed_start')), true);
    } finally {
      setStarting(false);
    }
  };

  const resumeSession = async () => {
    if (!activeId || starting) return;
    setStarting(true);
    try {
      const data = await api.startSession(activeId);
      setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, ...data.session, active: true } : s)));
    } catch (e: unknown) {
      showToast(errMsg(e, t('app.failed_start')), true);
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
    } catch (e: unknown) {
      showToast(errMsg(e, t('app.failed_stop')), true);
    }
  };

  const openDirModal = async () => {
    const dir = activeSession?.work_dir || '~';
    setCurrentDir(dir);
    setDirError('');
    setShowDir(true);
    try {
      const data = await api.listDir(dir, activeId, showHidden);
      setDirItems(data.items || []);
      setCurrentDir(data.dir || dir);
    } catch (e: unknown) {
      setDirItems([]);
      setDirError(errMsg(e, t('app.failed_list_dir')));
    }
  };

  const enterDir = async (name: string) => {
    const target = joinDir(currentDir, name);
    try {
      const dirData = await api.listDir(target, activeId, showHidden);
      setDirItems(dirData.items || []);
      setCurrentDir(dirData.dir || target);
      setDirError('');
    } catch (e: unknown) {
      setDirError(errMsg(e, t('app.failed_list_dir')));
    }
  };

  const goUpDir = async () => {
    const parent = joinDir(currentDir, '..');
    try {
      const dirData = await api.listDir(parent, activeId, showHidden);
      setDirItems(dirData.items || []);
      setCurrentDir(dirData.dir || parent);
      setDirError('');
    } catch (_e: unknown) {
      // ensure_under_home rejects paths above home — refresh at
      // current dir so the UI doesn't appear stuck.
      try {
        const dirData = await api.listDir(currentDir, activeId, showHidden);
        setDirItems(dirData.items || []);
        setCurrentDir(dirData.dir || currentDir);
      } catch (_e2: unknown) {
        // ignore
      }
      setDirError(errMsg(_e, t('app.failed_list_dir')));
    }
  };

  const toggleHidden = () => {
    setShowHidden((prev) => !prev);
  };

  const selectDir = async (dir: string) => {
    try {
      await api.changeDir(dir, activeId);
      showToast(t('app.dir_set_to', { dir }));
      setShowDir(false);
      setDirError('');
      setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, work_dir: dir } : s)));
    } catch (e: unknown) {
      setDirError(errMsg(e, t('app.failed_set_dir')));
    }
  };

  const saveConfig = async (partial: Partial<GatewayConfig>) => {
    try {
      const data = await api.saveConfig(partial);
      if (data.status === 'saved') {
        showToast(t('app.config_saved'));
        setConfig((prev) => (prev ? { ...prev, ...partial } : null));
        return data;
      }
      throw new Error(t('app.save_failed'));
    } catch (e: unknown) {
      showToast(errMsg(e, t('app.failed_save_config')), true);
      throw e;
    }
  };

  // Only WebUI sessions are operable in WebUI; all others are read-only regardless of state.
  const readOnly = activeSession ? activeSession.source !== 'WebUI' || !activeSession.active : true;

  const displaySessions = sessions;

  const performRestart = async () => {
    if (restarting) return;
    setRestarting(true);
    try {
      const data = await api.restart();
      showToast(data.status === 'restarting' ? t('app.restarting') : t('app.restart_requested'));
    } catch (e: unknown) {
      showToast(errMsg(e, t('app.restart_failed')), true);
    } finally {
      setRestarting(false);
    }
  };

  const handleRestart = () => {
    if (restarting) return;
    setRestartConfirm(true);
  };

  const confirmRestart = async () => {
    setRestartConfirm(false);
    await performRestart();
  };

  if (needsToken) {
    return <TokenPage onTokenSet={() => loadConfig()} />;
  }

  return (
    <>
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}
      <SessionList
        sessions={displaySessions}
        activeId={activeId}
        platforms={platforms}
        theme={theme}
        version={version}
        platformFilter={platformFilter}
        mobileMenuOpen={mobileMenuOpen}
        onSelect={(id) => {
          setActiveId(id);
          setMobileMenuOpen(false);
        }}
        onDelete={deleteSession}
        onCreate={createSession}
        onOpenSettings={() => {
          setShowSettings(true);
          loadConfig();
        }}
        onThemeChange={setTheme}
        onRestart={handleRestart}
        onPlatformFilterChange={setPlatformFilter}
        restarting={restarting}
        onOpenPairing={() => setShowPairing(true)}
        pairingCount={pairingCount}
        onToggleRequirePairing={toggleRequirePairing}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
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
        onSelectModel={
          activeSession?.source === 'WebUI' && activeSession.active ? selectModel : undefined
        }
        onUploadFile={activeSession?.source === 'WebUI' ? uploadFile : undefined}
        uploading={uploading}
        onStartSession={startSession}
        onResumeSession={resumeSession}
        startProviders={enabledStartProviders}
        startProviderId={startProviderId}
        onStartProviderChange={handleStartProviderChange}
        onStop={stopSession}
        onOpenDir={openDirModal}
        onLocaleChange={setLocale}
        onToggleSidebar={() => setMobileMenuOpen((prev) => !prev)}
      />
      {showDir && (
        <DirModal
          currentDir={currentDir}
          items={dirItems}
          showHidden={showHidden}
          error={dirError}
          onErrorChange={setDirError}
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
          onRestartNow={performRestart}
          restarting={restarting}
        />
      )}
      {showPairing && (
        <PairingModal
          onClose={() => setShowPairing(false)}
        />
      )}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('delete.title')}</h3>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}>×</button>
            </div>
            <div className="confirm-modal-body">
              <div className="confirm-icon">!</div>
              <div className="confirm-copy">
                <div className="confirm-title">{t('delete.message', { title: deleteTarget.title })}</div>
                <div className="confirm-subtitle">{t('delete.warning')}</div>
                <div className="confirm-session-path">{deleteTarget.work_dir}</div>
              </div>
            </div>
            <div className="confirm-modal-actions">
              <button className="secondary-btn" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                {t('delete.cancel')}
              </button>
              <button className="danger-btn" onClick={confirmDeleteSession} disabled={deleting}>
                {deleting ? t('delete.deleting') : t('delete.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={restartConfirm}
        title={t('app.restart_confirm')}
        message={t('app.restart_sidebar_message')}
        confirmLabel={t('app.restart_now')}
        cancelLabel={t('app.later')}
        loading={restarting}
        onConfirm={confirmRestart}
        onCancel={() => setRestartConfirm(false)}
      />
      {toast && <Toast message={toast.msg} isError={toast.error} onClose={dismissToast} />}
    </>
  );
};

export default App;
