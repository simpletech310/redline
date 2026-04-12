'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createMachine } from '@/lib/api';
import { ArrowLeft, Plus } from 'lucide-react';

const MOTORSPORTS = ['Mini Bikes', 'Cars', 'Motorcycles', 'Drift', 'Go-Karts'];
const BUILD_LEVELS = [
  { value: 'stock', label: 'Stock', desc: 'Factory standard' },
  { value: 'mild', label: 'Mild', desc: 'Basic bolt-ons' },
  { value: 'performance', label: 'Performance', desc: 'Major upgrades' },
  { value: 'monster', label: 'Monster', desc: 'Full build' },
];

const VEHICLE_TYPES_BY_SPORT: Record<string, string[]> = {
  'Mini Bikes': [
    // Original
    'Pocket Bike', 'Pit Bike', 'Mini Moto', 'KX65', 'KLX110',
    // Honda CRF
    'CRF50', 'CRF70', 'CRF110', 'CRF125',
    // Yamaha TTR
    'TTR50', 'TTR110', 'TTR125',
    // Classic Honda
    'Z50', 'XR50', 'XR70', 'XR100',
    // Chinese / SSR
    'SSR125', 'SSR140', 'SSR160',
    // Thumpstar
    'Thumpstar 125', 'Thumpstar 140',
    // YCF / Piranha
    'YCF 125', 'YCF 150', 'Piranha 140', 'Piranha 190'
  ],
  'Cars': ['Sedan', 'Coupe', 'Hatchback', 'Muscle Car', 'Sports Car', 'Truck', 'SUV'],
  'Motorcycles': ['Sport Bike', 'Naked', 'Cruiser', 'Supermoto', 'Enduro'],
  'Drift': ['Coupe', 'Sedan', 'Sports Car', 'Muscle Car'],
  'Go-Karts': ['Sprint Kart', 'Rental Kart', 'Shifter Kart'],
};

const MODS_BY_SPORT: Record<string, string[]> = {
  'Mini Bikes': [
    'Stage 1 Exhaust', 'Stage 2 Exhaust', 'Big Bore Exhaust',
    'Race Carb', 'Mikuni Flatslide', 'Keihin FCR',
    'Big Bore Kit', 'Big Bore 170cc', 'Port & Polish', 'High Comp Piston', 'Race Cam', 'Stroker Crank',
    'Race CDI', 'High Rev CDI',
    'Race Clutch', 'Manual Clutch Conversion', 'Close Ratio Gears',
    'Upgraded Forks', 'Rear Shock Upgrade', 'Full Suspension Kit', 'Swingarm Extension',
    'Lightweight Wheels', 'Oil Cooler'
  ],
  'Cars': ['Cold Air Intake', 'Turbo Kit', 'Cam Upgrade', 'Slicks', 'Nitrous', 'ECU Tune'],
  'Motorcycles': ['Race Exhaust', 'Power Commander', 'Launch Control', 'Quick Shifter'],
  'Drift': ['Diff Upgrade', 'Coilovers', 'Angle Kit', 'Hydraulic E-Brake'],
  'Go-Karts': ['Carb Jet', 'Chain Upgrade', 'Racing Seat', 'Spoiler'],
};

export default function AddMachinePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    motorsport: 'Mini Bikes',
    vehicle_type: 'Pocket Bike',
    vehicle_class: '',
    name: '',
    build_level: 'stock',
    reliability_level: 80,
    is_public: true,
    mods: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const types = VEHICLE_TYPES_BY_SPORT[form.motorsport] || [];
    setForm(p => ({ ...p, vehicle_type: types[0] || '', mods: [] }));
  }, [form.motorsport]);

  const toggleMod = (mod: string) => {
    setForm(p => ({
      ...p,
      mods: p.mods.includes(mod)
        ? p.mods.filter(m => m !== mod)
        : [...p.mods, mod]
    }));
  };

  const availableMods = MODS_BY_SPORT[form.motorsport] || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createMachine(form);
      router.push('/garage');
    } catch {
      setError('Failed to register vehicle. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const vehicleTypes = VEHICLE_TYPES_BY_SPORT[form.motorsport] || [];

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>
            Register Machine
          </h1>
          <p style={{ color: '#555', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Add to Garage</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '0.5rem', padding: '0.75rem', color: '#f87171', fontSize: '0.8rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Motorsport */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            Motorsport *
          </label>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {MOTORSPORTS.map(s => (
              <button key={s} type="button"
                onClick={() => setForm(p => ({ ...p, motorsport: s }))}
                style={{
                  padding: '0.4rem 0.75rem', borderRadius: '9999px',
                  background: form.motorsport === s ? '#dc2626' : '#1c1c1c',
                  color: form.motorsport === s ? '#fff' : '#9ca3af',
                  border: `1px solid ${form.motorsport === s ? '#dc2626' : '#2a2a2a'}`,
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Vehicle Type */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            Vehicle Type *
          </label>
          <select className="input-carbon" value={form.vehicle_type} onChange={e => setForm(p => ({ ...p, vehicle_type: e.target.value }))} required>
            {vehicleTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Nickname */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            Nickname (optional)
          </label>
          <input className="input-carbon" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Black Mamba, Red Death..." />
        </div>

        {/* Vehicle Class */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            Class / Division
          </label>
          <input className="input-carbon" value={form.vehicle_class} onChange={e => setForm(p => ({ ...p, vehicle_class: e.target.value }))} placeholder="e.g. Stock, Open, 660cc..." />
        </div>

        {/* Build Level */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            Build Level *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {BUILD_LEVELS.map(b => (
              <button key={b.value} type="button"
                onClick={() => setForm(p => ({ ...p, build_level: b.value }))}
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: form.build_level === b.value ? 'rgba(220,38,38,0.12)' : '#1c1c1c',
                  border: `1px solid ${form.build_level === b.value ? '#dc2626' : '#2a2a2a'}`,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                }}>
                <div style={{ color: form.build_level === b.value ? '#f87171' : '#fff', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.15rem' }}>{b.label}</div>
                <div style={{ color: '#555', fontSize: '0.7rem' }}>{b.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Mods */}
        {availableMods.length > 0 && (
          <div>
            <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Modifications ({form.mods.length} selected)
            </label>
            <div style={{
              background: '#111',
              border: '1px solid #1c1c1c',
              borderRadius: '0.625rem',
              padding: '0.75rem',
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {availableMods.map(mod => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => toggleMod(mod)}
                    style={{
                      padding: '0.35rem 0.6rem',
                      borderRadius: '0.375rem',
                      background: form.mods.includes(mod) ? 'rgba(220,38,38,0.15)' : '#1c1c1c',
                      border: `1px solid ${form.mods.includes(mod) ? '#dc2626' : '#2a2a2a'}`,
                      color: form.mods.includes(mod) ? '#f87171' : '#9ca3af',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {form.mods.includes(mod) ? '✓ ' : ''}{mod}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reliability */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Reliability</label>
            <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700 }}>{form.reliability_level}%</span>
          </div>
          <input type="range" min={0} max={100} step={5} value={form.reliability_level}
            onChange={e => setForm(p => ({ ...p, reliability_level: parseInt(e.target.value) }))}
            style={{ width: '100%', accentColor: '#dc2626' }} />
        </div>

        {/* Visibility */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#1c1c1c', borderRadius: '0.5rem', padding: '0.75rem 1rem', border: '1px solid #2a2a2a' }}>
          <input type="checkbox" id="public" checked={form.is_public} onChange={e => setForm(p => ({ ...p, is_public: e.target.checked }))} style={{ width: 18, height: 18, accentColor: '#dc2626' }} />
          <label htmlFor="public" style={{ color: '#d1d5db', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            Show in Redliners profile (Public)
          </label>
        </div>

        <button type="submit" disabled={loading} className="btn-redline" style={{ marginTop: '0.25rem', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Registering...' : '🔧 Register Machine'}
        </button>
      </form>
    </div>
  );
}
