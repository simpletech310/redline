'use client';

import { useState, useEffect } from 'react';
import { createRun, getPreloadedData } from '@/lib/api';
import { X } from 'lucide-react';

interface CreateRunModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const MOTORSPORTS = ['Mini Bikes', 'Cars', 'Motorcycles', 'Drift', 'Go-Karts'];
const FORMATS = ['single_race', 'best_of_3', 'bracket', 'round_robin', 'time_attack'];
const SURFACES = ['Asphalt', 'Concrete', 'Dirt', 'Sand', 'Mixed'];

export default function CreateRunModal({ onClose, onCreated }: CreateRunModalProps) {
  const [form, setForm] = useState({
    name: '',
    motorsport: 'Mini Bikes',
    race_type: '',
    race_format: 'single_race',
    distance: '',
    surface: '',
    location: '',
    date_time: '',
    entry_fee: 0,
    max_participants: 8,
    description: '',
    picks_enabled: true,
  });
  const [preloaded, setPreloaded] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPreloadedData(form.motorsport)
      .then(r => {
        const d = r.data;
        setPreloaded(d);
        const safeVal = (v: unknown) =>
          v && typeof v === 'object' && 'value' in v ? (v as { value: string }).value : v as string;
        const raceTypes = d?.race_types as unknown[];
        const distances = d?.distances as unknown[];
        setForm(p => ({
          ...p,
          race_type: raceTypes?.length ? safeVal(raceTypes[0]) : '',
          distance: distances?.length ? safeVal(distances[0]) : '',
        }));
      })
      .catch(() => {});
  }, [form.motorsport]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        entry_fee: parseFloat(String(form.entry_fee)) || 0,
        max_participants: parseInt(String(form.max_participants)) || 8,
        date_time: new Date(form.date_time).toISOString(),
        surface: form.surface || null,
        distance: form.distance || null,
        description: form.description || null,
      };
      await createRun(payload);
      onCreated();
      onClose();
    } catch {
      setError('Failed to create run. Check all required fields.');
    } finally {
      setLoading(false);
    }
  };

  const safeOptions = (arr: unknown[]) =>
    (arr || []).map(item =>
      typeof item === 'object' && item && 'value' in item
        ? item as { value: string; label: string }
        : { value: item as string, label: item as string }
    );

  const raceTypes = safeOptions((preloaded.race_types as unknown[]) || []);
  const distances = safeOptions((preloaded.distances as unknown[]) || []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)', zIndex: 100,
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div
        className="animate-slide-up"
        style={{
          background: '#111', borderTop: '1px solid #2a2a2a',
          borderRadius: '1.25rem 1.25rem 0 0',
          width: '100%', maxWidth: 480, margin: '0 auto',
          maxHeight: '90dvh', overflowY: 'auto',
          padding: '1.25rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem', fontStyle: 'italic', textTransform: 'uppercase' }}>Create Run</h2>
            <p style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Race Configuration</p>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.5rem' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '0.5rem', padding: '0.75rem', color: '#f87171', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Name */}
          <div>
            <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Race Name *</label>
            <input className="input-carbon" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Friday Night Drags..." required />
          </div>

          {/* Motorsport */}
          <div>
            <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Motorsport *</label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {MOTORSPORTS.map(s => (
                <button key={s} type="button" onClick={() => setForm(p => ({ ...p, motorsport: s }))}
                  style={{
                    padding: '0.4rem 0.75rem', borderRadius: '9999px',
                    background: form.motorsport === s ? '#dc2626' : '#1c1c1c',
                    color: form.motorsport === s ? '#fff' : '#9ca3af',
                    border: `1px solid ${form.motorsport === s ? '#dc2626' : '#2a2a2a'}`,
                    fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Race Type & Format */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Race Type</label>
              <select className="input-carbon" value={form.race_type} onChange={e => setForm(p => ({ ...p, race_type: e.target.value }))}>
                {raceTypes.map(t => <option key={t.value} value={t.value}>{t.label || t.value}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Format</label>
              <select className="input-carbon" value={form.race_format} onChange={e => setForm(p => ({ ...p, race_format: e.target.value }))}>
                {FORMATS.map(f => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Distance & Surface */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Distance</label>
              <select className="input-carbon" value={form.distance} onChange={e => setForm(p => ({ ...p, distance: e.target.value }))}>
                <option value="">—</option>
                {distances.map(d => <option key={d.value} value={d.value}>{d.label || d.value}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Surface</label>
              <select className="input-carbon" value={form.surface} onChange={e => setForm(p => ({ ...p, surface: e.target.value }))}>
                <option value="">—</option>
                {SURFACES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Location & Date */}
          <div>
            <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Location *</label>
            <input className="input-carbon" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Track name or address" required />
          </div>
          <div>
            <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Date & Time *</label>
            <input className="input-carbon" type="datetime-local" value={form.date_time} onChange={e => setForm(p => ({ ...p, date_time: e.target.value }))} required />
          </div>

          {/* Entry Fee & Max Participants */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Entry Fee ($)</label>
              <input className="input-carbon" type="number" min={0} step={0.01} value={form.entry_fee} onChange={e => setForm(p => ({ ...p, entry_fee: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Max Racers</label>
              <input className="input-carbon" type="number" min={2} max={64} value={form.max_participants} onChange={e => setForm(p => ({ ...p, max_participants: parseInt(e.target.value) || 8 }))} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Description</label>
            <textarea className="input-carbon" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional details..." rows={2} style={{ resize: 'none', fontFamily: 'inherit' }} />
          </div>

          {/* Picks Enabled */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#1c1c1c', borderRadius: '0.5rem', padding: '0.75rem 1rem', border: '1px solid #2a2a2a' }}>
            <input type="checkbox" id="picks" checked={form.picks_enabled} onChange={e => setForm(p => ({ ...p, picks_enabled: e.target.checked }))} style={{ width: 18, height: 18, accentColor: '#dc2626' }} />
            <label htmlFor="picks" style={{ color: '#d1d5db', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
              Enable Picks Marketplace
            </label>
          </div>

          <button type="submit" disabled={loading} className="btn-redline" style={{ marginTop: '0.25rem', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creating Race...' : '🏁 Create Race'}
          </button>
        </form>
      </div>
    </div>
  );
}
