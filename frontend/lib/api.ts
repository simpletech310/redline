import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Auth ───────────────────────────────────────────────────────────────────
export const loginUser   = (d: { email: string; password: string }) => api.post('/auth/login', d);
export const registerUser = (d: object) => api.post('/auth/register', d);

// ─── Users ───────────────────────────────────────────────────────────────────
export const getMe          = () => api.get('/users/me');
export const getCard        = () => api.get('/users/card');
export const updateCard     = (d: object) => api.put('/users/card', d);
export const getGarage      = () => api.get('/users/machines');
export const getMachine     = (id: string) => api.get(`/users/machines/${id}`);
export const createMachine  = (d: object) => api.post('/users/machines', d);
export const updateMachine  = (id: string, d: object) => api.put(`/users/machines/${id}`, d);
export const togglePrivacy  = (id: string) => api.patch(`/users/machines/${id}/privacy`);

// ─── Runs ─────────────────────────────────────────────────────────────────────
export const getAvailableRuns = () => api.get('/runs/available');
export const getMyRuns        = () => api.get('/runs/my');
export const getRun           = (id: string) => api.get(`/runs/${id}`);
export const createRun        = (d: object) => api.post('/runs', d);
export const joinRun          = (id: string, d: object) => api.post(`/runs/${id}/join`, d);
export const postResults      = (id: string, d: object) => api.post(`/runs/${id}/results`, d);
export const getPreloadedData = (sport: string) => api.get(`/runs/preloaded/${sport}`);
export const createQuickRun   = (d: object) => api.post('/runs/quick', d);

// ─── Picks ────────────────────────────────────────────────────────────────────
export const getAvailablePicks = () => api.get('/picks/available');
export const getMyPicks        = () => api.get('/picks/my');
export const placePick         = (d: object) => api.post('/picks', d);

// ─── Wallet ───────────────────────────────────────────────────────────────────
export const getWallet     = () => api.get('/wallet');
export const getHistory    = () => api.get('/wallet/history');
export const depositFunds  = (d: { amount: number }) => api.post('/wallet/deposit', d);

// ─── Feed ─────────────────────────────────────────────────────────────────────
export const getFeed      = (sport?: string) => api.get('/feed', { params: { sport } });
export const createPost   = (d: object) => api.post('/feed/posts', d);
export const addReaction  = (postId: string, reaction: string) =>
  api.post(`/feed/posts/${postId}/react`, { reaction });

// ─── Redliners Directory ──────────────────────────────────────────────────────
export const searchRedliners = (q: string) => api.get('/redliners', { params: { q } });
export const getRedliner     = (id: string) => api.get(`/redliners/${id}`);

// ─── Tournaments ──────────────────────────────────────────────────────────────
export const getTournaments      = () => api.get('/tournaments');
export const getTournament       = (id: string) => api.get(`/tournaments/${id}`);
export const createTournament    = (d: object) => api.post('/tournaments', d);
export const joinTournament      = (id: string) => api.post(`/tournaments/${id}/join`);
export const getTournamentParticipants = (id: string) => api.get(`/tournaments/${id}/participants`);
export const startTournament     = (id: string) => api.post(`/tournaments/${id}/start`);
export const advanceBracket      = (id: string, d: object) => api.post(`/tournaments/${id}/advance`, d);
export const postMatchResult     = (tid: string, mid: string, winner: string) =>
  api.post(`/tournaments/${tid}/matches/${mid}/result`, { winner });

// ─── Challenges ──────────────────────────────────────────────────────────────
export const getChallenges       = () => api.get('/challenges');
export const getMyChallenges     = () => api.get('/challenges/my');
export const getChallenge        = (id: string) => api.get(`/challenges/${id}`);
export const createChallenge     = (d: object) => api.post('/challenges', d);
export const acceptChallenge     = (id: string, d?: object) => api.post(`/challenges/${id}/accept`, d || {});
export const declineChallenge    = (id: string) => api.post(`/challenges/${id}/decline`);
export const cancelChallenge     = (id: string) => api.delete(`/challenges/${id}`);

// ─── Teams ───────────────────────────────────────────────────────────────────
export const getTeams            = () => api.get('/teams');
export const getTeam             = (id: string) => api.get(`/teams/${id}`);
export const getTeamMembers      = (id: string) => api.get(`/teams/${id}/members`);
export const createTeam          = (d: object) => api.post('/teams', d);
export const updateTeam          = (id: string, d: object) => api.put(`/teams/${id}`, d);
export const deleteTeam          = (id: string) => api.delete(`/teams/${id}`);
export const inviteToTeam        = (teamId: string, d: object) => api.post(`/teams/${teamId}/invite`, d);
export const getMyTeamInvites    = () => api.get('/teams/invites/my');
export const acceptTeamInvite    = (inviteId: string) => api.post(`/teams/invites/${inviteId}/accept`);
export const declineTeamInvite   = (inviteId: string) => api.post(`/teams/invites/${inviteId}/decline`);
export const leaveTeam           = (teamId: string) => api.post(`/teams/${teamId}/leave`);
export const removeTeamMember    = (teamId: string, userId: string) => api.delete(`/teams/${teamId}/members/${userId}`);

// ─── Team Fleet ──────────────────────────────────────────────────────────────
export const getTeamFleet        = (teamId: string) => api.get(`/teams/${teamId}/fleet`);
export const addToTeamFleet      = (teamId: string, d: object) => api.post(`/teams/${teamId}/fleet`, d);
export const removeFromTeamFleet = (teamId: string, machineId: string) => api.delete(`/teams/${teamId}/fleet/${machineId}`);
export const getAvailableMachines = (teamId: string) => api.get(`/teams/${teamId}/available-machines`);

// ─── Enhanced Profiles ───────────────────────────────────────────────────────
export const getRedlinerStats    = (id: string) => api.get(`/redliners/${id}/stats`);
export const getRedlinerHistory  = (id: string, page?: number) => api.get(`/redliners/${id}/race-history`, { params: { page } });

// ─── Live Streams ────────────────────────────────────────────────────────────
export const getStreams          = (status?: string, motorsport?: string) => api.get('/streams', { params: { status, motorsport } });
export const getLiveStreams      = (motorsport?: string) => api.get('/streams/live', { params: { motorsport } });
export const getStream           = (id: string) => api.get(`/streams/${id}`);
export const createStream        = (d: object) => api.post('/streams', d);
export const getStreamKey        = (id: string) => api.get(`/streams/${id}/key`);
export const startStream         = (id: string) => api.post(`/streams/${id}/start`);
export const endStream           = (id: string) => api.post(`/streams/${id}/end`);
export const getMyStreams        = () => api.get('/streams/my/streams');
export const viewerPing          = (id: string) => api.post(`/streams/${id}/viewer-ping`);
