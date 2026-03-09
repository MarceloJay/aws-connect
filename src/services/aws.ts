import { AWSProfile, ConnectionStatus, SSMPort } from '../types';

const API_BASE = 'http://localhost:3001/api';

export async function checkConnection(profile?: string): Promise<ConnectionStatus> {
  try {
    const url = profile 
      ? `${API_BASE}/connection-status?profile=${encodeURIComponent(profile)}`
      : `${API_BASE}/connection-status`;
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Erro ao verificar conexão:', error);
    return { connected: false };
  }
}

export async function listProfiles(): Promise<AWSProfile[]> {
  try {
    const response = await fetch(`${API_BASE}/profiles`);
    return await response.json();
  } catch (error) {
    console.error('Erro ao listar perfis:', error);
    return [];
  }
}

export async function loginProfile(profileName: string): Promise<{ success: boolean; error?: string; loginUrl?: string; loginCode?: string; type?: string; accountId?: string }> {
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: profileName })
    });
    const data = await response.json();
    return { success: response.ok && data.success, error: data.error, loginUrl: data.loginUrl, loginCode: data.loginCode, type: data.type, accountId: data.accountId };
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return { success: false, error: String(error) };
  }
}

export async function listSSMPorts(): Promise<SSMPort[]> {
  try {
    const response = await fetch(`${API_BASE}/ssm-ports`);
    return await response.json();
  } catch (error) {
    console.error('Erro ao listar portas SSM:', error);
    return [];
  }
}

export async function configureProfile(profileData: any): Promise<boolean> {
  try {
    console.log('=== Enviando para API ===');
    console.log('Dados:', profileData);
    
    const response = await fetch(`${API_BASE}/configure-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    const result = await response.json();
    console.log('Resposta da API:', result);
    return result.success;
  } catch (error) {
    console.error('Erro ao configurar perfil:', error);
    return false;
  }
}

export async function connectSSM(serviceId: string, localPort: number, remotePort: number, instanceId: string, profile?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/ssm-connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId, localPort, remotePort, instanceId, profile })
    });
    const data = await response.json();
    return { success: data.success, error: data.error };
  } catch (error) {
    console.error('Erro ao conectar SSM:', error);
    return { success: false, error: String(error) };
  }
}

export async function disconnectSSM(serviceId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/ssm-disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId })
    });
    return response.ok;
  } catch (error) {
    console.error('Erro ao desconectar SSM:', error);
    return false;
  }
}

export async function listSSMServices(): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE}/ssm-services`);
    return await response.json();
  } catch (error) {
    console.error('Erro ao listar serviços SSM:', error);
    return [];
  }
}

export async function deleteProfile(profileName: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/delete-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileName })
    });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Erro ao deletar perfil:', error);
    return false;
  }
}

export async function fetchServices(): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE}/services`);
    return await response.json();
  } catch { return []; }
}

export async function addService(service: any): Promise<any> {
  const response = await fetch(`${API_BASE}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(service)
  });
  return await response.json();
}

export async function removeService(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' });
    return response.ok;
  } catch { return false; }
}
