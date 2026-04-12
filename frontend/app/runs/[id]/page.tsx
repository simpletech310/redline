'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getRun, joinRun, placePick, getWallet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Flag, MapPin, Calendar, DollarSign, Users, ShieldCheck, Trophy, Car, TrendingUp } from 'lucide-react';

interface Participant {
  id: string;
  user_id: string;
  username?: string;
  odds?: number;
  placement?: number;
  best_et?: number;
  vehicle?: {
    id: string;
    name?: string;
    vehicle_type?: string;
    vehicle_class?: string;
    build_level?: string;
    reliability_level?: number;
  };
}

interface Run {
  run_id?: string;
  id: string;
  name: string;
  motorsport?: string;
  race_type?: string;
  race_format?: string;
  distance?: string;
  surface?: string;
  conditions?: string;
  location: string;
  date_time: string;
  entry_fee?: number;
  max_participants?: number;
  description?: string;
  creator_id?: string;
  results_posted?: boolean;
  participants?: Participant[];
  allowed_classes?: string[];
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Pick state
  const [selectedPick, setSelectedPick] = useState<string>('');
  const [betAmount, setBetAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [placingPick, setPlacingPick] = useState(false);
  const [pickError, setPickError] = useState('');
  const [pickSuccess, setPickSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      getRun(id),
      getWallet().catch(() => ({ data: { balance: 0 } }))
    ]).then(([runRes, walletRes]) => {
      setRun(runRes.data);
      setWalletBalance(walletRes.data?.balance || 0);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleJoin = async () => {
    setJoining(true);
    setJoinError('');
    try {
      await joinRun(id, {});
      const res = await getRun(id);
      setRun(res.data);
    } catch {
      setJoinError('Unable to join. Make sure you have a compatible vehicle.');
    } finally {
      setJoining(false);
    }
  };

  const handlePlacePick = async () => {
    const amount = parseFloat(betAmount);
    if (!selectedPick) {
      setPickError('Select a racer to bet on');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setPickError('Enter a valid bet amount');
      return;
    }
    if (amount > walletBalance) {
      setPickError(`Insufficient balance. You have $${walletBalance.toFixed(2)}`);
      return;
    }

    const participant = run?.participants?.find(p => p.username === selectedPick);
    const odds = participant?.odds || 2.0;

    setPlacingPick(true);
    setPickError('');
    setPickSuccess(false);

    try {
      const res = await placePick({
        run_id: run?.id,
        prediction: selectedPick,
        amount: amount,
        odds: odds,
        pick_type: 'winner'
      });
      setWalletBalance(res.data.balance);
      setBetAmount('');
      setSelectedPick('');
      setPickSuccess(true);
      setTimeout(() => setPickSuccess(false), 4000);
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to place pick';
      setPickError(errorMsg);
    } finally {
      setPlacingPick(false);
    }
  };

  const selectedOdds = run?.participants?.find(p => p.username === selectedPick)?.odds || 2.0;
  const potentialPayout = parseFloat(betAmount) * selectedOdds || 0;

  const formatLabel = (s?: string) => s?.replace(/_/g, ' ') || '—';
  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const isParticipant = run?.participants?.some(p => p.user_id === user?.id);
  const isCreator = run?.creator_id === user?.id;

  if (loading) return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
      <span style={{ color: '#555' }}>Loading...</span>
    </div>
  );
  if (!run) return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem', color: '#555' }}>
      Race not found
    </div>
  );

  return (
    <div className="page-container">
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3b0000 0%, #111 60%, #0a0a0a 100%)',
        border: '1px solid #2a2a2a',
        borderRadius: '1rem',
        padding: '1.25rem',
        marginBottom: '1rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, background: '#dc2626', borderRadius: '50%', opacity: 0.05, filter: 'blur(30px)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {run.motorsport && <span className="badge badge-redline">{run.motorsport}</span>}
            {run.results_posted && <span className="badge badge-green">Results Posted</span>}
          </div>
          <h1 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            {run.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#9ca3af', fontSize: '0.8rem' }}>
            <MapPin size={13} style={{ color: '#555' }} />
            {run.location}
          </div>
        </div>
      </div>

      {/* Race Config Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
        {[
          { label: 'Format', value: formatLabel(run.race_format) },
          { label: 'Type', value: formatLabel(run.race_type) },
          { label: 'Distance', value: formatLabel(run.distance) },
          { label: 'Track', value: [run.surface, run.conditions].filter(Boolean).map(s => formatLabel(s)).join(' · ') || '—' },
          { label: 'Entry Fee', value: run.entry_fee ? `$${run.entry_fee.toFixed(2)}` : 'Free' },
          { label: 'Date', value: formatDate(run.date_time) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.5rem', padding: '0.625rem 0.75rem' }}>
            <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.2rem' }}>{label}</div>
            <div style={{ color: '#e5e7eb', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>

      {run.description && (
        <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.5rem', padding: '0.875rem', marginBottom: '1rem' }}>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', lineHeight: '1.5' }}>{run.description}</p>
        </div>
      )}

      {/* Participants */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
          <h2 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Participants
          </h2>
          <span style={{ color: '#555', fontSize: '0.75rem' }}>
            {run.participants?.length || 0}/{run.max_participants || '∞'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(run.participants || []).map(p => (
            <div key={p.id} style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.625rem', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `hsl(${(p.username || 'R').charCodeAt(0) * 37 % 360}, 40%, 25%)`,
                border: '2px solid #2a2a2a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: 700, color: '#fff',
              }}>
                {(p.username || 'R')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                  @{p.username || 'Racer'}
                </div>
                {p.vehicle && (
                  <div style={{ color: '#555', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Car size={11} />
                    {p.vehicle.name || p.vehicle.vehicle_type || 'Vehicle'}
                    {p.vehicle.build_level && (
                      <span className="badge badge-gray" style={{ marginLeft: '0.25rem' }}>{p.vehicle.build_level}</span>
                    )}
                  </div>
                )}
              </div>
              {p.placement && (
                <div style={{
                  fontWeight: 900, fontSize: '1.1rem', fontFamily: 'monospace',
                  color: p.placement === 1 ? '#facc15' : p.placement === 2 ? '#d1d5db' : p.placement === 3 ? '#f97316' : '#555',
                }}>
                  #{p.placement}
                </div>
              )}
              {p.odds && !p.placement && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#facc15', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'monospace' }}>{p.odds.toFixed(2)}x</div>
                  <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase' }}>Odds</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Place Pick Section */}
      {!run.results_posted && run.participants && run.participants.length >= 2 && user && (
        <div style={{
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#facc15' }}>
              <TrendingUp size={14} />
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Place Your Pick</span>
            </div>
            <div style={{ color: '#555', fontSize: '0.7rem' }}>
              Balance: <span style={{ color: '#4ade80', fontFamily: 'monospace', fontWeight: 600 }}>${walletBalance.toFixed(2)}</span>
            </div>
          </div>

          {pickError && (
            <div style={{
              background: 'rgba(220,38,38,0.1)',
              border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: '0.5rem',
              padding: '0.625rem',
              color: '#f87171',
              fontSize: '0.8rem',
              marginBottom: '0.75rem'
            }}>{pickError}</div>
          )}

          {pickSuccess && (
            <div style={{
              background: 'rgba(74,222,128,0.1)',
              border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: '0.5rem',
              padding: '0.625rem',
              color: '#4ade80',
              fontSize: '0.8rem',
              marginBottom: '0.75rem'
            }}>Pick placed! Good luck!</div>
          )}

          {/* Select Racer */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ color: '#9ca3af', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Pick Winner
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {run.participants.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPick(p.username || '')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: selectedPick === p.username ? 'rgba(250,204,21,0.15)' : '#1c1c1c',
                    border: `1px solid ${selectedPick === p.username ? '#facc15' : '#2a2a2a'}`,
                    color: selectedPick === p.username ? '#facc15' : '#9ca3af',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>@{p.username}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', opacity: 0.7 }}>
                    {(p.odds || 2.0).toFixed(1)}x
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bet Amount */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ color: '#9ca3af', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Bet Amount
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#555',
                  fontWeight: 600,
                }}>$</span>
                <input
                  type="number"
                  className="input-carbon"
                  placeholder="0.00"
                  value={betAmount}
                  onChange={e => setBetAmount(e.target.value)}
                  style={{ paddingLeft: '1.5rem' }}
                  min="1"
                  step="0.01"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem' }}>
              {[5, 10, 25, 50].map(amt => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt.toString())}
                  disabled={amt > walletBalance}
                  style={{
                    padding: '0.35rem 0.6rem',
                    background: betAmount === amt.toString() ? 'rgba(220,38,38,0.15)' : '#1c1c1c',
                    border: `1px solid ${betAmount === amt.toString() ? '#dc2626' : '#2a2a2a'}`,
                    borderRadius: '0.375rem',
                    color: amt > walletBalance ? '#333' : betAmount === amt.toString() ? '#f87171' : '#9ca3af',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    cursor: amt > walletBalance ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                    opacity: amt > walletBalance ? 0.5 : 1,
                  }}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          {/* Potential Payout */}
          {selectedPick && parseFloat(betAmount) > 0 && (
            <div style={{
              background: 'rgba(74,222,128,0.05)',
              border: '1px solid rgba(74,222,128,0.2)',
              borderRadius: '0.5rem',
              padding: '0.625rem',
              marginBottom: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Potential Payout</span>
              <span style={{ color: '#4ade80', fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem' }}>
                ${potentialPayout.toFixed(2)}
              </span>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handlePlacePick}
            disabled={placingPick || !selectedPick || !betAmount || walletBalance <= 0}
            className="btn-redline"
            style={{
              width: '100%',
              opacity: (placingPick || !selectedPick || !betAmount || walletBalance <= 0) ? 0.6 : 1,
            }}
          >
            {placingPick ? 'Placing Pick...' : walletBalance <= 0 ? 'Add Funds to Bet' : 'Place Pick'}
          </button>
        </div>
      )}

      {/* Actions */}
      {!isParticipant && !run.results_posted && user?.account_type !== 'spectator' && (
        <div>
          {joinError && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '0.5rem', padding: '0.75rem', color: '#f87171', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
              {joinError}
            </div>
          )}
          <button onClick={handleJoin} disabled={joining} className="btn-redline" style={{ width: '100%', opacity: joining ? 0.6 : 1 }}>
            {joining ? 'Joining...' : '+ Join Race'}
          </button>
        </div>
      )}
      {isParticipant && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.875rem', textAlign: 'center', color: '#4ade80', fontSize: '0.85rem', fontWeight: 600 }}>
          ✓ You are registered for this race
        </div>
      )}
    </div>
  );
}
