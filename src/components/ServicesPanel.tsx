
interface Service {
  id: string;
  name: string;
  port: number;
  remotePort: number;
  status: 'connected' | 'disconnected';
}

interface ServicesPanelProps {
  services: Service[];
  onConnect: (serviceId: string) => void;
  onDisconnect: (serviceId: string) => void;
  onAddService: () => void;
  loading: boolean;
}

function ServicesPanel({ services, onConnect, onDisconnect, onAddService, loading }: ServicesPanelProps) {
  return (
    <div className="services-panel">
      <div className="panel-header">
        <h2>Services</h2>
        <button className="btn-add-service" onClick={onAddService}>
          ➕ Add Service
        </button>
      </div>
      
      <div className="services-grid">
        {services.length === 0 ? (
          <div className="empty-services">
            <p>No services configured</p>
            <button className="btn-primary" onClick={onAddService}>
              Add First Service
            </button>
          </div>
        ) : (
          services.map((service) => (
            <div key={service.id} className="service-card">
              <div className="service-header">
                <h3>{service.name}</h3>
                <span className={`service-status ${service.status}`}>
                  {service.status === 'connected' ? '🟢' : '🔴'}
                </span>
              </div>
              <div className="service-info">
                <div className="service-port">Port: {service.port}</div>
                {service.remotePort && (
                  <div className="service-remote">Remote: {service.remotePort}</div>
                )}
              </div>
              <div className="service-actions">
                {service.status === 'disconnected' ? (
                  <button
                    className="btn-service-connect"
                    onClick={() => onConnect(service.id)}
                    disabled={loading}
                  >
                    Connect
                  </button>
                ) : (
                  <button
                    className="btn-service-disconnect"
                    onClick={() => onDisconnect(service.id)}
                    disabled={loading}
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ServicesPanel;
