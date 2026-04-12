'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getTeam, getTeamMembers, getTeamFleet, getGarage, inviteToTeam, removeTeamMember, addToTeamFleet, removeFromTeamFleet, searchRedliners, deleteTeam } from '@/lib/api';
import { ArrowLeft, Users, Search, UserPlus, Trash2, Car, Plus, X } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  owner: { id: string; username: string };
}

interface Member {
  id: string;
  user_id: string;
  username: string;
  role: string;
}

interface FleetMachine {
  id: string;
  machine_id: string;
  machine: {
    id: string;
    name: string;
    vehicle_type: string;
    build_level: string;
  };
}

interface Machine {
  id: string;
  name: string;
  vehicle_type: string;
}

interface Redliner {
  id: string;
  username: string;
  account_type: string;
}

export default function ManageTeamPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [fleet, setFleet] = useState<FleetMachine[]>([]);
  const [myMachines, setMyMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'members' | 'fleet'>('members');

  // Invite state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Redliner[]>([]);
  const [inviting, setInviting] = useState<string | null>(null);

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getTeam(id as string).then(r => setTeam(r.data)),
      getTeamMembers(id as string).then(r => setMembers(r.data.members || [])),
      getTeamFleet(id as string).then(r => setFleet(r.data.fleet || [])).catch(() => {}),
      getGarage().then(r => setMyMachines(r.data || [])).catch(() => {}),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchRedliners(searchQuery)
        .then(r => {
          const racers = r.data.racers || [];
          const memberIds = members.map(m => m.user_id);
          setSearchResults(racers.filter((r: Redliner) =>
            !memberIds.includes(r.id) && r.account_type !== 'spectator'
          ));
        })
        .catch(() => setSearchResults([]));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, members]);

  const handleInvite = async (userId: string) => {
    setInviting(userId);
    try {
      await inviteToTeam(team!.id, { user_id: userId });
      setSearchResults(prev => prev.filter(r => r.id !== userId));
      setSearchQuery('');
      alert('Invite sent!');
    } catch {
      alert('Failed to send invite');
    } finally {
      setInviting(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the team?')) return;
    setActionLoading(userId);
    try {
      await removeTeamMember(team!.id, userId);
      setMembers(prev => prev.filter(m => m.user_id !== userId));
    } catch {
      alert('Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddToFleet = async (machineId: string) => {
    setActionLoading(machineId);
    try {
      const res = await addToTeamFleet(team!.id, { machine_id: machineId });
      setFleet(prev => [...prev, res.data]);
    } catch {
      alert('Failed to add machine');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFromFleet = async (machineId: string) => {
    setActionLoading(machineId);
    try {
      await removeFromTeamFleet(team!.id, machineId);
      setFleet(prev => prev.filter(f => f.machine_id !== machineId));
    } catch {
      alert('Failed to remove machine');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm('Are you sure you want to delete this team? This cannot be undone.')) return;
    try {
      await deleteTeam(team!.id);
      router.push('/teams');
    } catch {
      alert('Failed to delete team');
    }
  };

  const isOwner = team?.owner?.id === user?.id;
  const fleetMachineIds = fleet.map(f => f.machine_id);
  const availableForFleet = myMachines.filter(m => !fleetMachineIds.includes(m.id));

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#555' }}>Loading...</div>
      </div>
    );
  }

  if (!team || !isOwner) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#555' }}>Access denied</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 900 }}>Manage {team.name}</h1>
          <p style={{ color: '#555', fontSize: '0.62rem', textTransform: 'uppercase' }}>Team Settings</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { key: 'members', label: 'Members', icon: Users },
          { key: 'fleet', label: 'Fleet', icon: Car },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'members' | 'fleet')}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: tab === t.key ? '#dc2626' : '#1c1c1c',
              color: tab === t.key ? '#fff' : '#9ca3af',
              border: `1px solid ${tab === t.key ? '#dc2626' : '#2a2a2a'}`,
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'members' ? (
        <>
          {/* Invite Section */}
          <div className="carbon-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <UserPlus size={14} color="#22c55e" />
              <span style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Invite Jockey
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
              <input
                className="input-carbon"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by username..."
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
            {searchResults.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                {searchResults.map(r => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.5rem', background: '#1c1c1c', borderRadius: '0.375rem', marginBottom: '0.25rem',
                  }}>
                    <span style={{ color: '#fff', fontSize: '0.85rem' }}>@{r.username}</span>
                    <button
                      onClick={() => handleInvite(r.id)}
                      disabled={inviting === r.id}
                      className="btn-redline"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem' }}
                    >
                      {inviting === r.id ? '...' : 'Invite'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Members List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {members.map(m => (
              <div key={m.id} className="carbon-card" style={{
                padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `hsl(${m.username.charCodeAt(0) * 37 % 360}, 60%, 30%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700, color: '#fff',
                  }}>
                    {m.username[0].toUpperCase()}
                  </div>
                  <div>
                    <span style={{ color: '#fff', fontWeight: 600 }}>@{m.username}</span>
                    <span style={{ color: '#555', fontSize: '0.75rem', marginLeft: '0.5rem' }}>({m.role})</span>
                  </div>
                </div>
                {m.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(m.user_id)}
                    disabled={actionLoading === m.user_id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Add to Fleet */}
          {availableForFleet.length > 0 && (
            <div className="carbon-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Plus size={14} color="#22c55e" />
                <span style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Add to Fleet
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {availableForFleet.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.5rem', background: '#1c1c1c', borderRadius: '0.375rem',
                  }}>
                    <div>
                      <span style={{ color: '#fff', fontSize: '0.85rem' }}>{m.name || m.vehicle_type}</span>
                      <span style={{ color: '#555', fontSize: '0.75rem', marginLeft: '0.5rem' }}>({m.vehicle_type})</span>
                    </div>
                    <button
                      onClick={() => handleAddToFleet(m.id)}
                      disabled={actionLoading === m.id}
                      className="btn-redline"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem' }}
                    >
                      {actionLoading === m.id ? '...' : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fleet List */}
          {fleet.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#555' }}>
              <Car size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>No machines in fleet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {fleet.map(f => (
                <div key={f.id} className="carbon-card" style={{
                  padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{f.machine.name || f.machine.vehicle_type}</span>
                    <span style={{ color: '#555', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                      {f.machine.vehicle_type} - {f.machine.build_level}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFromFleet(f.machine_id)}
                    disabled={actionLoading === f.machine_id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Team */}
      <button
        onClick={handleDeleteTeam}
        className="btn-ghost"
        style={{ width: '100%', marginTop: '2rem', color: '#f87171', borderColor: 'rgba(220,38,38,0.3)' }}
      >
        <Trash2 size={14} style={{ marginRight: '0.5rem' }} />
        Delete Team
      </button>
    </div>
  );
}
