import { useState } from 'react';

interface SettingsModalProps {
  onClose: () => void;
}

function SettingsModal({ onClose }: SettingsModalProps) {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleExport = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/settings/export');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aws-ssm-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ text: '✓ Configurações exportadas com sucesso', type: 'success' });
    } catch {
      setMessage({ text: '✗ Erro ao exportar configurações', type: 'error' });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const response = await fetch('http://localhost:3001/api/settings/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.success) {
        setMessage({ text: '✓ Configurações importadas! Recarregue o app.', type: 'success' });
      } else {
        setMessage({ text: `✗ Erro: ${result.error}`, type: 'error' });
      }
    } catch {
      setMessage({ text: '✗ Arquivo inválido', type: 'error' });
    }
    setImporting(false);
    e.target.value = '';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
        <h2>⚙️ Settings</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          <div className="settings-option" onClick={handleExport}>
            <div className="settings-option-icon">📤</div>
            <div className="settings-option-info">
              <div className="settings-option-title">Exportar Configurações</div>
              <div className="settings-option-desc">Salva perfis AWS, credenciais e serviços em um arquivo .json</div>
            </div>
          </div>

          <label className="settings-option" style={{ cursor: 'pointer' }}>
            <div className="settings-option-icon">📥</div>
            <div className="settings-option-info">
              <div className="settings-option-title">Importar Configurações</div>
              <div className="settings-option-desc">Restaura perfis, credenciais e serviços de um backup .json</div>
            </div>
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} disabled={importing} />
          </label>
        </div>

        {message && (
          <div className={`settings-message ${message.type}`} style={{ marginTop: '16px' }}>
            {message.text}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button className="btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
