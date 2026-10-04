'use client';
import { useState } from 'react';
import Modal from './Modal';
import { apiFetch } from '@/lib/apiClient';

export default function AddStartupModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    sector: '',
    stage: '',
    website: '',
    location: '',
    description: '',
    revenue_arr: '',
    valuation: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { setError('Company Name is required.'); return; }
    setLoading(true);
    setError('');

    try {
      await apiFetch('/api/startups', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setFormData({ name: '', sector: '', stage: '', website: '', location: '', description: '', revenue_arr: '', valuation: '' });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create startup';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ADD NEW STARTUP">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && <div style={{ color: 'var(--accent-red)', fontSize: '12px', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label className="mono text-secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>COMPANY NAME *</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange} className="input-field" style={{ width: '100%' }} placeholder="Acme Corp" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="mono text-secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>SECTOR</label>
            <input type="text" name="sector" value={formData.sector} onChange={handleChange} className="input-field" style={{ width: '100%' }} placeholder="AI / SaaS" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label className="mono text-secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>STAGE</label>
            <select name="stage" value={formData.stage} onChange={handleChange} className="input-field" style={{ width: '100%' }}>
              <option value="">Select stage...</option>
              <option value="Pre-seed">Pre-seed</option>
              <option value="Seed">Seed</option>
              <option value="Series A">Series A</option>
              <option value="Series B">Series B</option>
              <option value="Series C+">Series C+</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="mono text-secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>WEBSITE</label>
            <input type="text" name="website" value={formData.website} onChange={handleChange} className="input-field" style={{ width: '100%' }} placeholder="https://..." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label className="mono text-secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>LOCATION</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} className="input-field" style={{ width: '100%' }} placeholder="San Francisco, CA" />
          </div>
        </div>

        <div>
          <label className="mono text-secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>DESCRIPTION</label>
          <textarea name="description" value={formData.description} onChange={handleChange} className="input-field" style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} placeholder="What do they build? What is the founder thesis?" />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label className="mono text-secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>REVENUE ARR</label>
            <input type="text" name="revenue_arr" value={formData.revenue_arr} onChange={handleChange} className="input-field" style={{ width: '100%' }} placeholder="$1.2M" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="mono text-secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>VALUATION</label>
            <input type="text" name="valuation" value={formData.valuation} onChange={handleChange} className="input-field" style={{ width: '100%' }} placeholder="$20M" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button type="button" className="btn" onClick={onClose} style={{ flex: 1 }} disabled={loading}>
            CANCEL
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
            {loading ? '⟳ SAVING...' : 'SAVE STARTUP RECORD'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
