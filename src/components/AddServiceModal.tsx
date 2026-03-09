import { useState } from 'react';
import { SSMService } from '../types';

interface AddServiceModalProps {
  onClose: () => void;
  onSave: (service: Omit<SSMService, 'id' | 'status'>) => void;
}

function AddServiceModal({ onClose, onSave }: AddServiceModalProps) {
  const [form, setForm] = useState({
    name: '',
    localPort: '',
    remotePort: '',
    instanceId: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: form.name,
      localPort: Number(form.localPort),
      remotePort: Number(form.remotePort),
      instanceId: form.instanceId
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Adicionar Serviço</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome do Serviço *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              // placeholder="ex: bffmesacredito"
              required
            />
          </div>
          <div className="form-group">
            <label>Instance ID *</label>
            <input
              type="text"
              name="instanceId"
              value={form.instanceId}
              onChange={handleChange}
              placeholder="ex: i-0123456789abcdef0"
              required
            />
          </div>
          <div className="form-group">
            <label>Porta Local *</label>
            <input
              type="number"
              name="localPort"
              value={form.localPort}
              onChange={handleChange}
              placeholder="ex: 5000"
              required
            />
          </div>
          <div className="form-group">
            <label>Porta Remota *</label>
            <input
              type="number"
              name="remotePort"
              value={form.remotePort}
              onChange={handleChange}
              placeholder="ex: 5000"
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Adicionar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddServiceModal;
