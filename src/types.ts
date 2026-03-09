export interface AWSProfile {
  name: string;
  ssoStartUrl?: string;
  ssoRegion?: string;
  region?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  profile?: string;
  accountId?: string;
}

export interface SSMPort {
  instanceId: string;
  instanceName: string;
  localPort: number;
  remotePort: number;
  status: 'active' | 'inactive';
}

export interface SSMService {
  id: string;
  name: string;
  localPort: number;
  remotePort: number;
  instanceId: string;
  status: 'connected' | 'disconnected';
}
