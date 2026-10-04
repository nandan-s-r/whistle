'use client';
import { useState, useEffect } from 'react';
import Modal from './Modal';
import { apiFetch } from '@/lib/apiClient';

export default function AddFounderModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [startups, setStartups] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    title: '',
    background: '',
    startup_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      apiFetch('/api/startups')
        .then(data => setStartups(data))
        .catch(err => console.error("Failed to load startups for dropdown"));
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiFetch('/api/founders', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ADD NEW FOUNDER">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && <div style={{ color: 'var(--accent-red)', fontSize: '12px' }}>{error}</div>}
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label className="mono text-secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>FULL NAME</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange} className="input-field" placeholder="John Smith" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="mono text-secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>EMAIL</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} className="input-field" placeholder="john@startup.com" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label className="mono text-secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>TITLE</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} className="input-field" placeholder="CEO / Co-founder" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="mono text-secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>ATTACH TO STARTUP</label>
            <select name="startup_id" required value={formData.startup_id} onChange={handleChange} className="input-field" style={{ appearance: 'auto' }}>
              <option value="" disabled>Select Startup...</option>
              {startups.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mono text-secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>BACKGROUND</label>
          <textarea name="background" value={formData.background} onChange={handleChange} className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} placeholder="Ex-Stripe, CS Stanford..."></textarea>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '16px' }}>
          {loading ? 'SAVING...' : 'SAVE FOUNDER RECORD'}
        </button>
      </form>
    </Modal>
  );
}
