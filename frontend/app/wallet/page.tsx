'use client';

import { useEffect, useState } from 'react';
import { getWallet, getHistory, depositFunds } from '@/lib/api';
import { Wallet, ArrowUpRight, ArrowDownLeft, DollarSign, Plus } from 'lucide-react';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_type: string;
  balance_after?: number;
  created_at: string;
}

interface WalletData {
  balance: number;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [depositSuccess, setDepositSuccess] = useState(false);

  const loadData = async () => {
    try {
      const [w, h] = await Promise.all([
        getWallet().catch(() => null),
        getHistory().catch(() => null),
      ]);
      if (w) setWallet(w.data);
      if (h) setHistory(h.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepositError('Enter a valid amount');
      return;
    }
    if (amount > 10000) {
      setDepositError('Maximum deposit is $10,000');
      return;
    }

    setDepositing(true);
    setDepositError('');
    setDepositSuccess(false);

    try {
      const res = await depositFunds({ amount });
      setWallet({ balance: res.data.balance });
      setDepositAmount('');
      setDepositSuccess(true);
      // Refresh history
      const h = await getHistory();
      setHistory(h.data || []);
      setTimeout(() => setDepositSuccess(false), 3000);
    } catch {
      setDepositError('Deposit failed. Try again.');
    } finally {
      setDepositing(false);
    }
  };

  const timeAgo = (dt: string) => {
    const diff = Date.now() - new Date(dt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const isCredit = (t: Transaction) => t.amount > 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>
          Wallet
        </h1>
        <p style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Financial Terminal
        </p>
      </div>

      {/* Balance Card */}
      <div style={{
        background: 'linear-gradient(135deg, #111 0%, #1c1c1c 100%)',
        border: '1px solid #2a2a2a',
        borderRadius: '1rem',
        padding: '2rem',
        textAlign: 'center',
        marginBottom: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', bottom: -30, right: -30, width: 150, height: 150, background: '#4ade80', opacity: 0.03, borderRadius: '50%', filter: 'blur(40px)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.5rem', color: '#555' }}>
            <Wallet size={16} />
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Available Balance</span>
          </div>
          <div style={{ color: '#4ade80', fontSize: '2.5rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.03em' }}>
            ${loading ? '—' : (wallet?.balance || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Deposit Section */}
      <div style={{
        background: '#111',
        border: '1px solid #2a2a2a',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', color: '#9ca3af' }}>
          <Plus size={14} />
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Add Funds</span>
        </div>

        {depositError && (
          <div style={{
            background: 'rgba(220,38,38,0.1)',
            border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: '0.5rem',
            padding: '0.625rem',
            color: '#f87171',
            fontSize: '0.8rem',
            marginBottom: '0.75rem'
          }}>{depositError}</div>
        )}

        {depositSuccess && (
          <div style={{
            background: 'rgba(74,222,128,0.1)',
            border: '1px solid rgba(74,222,128,0.3)',
            borderRadius: '0.5rem',
            padding: '0.625rem',
            color: '#4ade80',
            fontSize: '0.8rem',
            marginBottom: '0.75rem'
          }}>Deposit successful!</div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#555',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}>$</span>
            <input
              type="number"
              className="input-carbon"
              placeholder="0.00"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              style={{ paddingLeft: '1.5rem' }}
              min="1"
              max="10000"
              step="0.01"
            />
          </div>
          <button
            onClick={handleDeposit}
            disabled={depositing || !depositAmount}
            className="btn-redline"
            style={{
              padding: '0.75rem 1.25rem',
              opacity: depositing || !depositAmount ? 0.6 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            {depositing ? 'Adding...' : 'Add Funds'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {[25, 50, 100, 250].map(amt => (
            <button
              key={amt}
              onClick={() => setDepositAmount(amt.toString())}
              style={{
                padding: '0.4rem 0.75rem',
                background: depositAmount === amt.toString() ? 'rgba(220,38,38,0.15)' : '#1c1c1c',
                border: `1px solid ${depositAmount === amt.toString() ? '#dc2626' : '#2a2a2a'}`,
                borderRadius: '0.375rem',
                color: depositAmount === amt.toString() ? '#f87171' : '#9ca3af',
                fontSize: '0.75rem',
                fontWeight: 600,
                fontFamily: 'monospace',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              ${amt}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h2 style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.75rem' }}>
          Transaction History
        </h2>
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: '2rem', color: '#555' }}>Loading...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '2rem', color: '#555' }}>
            <DollarSign size={36} style={{ opacity: 0.2, margin: '0 auto 0.75rem' }} />
            <p style={{ fontSize: '0.9rem' }}>No transactions yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {history.map(tx => (
              <div key={tx.id} style={{
                background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.625rem',
                padding: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: isCredit(tx) ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                  border: `1px solid ${isCredit(tx) ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isCredit(tx)
                    ? <ArrowDownLeft size={16} style={{ color: '#4ade80' }} />
                    : <ArrowUpRight size={16} style={{ color: '#f87171' }} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tx.description}
                  </div>
                  <div style={{ color: '#555', fontSize: '0.7rem', display: 'flex', gap: '0.5rem', marginTop: '0.1rem' }}>
                    <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{tx.transaction_type}</span>
                    <span>· {timeAgo(tx.created_at)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    color: isCredit(tx) ? '#4ade80' : '#f87171',
                    fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem',
                  }}>
                    {isCredit(tx) ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                  </div>
                  {tx.balance_after !== undefined && (
                    <div style={{ color: '#555', fontSize: '0.65rem', fontFamily: 'monospace' }}>
                      → ${tx.balance_after.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
