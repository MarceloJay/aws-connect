import { useState, useEffect, useRef } from 'react';
import { AWSProfile, ConnectionStatus, SSMService } from './types';
import { checkConnection, listProfiles, loginProfile, configureProfile, deleteProfile, fetchServices, addService, removeService, connectSSM, disconnectSSM } from './services/aws';
import ConfigureProfileModal from './components/ConfigureProfileModal';
import AddServiceModal from './components/AddServiceModal';
import SettingsModal from './components/SettingsModal';

function App() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [profiles, setProfiles] = useState<AWSProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [services, setServices] = useState<SSMService[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAWSConnection();
    loadServices();
  }, []);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', url?: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const logClass = `log-${type}`;
    setLogs(prev => [...prev, { text: message, timestamp, type: logClass, url }] as any);
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
  };

  const checkAWSConnection = async () => {
    setLoading(true);
    addLog('Verificando conexão AWS...', 'info');
    const connectionStatus = await checkConnection();
    setStatus(connectionStatus);

    if (!connectionStatus.connected) {
      addLog('Não conectado', 'warning');
      addLog('Listando perfis disponíveis...', 'info');
      const availableProfiles = await listProfiles();
      setProfiles(availableProfiles);
      addLog(`${availableProfiles.length} perfil(is) encontrado(s)`, 'success');
    } else {
      setActiveProfile(connectionStatus.profile || null);
      addLog(`✓ Conectado ao perfil: ${connectionStatus.profile}`, 'success');
    }
    setLoading(false);
  };

  const handleProfileClick = async (profileName: string) => {
    addLog(`Conectando ao perfil: ${profileName}`, 'info');
    
    try {
      const result = await loginProfile(profileName);
      
      if (result.success) {
        if ((result as any).type === 'keys') {
          addLog(`✓ Conectado! Account: ${(result as any).accountId}`, 'success');
          setActiveProfile(profileName);
          setStatus({ connected: true, profile: profileName, accountId: (result as any).accountId });
        } else {
          if (result.loginUrl) {
            addLog(`✓ Abra o link abaixo para autenticar:`, 'success');
            addLog(result.loginUrl, 'info', result.loginUrl);
            if (result.loginCode) addLog(`Código: ${result.loginCode}`, 'warning');
            addLog(`Após autenticar, clique em 🔄`, 'info');
            await fetch('http://localhost:3001/api/open-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: result.loginUrl })
            }).catch(() => {});
          } else {
            addLog(`✓ Login SSO iniciado para: ${profileName}`, 'success');
            addLog(`Após autenticar no browser, clique em 🔄`, 'info');
          }
        }
      } else {
        addLog(`✗ Erro ao conectar no perfil: ${profileName}`, 'error');
        if (result.error) addLog(`Detalhes: ${result.error}`, 'error');
      }
    } catch (err) {
      addLog(`✗ Erro inesperado: ${String(err)}`, 'error');
    }
  };

  const handleConfigureProfile = () => {
    setShowConfigModal(true);
  };

  const handleDeleteProfile = async (profileName: string) => {
    if (!confirm(`Deletar o perfil "${profileName}"?`)) return;
    setLoading(true);
    addLog(`Deletando perfil: ${profileName}`, 'info');
    const success = await deleteProfile(profileName);
    if (success) {
      addLog(`✓ Perfil ${profileName} deletado`, 'success');
      const availableProfiles = await listProfiles();
      setProfiles(availableProfiles);
      if (activeProfile === profileName) setActiveProfile(null);
    } else {
      addLog(`✗ Erro ao deletar perfil`, 'error');
    }
    setLoading(false);
  };

  const handleSaveProfile = async (profileData: any) => {
    setLoading(true);
    
    const dataToSend = {
      ...profileData,
      configType: profileData.configType || 'sso'
    };

    if (dataToSend.configType === 'credentials-only') {
      addLog(`Adicionando credenciais para: ${profileData.profileName}`, 'info');
      const success = await configureProfile(dataToSend);
      if (success) {
        addLog(`✓ Credenciais salvas em ~/.aws/credentials`, 'success');
        // NÃO fecha o modal, volta pro formulário
      } else {
        addLog(`✗ Erro ao salvar credenciais`, 'error');
      }
    } else {
      addLog(`Configurando perfil: ${profileData.profileName}`, 'info');
      const success = await configureProfile(dataToSend);
      if (success) {
        addLog(`✓ Perfil ${profileData.profileName} salvo em ~/.aws/config`, 'success');
        setShowConfigModal(false);
        const availableProfiles = await listProfiles();
        setProfiles(availableProfiles);
        addLog(`${availableProfiles.length} perfil(is) encontrado(s)`, 'success');
      } else {
        addLog(`✗ Erro ao configurar perfil`, 'error');
        alert('Erro ao configurar perfil');
      }
    }
    setLoading(false);
  };

  const loadServices = async () => {
    const data = await fetchServices();
    setServices(data);
  };

  const handleAddService = async (serviceData: any) => {
    const newService = await addService(serviceData);
    setServices(prev => [...prev, newService]);
    addLog(`✓ Serviço ${newService.name} adicionado`, 'success');
  };

  const handleRemoveService = async (id: string, name: string) => {
    if (!confirm(`Remover serviço "${name}"?`)) return;
    await removeService(id);
    setServices(prev => prev.filter(s => s.id !== id));
    setSelectedServices(prev => { const n = new Set(prev); n.delete(id); return n; });
    addLog(`Serviço ${name} removido`, 'info');
  };

  const toggleServiceSelection = (id: string) => {
    setSelectedServices(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleServiceConnect = async (service: SSMService) => {
    if (!activeProfile) {
      addLog('✗ Conecte a um perfil AWS primeiro', 'error');
      return;
    }
    addLog(`Conectando ${service.name} (porta local ${service.localPort} → remota ${service.remotePort})...`, 'info');

    const result = await connectSSM(service.id, service.localPort, service.remotePort, service.instanceId, activeProfile);
    if (result.success) {
      addLog(`✓ ${service.name} conectado na porta ${service.localPort}`, 'success');
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, status: 'connected' } : s));
    } else {
      addLog(`✗ Erro ao conectar ${service.name}`, 'error');
      if (result.error) addLog(result.error, 'error');
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, status: 'disconnected' } : s));
    }
  };

  const handleServiceDisconnect = async (service: SSMService) => {
    addLog(`Desconectando ${service.name}...`, 'info');
    await disconnectSSM(service.id);
    addLog(`✓ ${service.name} desconectado`, 'success');
    setServices(prev => prev.map(s => s.id === service.id ? { ...s, status: 'disconnected' } : s));
  };

  const getStatusText = () => {
    if (loading) return 'Connecting';
    if (status?.connected) return 'Connected';
    return 'Disconnected';
  };

  const getStatusClass = () => {
    if (loading) return 'connecting';
    if (status?.connected) return 'connected';
    return 'disconnected';
  };

  return (
    <>
      <div className="app-container">
        <header className="app-header">
          <div className="header-left">
            <div className="app-logo">AWS SSM Manager</div>
          </div>
          <div className="header-right">
            <div className="connection-status">
              <span className={`status-dot ${getStatusClass()}`}></span>
              <span>{getStatusText()}</span>
              {status?.connected && activeProfile && (
                <>
                  <span className="status-divider">☁️</span>
                  <span>{activeProfile}</span>
                </>
              )}
            </div>
            <div className="header-actions">
              <button className="icon-btn" onClick={() => setShowSettingsModal(true)} title="Settings">⚙️</button>
              <button className="btn-add" onClick={handleConfigureProfile}>➕ Add Profile</button>
            </div>
          </div>
        </header>

        <div className="main-layout">
          <div className="column">
            <div className="column-header">
              <h2>Profiles</h2>
            </div>
            <div className="column-content">
              <div className="status-info">
                <div className="status-badge-large">
                  <span className={`status-dot-large ${getStatusClass()}`}></span>
                  <span>{getStatusText()}</span>
                </div>
                {status?.connected && (
                  <>
                    <div className="status-detail">
                      <span className="label">Profile:</span>
                      <span className="value">{status.profile}</span>
                    </div>
                    <div className="status-detail">
                      <span className="label">Region:</span>
                      <span className="value">{profiles.find(p => p.name === activeProfile)?.region || 'us-east-1'}</span>
                    </div>
                  </>
                )}
              </div>
              {profiles.map((profile) => (
                <div key={profile.name} className="profile-card-compact">
                  <div className="profile-icon">☁️</div>
                  <div className="profile-info-compact">
                    <div className="profile-name-compact">{profile.name}</div>
                    <div className="profile-region">{profile.region || 'sa-east-1'}</div>
                  </div>
                  <div className="profile-card-actions">
                    <button
                      className={`btn-connect-compact ${activeProfile === profile.name ? 'active' : ''}`}
                      onClick={() => handleProfileClick(profile.name)}
                    >
                      {activeProfile === profile.name ? '✓ Connected' : 'Connect'}
                    </button>
                    <button
                      className="btn-icon-action btn-icon-delete"
                      onClick={() => handleDeleteProfile(profile.name)}
                      title="Deletar"
                      disabled={loading}
                    >🗑️</button>
                  </div>
                </div>
              ))}
              <button className="btn-add-item" onClick={handleConfigureProfile}>➕ Add Profile</button>
            </div>
          </div>

          <div className="column">
            <div className="column-header">
              <h2>Services</h2>
              <button className="btn-icon-add" onClick={() => setShowAddServiceModal(true)} title="Adicionar serviço">➕</button>
            </div>
            <div className="column-content">
              <div className="services-grid-compact">
                {services.length === 0 && (
                  <div className="terminal-empty" style={{padding: '16px'}}>Nenhum serviço. Clique em ➕ para adicionar.</div>
                )}
                {services.map((service) => (
                  <div key={service.id} className="service-card-compact">
                    <div className="service-card-top">
                      <div className="service-name">{service.name}</div>
                      <button className="btn-icon-remove" onClick={() => handleRemoveService(service.id, service.name)} title="Remover">✕</button>
                    </div>
                    <div className="service-port">Local: {service.localPort} → Remote: {service.remotePort}</div>
                    <div className="service-instance">{service.instanceId}</div>
                    <div className="service-buttons">
                      <button 
                        className="btn-service-connect-small" 
                        disabled={!status?.connected || service.status === 'connected'}
                        onClick={() => handleServiceConnect(service)}
                      >Connect</button>
                      <button 
                        className="btn-service-disconnect-small" 
                        disabled={service.status !== 'connected'}
                        onClick={() => handleServiceDisconnect(service)}
                      >Disconnect</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="column">
            <div className="column-header">
              <h2>Status</h2>
            </div>
            <div className="column-content">
              <div className="action-buttons" style={{marginBottom: '12px'}}>
                <button className="btn-action" disabled={!status?.connected} onClick={() => {
                  const selected = services.filter(s => selectedServices.has(s.id));
                  const targets = selected.length > 0 ? selected : services;
                  targets.filter(s => s.status !== 'connected').forEach(s => handleServiceConnect(s));
                }}>🔄 Reconnect</button>
                <button className="btn-action-secondary" onClick={() => {
                  const selected = services.filter(s => selectedServices.has(s.id));
                  const targets = selected.length > 0 ? selected : services;
                  targets.filter(s => s.status === 'connected').forEach(s => handleServiceDisconnect(s));
                }}>🗑️ Disconnect</button>
              </div>
              <div className="services-status-list">
                {services.length === 0 && (
                  <div className="terminal-empty" style={{padding: '16px'}}>Nenhum serviço configurado</div>
                )}
                {services.map((service) => (
                  <div key={service.id} className={`service-status-row ${selectedServices.has(service.id) ? 'selected' : ''}`}
                    onClick={() => toggleServiceSelection(service.id)}
                  >
                    <input
                      type="checkbox"
                      className="service-checkbox"
                      checked={selectedServices.has(service.id)}
                      onChange={() => toggleServiceSelection(service.id)}
                      onClick={e => e.stopPropagation()}
                    />
                    <span className={`status-dot-small ${service.status === 'connected' ? 'connected' : 'disconnected'}`}></span>
                    <span className="service-status-name">{service.name}</span>
                    <span className="service-status-port">:{service.localPort}</span>
                    <span className={`service-status-badge ${service.status === 'connected' ? 'badge-connected' : 'badge-disconnected'}`}>
                      {service.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="terminal">
          <div className="terminal-header">
            <span className="terminal-title">TERMINAL</span>
            <div className="terminal-actions">
              <button onClick={clearLogs} className="terminal-btn">📋</button>
              <button onClick={clearLogs} className="terminal-btn">Clear</button>
            </div>
          </div>
          <div className="terminal-body" ref={terminalRef}>
            {loading && (
              <div className="terminal-loading">
                <span className="spinner"></span>
                <span>Connecting...</span>
              </div>
            )}
            {logs.length === 0 && !loading ? (
              <div className="terminal-empty">Waiting for commands...</div>
            ) : (
              logs.map((log: any, index) => (
                <div key={index} className={`terminal-line ${log.type}`}>
                  <span className="log-timestamp">[{log.timestamp}]</span> 
                  <span className={log.type === 'log-info' ? 'log-tag-info' : log.type === 'log-error' ? 'log-tag-error' : ''}>
                    {log.type === 'log-info' ? '[INFO]' : log.type === 'log-error' ? '[ERROR]' : ''}
                  </span>{' '}
                  {log.url ? (
                    <a href={log.url} target="_blank" rel="noreferrer" className="terminal-link">{log.text}</a>
                  ) : log.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showConfigModal && (
        <ConfigureProfileModal
          onClose={() => setShowConfigModal(false)}
          onSave={handleSaveProfile}
        />
      )}
      {showAddServiceModal && (
        <AddServiceModal
          onClose={() => setShowAddServiceModal(false)}
          onSave={handleAddService}
        />
      )}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </>
  );
}

export default App;
