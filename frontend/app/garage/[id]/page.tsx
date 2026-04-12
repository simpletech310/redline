'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMachine, updateMachine, togglePrivacy } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Wrench, Eye, EyeOff, Save, Zap, Shield, Gauge } from 'lucide-react';

interface Machine {
  id: string;
  name?: string;
  vehicle_type: string;
  vehicle_class?: string;
  motorsport?: string;
  build_level?: string;
  reliability_level?: number;
  is_public?: boolean;
  mods?: string[];
  inferred_stats?: {
    win_rate?: number;
    reliability?: number;
    engine?: string;
    horsepower?: number;
    zero_to_sixty?: number;
  };
}

const BUILD_LEVELS = ['stock', 'mild', 'performance', 'monster'];
const BUILD_COLORS: Record<string, string> = {
  stock: '#9ca3af',
  mild: '#60a5fa',
  performance: '#a78bfa',
  monster: '#f97316',
};

export default function VehicleTunerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState<Partial<Machine>>({});

  useEffect(() => {
    getMachine(id)
      .then(r => {
        setMachine(r.data);
        setForm({
          name: r.data.name || '',
          build_level: r.data.build_level || 'stock',
          reliability_level: r.data.reliability_level ?? 80,
          is_public: r.data.is_public ?? true,
          mods: r.data.mods || [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const setField = (key: string, val: unknown) => {
    setForm(p => ({ ...p, [key]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMachine(id, form);
      setDirty(false);
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleTogglePrivacy = async () => {
    await togglePrivacy(id);
    setForm(p => ({ ...p, is_public: !p.is_public }));
    setDirty(false);
  };

  const buildColor = BUILD_COLORS[form.build_level || 'stock'] || '#555';

  if (loading) return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem', color: '#555' }}>Loading...</div>
  );
  if (!machine) return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem', color: '#555' }}>Vehicle not found</div>
  );

  return (
    <div className="page-container">
      {/* Back + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => router.back()}
          className="btn-ghost"
          style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>
            Vehicle Tuner
          </h1>
          <p style={{ color: '#555', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {machine.vehicle_type} {machine.vehicle_class ? `· ${machine.vehicle_class}` : ''}
          </p>
        </div>
      </div>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #111 0%, #1c1c1c 100%)',
        border: `1px solid ${buildColor}33`,
        borderRadius: '1rem',
        padding: '1.25rem',
        marginBottom: '1rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: buildColor, borderRadius: '50%', opacity: 0.06, filter: 'blur(30px)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {machine.motorsport && <span className="badge badge-gray">{machine.motorsport}</span>}
            <span className="badge" style={{ background: `${buildColor}22`, color: buildColor, border: `1px solid ${buildColor}44`, textTransform: 'uppercase', fontSize: '0.6rem', fontWeight: 700 }}>
              {form.build_level || 'stock'}
            </span>
          </div>
          <div style={{ color: buildColor, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '0.25rem' }}>
            {machine.vehicle_type}
          </div>
          <div style={{ color: '#555', fontSize: '0.75rem' }}>
            {machine.inferred_stats?.engine || 'Engine not specified'}
          </div>
        </div>
      </div>

      {/* Name */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
          Nickname
        </label>
        <input
          className="input-carbon"
          value={form.name || ''}
          onChange={e => setField('name', e.target.value)}
          placeholder="Give your machine a name..."
        />
      </div>

      {/* Build Level */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
          Build Level
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.4rem' }}>
          {BUILD_LEVELS.map(level => {
            const c = BUILD_COLORS[level];
            const active = form.build_level === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setField('build_level', level)}
                style={{
                  padding: '0.75rem 0.25rem',
                  borderRadius: '0.5rem',
                  background: active ? `${c}18` : '#1c1c1c',
                  border: `1px solid ${active ? c : '#2a2a2a'}`,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <Zap size={16} color={active ? c : '#555'} style={{ display: 'block', margin: '0 auto 0.3rem' }} />
                <div style={{ color: active ? c : '#9ca3af', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {level}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reliability */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            <Shield size={11} style={{ display: 'inline', marginRight: '0.3rem', color: '#555' }} />
            Reliability
          </label>
          <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700 }}>
            {Math.round(form.reliability_level || 80)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={form.reliability_level || 80}
          onChange={e => setField('reliability_level', parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#dc2626', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
          <span style={{ color: '#555', fontSize: '0.6rem' }}>Rough</span>
          <span style={{ color: '#555', fontSize: '0.6rem' }}>Race Ready</span>
        </div>
      </div>

      {/* Inferred Stats */}
      {machine.inferred_stats && (
        <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.75rem' }}>
            Inferred Performance
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {machine.inferred_stats.win_rate !== undefined && (
              <div>
                <div style={{ color: '#555', fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.3rem' }}>
                  <Gauge size={10} style={{ display: 'inline', marginRight: '0.25rem' }} />Win Rate
                </div>
                <div style={{ height: 5, background: '#1c1c1c', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#dc2626', borderRadius: 9999, width: `${Math.min(100, machine.inferred_stats.win_rate * 100)}%` }} />
                </div>
                <div style={{ color: '#d1d5db', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 600, marginTop: '0.2rem' }}>
                  {(machine.inferred_stats.win_rate * 100).toFixed(1)}%
                </div>
              </div>
            )}
            {machine.inferred_stats.horsepower !== undefined && (
              <div>
                <div style={{ color: '#555', fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.3rem' }}>HP</div>
                <div style={{ color: '#facc15', fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 900 }}>{machine.inferred_stats.horsepower}</div>
              </div>
            )}
            {machine.inferred_stats.zero_to_sixty !== undefined && (
              <div>
                <div style={{ color: '#555', fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.3rem' }}>0–60 mph</div>
                <div style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700 }}>{machine.inferred_stats.zero_to_sixty}s</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mods list */}
      {machine.mods && machine.mods.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
            <Wrench size={11} /> Modifications
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {machine.mods.map((mod, i) => (
              <span key={i} className="badge badge-gray" style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}>{mod}</span>
            ))}
          </div>
        </div>
      )}

      {/* Privacy + Save */}
      <div style={{ display: 'flex', gap: '0.625rem' }}>
        <button
          onClick={handleTogglePrivacy}
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', flex: '0 0 auto' }}
        >
          {form.is_public ? <Eye size={15} style={{ color: '#4ade80' }} /> : <EyeOff size={15} style={{ color: '#555' }} />}
          {form.is_public ? 'Public' : 'Private'}
        </button>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="btn-redline"
          style={{ flex: 1, opacity: !dirty ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
        >
          <Save size={15} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
