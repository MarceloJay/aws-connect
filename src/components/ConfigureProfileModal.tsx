import { useState } from 'react';

interface ConfigureProfileModalProps {
  onClose: () => void;
  onSave: (data: ProfileConfig) => void;
  editingProfile?: any;
}

interface ProfileConfig {
  profileName: string;
  ssoStartUrl?: string;
  ssoRegion?: string;
  ssoAccountId?: string;
  ssoRoleName?: string;
  region?: string;
  outputFormat?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  configType?: string;
  credentialsText?: string;
}

function ConfigureProfileModal({ onClose, onSave, editingProfile }: ConfigureProfileModalProps) {
  const [configType, setConfigType] = useState<'sso' | 'keys'>('sso');
  const [showCredentialsInput, setShowCredentialsInput] = useState(false);
  const [credentialsText, setCredentialsText] = useState('');
  const [formData, setFormData] = useState<ProfileConfig>({
    profileName: editingProfile?.name || '',
    ssoStartUrl: editingProfile?.ssoStartUrl || '',
    ssoRegion: editingProfile?.ssoRegion || 'us-east-1',
    ssoAccountId: editingProfile?.ssoAccountId || '',
    ssoRoleName: editingProfile?.ssoRoleName || '',
    region: editingProfile?.region || 'us-east-1',
    outputFormat: 'json',
    accessKeyId: '',
    secretAccessKey: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    console.log('Campo alterado:', e.target.name, '=', e.target.value);
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== Enviando dados do formulário ===');
    console.log('configType:', configType);
    console.log('formData:', formData);
    const dataToSend = { ...formData, configType };
    console.log('Dados completos:', dataToSend);
    onSave(dataToSend);
  };

  const handleAddCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setShowCredentialsInput(true);
  };

  const handleSaveCredentials = () => {
    if (!credentialsText.trim()) {
      alert('Cole as credenciais no campo de texto');
      return;
    }

    onSave({ 
      profileName: formData.profileName,
      credentialsText: credentialsText,
      configType: 'credentials-only'
    });
    
    // Volta para o formulário sem fechar o modal
    setShowCredentialsInput(false);
    setCredentialsText('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{editingProfile ? `Editar Perfil: ${editingProfile.name}` : 'Configurar Perfil AWS'}</h2>
        
        {!showCredentialsInput ? (
          <>
            <div className="config-tabs">
              <button
                type="button"
                className={`tab-button ${configType === 'sso' ? 'active' : ''}`}
                onClick={() => setConfigType('sso')}
              >
                SSO (Empresarial)
              </button>
              <button
                type="button"
                className={`tab-button ${configType === 'keys' ? 'active' : ''}`}
                onClick={() => setConfigType('keys')}
              >
                Access Keys (Simples)
              </button>
            </div>

            <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome do Perfil *</label>
            <input
              type="text"
              name="profileName"
              value={formData.profileName}
              onChange={handleChange}
              placeholder={configType === 'sso' ? 'ex: meu-perfil-sso' : 'ex: default'}
              required
            />
          </div>

          {configType === 'sso' && (
            <>
              <div className="form-group">
                <label>SSO Start URL *</label>
                <input
                  type="url"
                  name="ssoStartUrl"
                  value={formData.ssoStartUrl}
                  onChange={handleChange}
                  placeholder="https://my-sso-portal.awsapps.com/start"
                  required
                />
              </div>

              <div className="form-group">
                <label>SSO Region *</label>
                <select
                  name="ssoRegion"
                  value={formData.ssoRegion}
                  onChange={handleChange}
                  required
                >
                  <option value="us-east-1">us-east-1</option>
                  <option value="us-east-2">us-east-2</option>
                  <option value="us-west-1">us-west-1</option>
                  <option value="us-west-2">us-west-2</option>
                  <option value="sa-east-1">sa-east-1</option>
                  <option value="eu-west-1">eu-west-1</option>
                  <option value="eu-central-1">eu-central-1</option>
                  <option value="ap-southeast-1">ap-southeast-1</option>
                </select>
              </div>

              <div className="form-group">
                <label>SSO Account ID *</label>
                <input
                  type="text"
                  name="ssoAccountId"
                  value={formData.ssoAccountId}
                  onChange={handleChange}
                  placeholder="123456789012"
                  pattern="[0-9]{12}"
                  required
                />
              </div>

              <div className="form-group">
                <label>SSO Role Name *</label>
                <input
                  type="text"
                  name="ssoRoleName"
                  value={formData.ssoRoleName}
                  onChange={handleChange}
                  placeholder="AdministratorAccess"
                  required
                />
              </div>

              <div className="form-group">
                <label>Default Region *</label>
                <select
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  required
                >
                  <option value="us-east-1">us-east-1</option>
                  <option value="us-east-2">us-east-2</option>
                  <option value="us-west-1">us-west-1</option>
                  <option value="us-west-2">us-west-2</option>
                  <option value="sa-east-1">sa-east-1</option>
                  <option value="eu-west-1">eu-west-1</option>
                  <option value="eu-central-1">eu-central-1</option>
                  <option value="ap-southeast-1">ap-southeast-1</option>
                </select>
              </div>

              <div className="form-group">
                <label>Output Format</label>
                <select
                  name="outputFormat"
                  value={formData.outputFormat}
                  onChange={handleChange}
                >
                  <option value="json">json</option>
                  <option value="yaml">yaml</option>
                  <option value="text">text</option>
                  <option value="table">table</option>
                </select>
              </div>
            </>
          )}

          {configType === 'keys' && (
            <>
              <div className="form-group">
                <label>AWS Access Key ID *</label>
                <input
                  type="text"
                  name="accessKeyId"
                  value={formData.accessKeyId}
                  onChange={handleChange}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  required
                />
                <small>Obtenha em: IAM → Users → Security credentials</small>
              </div>

              <div className="form-group">
                <label>AWS Secret Access Key *</label>
                <input
                  type="password"
                  name="secretAccessKey"
                  value={formData.secretAccessKey}
                  onChange={handleChange}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  required
                />
              </div>

              <div className="form-group">
                <label>Default Region *</label>
                <select
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  required
                >
                  <option value="us-east-1">us-east-1</option>
                  <option value="us-east-2">us-east-2</option>
                  <option value="us-west-1">us-west-1</option>
                  <option value="us-west-2">us-west-2</option>
                  <option value="sa-east-1">sa-east-1</option>
                  <option value="eu-west-1">eu-west-1</option>
                  <option value="eu-central-1">eu-central-1</option>
                  <option value="ap-southeast-1">ap-southeast-1</option>
                </select>
              </div>

              <div className="form-group">
                <label>Output Format</label>
                <select
                  name="outputFormat"
                  value={formData.outputFormat}
                  onChange={handleChange}
                >
                  <option value="json">json</option>
                  <option value="yaml">yaml</option>
                  <option value="text">text</option>
                  <option value="table">table</option>
                </select>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            {configType === 'sso' && (
              <button type="button" onClick={handleAddCredentials} className="btn-credentials">
                🔑 Add Credentials
              </button>
            )}
            <button type="submit" className="btn-primary">
              Salvar Perfil
            </button>
          </div>
        </form>
          </>
        ) : (
          <div className="credentials-input-section">
            <div className="credentials-profile-name">
              Perfil: <span>{formData.profileName}</span>
            </div>

            <div className="form-group">
              <label>Cole as Credenciais AWS *</label>
              <textarea
                className="credentials-textarea"
                value={credentialsText}
                onChange={(e) => setCredentialsText(e.target.value)}
                placeholder="Cole aqui as credenciais copiadas do AWS Console&#10;&#10;Exemplo:&#10;[default]&#10;aws_access_key_id = AKIAIOSFODNN7EXAMPLE&#10;aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY&#10;aws_session_token = FwoGZXIvYXdzEBYaD..."
                rows={12}
                required
              />
              <small>Cole as credenciais completas do AWS Console (incluindo session_token se houver)</small>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={() => setShowCredentialsInput(false)} className="btn-secondary">
                Voltar
              </button>
              <button type="button" onClick={handleSaveCredentials} className="btn-primary">
                Salvar Credenciais
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfigureProfileModal;
