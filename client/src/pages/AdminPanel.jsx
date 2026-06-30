import React, { useState, useEffect } from 'react';
import api from '../api';
import { Shield, Users, Calendar, AlertTriangle, Play, Pause } from 'lucide-react';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');

  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/admin/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users', { params: { search: userSearch } });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await api.get('/admin/events', { params: { search: eventSearch } });
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchAnalytics(), fetchUsers(), fetchEvents()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [userSearch]);

  useEffect(() => {
    fetchEvents();
  }, [eventSearch]);

  const handleToggleUserSuspension = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'reactivate' : 'suspend'} this user?`)) return;
    try {
      await api.put(`/admin/users/${userId}/status`, { isSuspended: !currentStatus });
      fetchUsers();
      fetchAnalytics();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleForceCancelEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to force-cancel this event? This will alert all attendees.')) return;
    try {
      await api.post(`/admin/events/${eventId}/force-cancel`);
      fetchEvents();
      fetchAnalytics();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to force-cancel event');
    }
  };

  if (loading) {
    return <div className="page-shell flex min-h-[50vh] items-center justify-center py-16"><div className="card px-8 py-6 text-center"><div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-primary/15 border-t-primary" /><p className="text-sm font-medium text-muted">Loading admin console…</p></div></div>;
  }

  return (
    <div className="page-shell py-8 sm:py-10 fade-in-section">
      <div className="mb-8">
        <h1 className="page-title flex items-center gap-3"><Shield className="h-8 w-8 text-primary" />Admin control center</h1>
        <p className="page-subtitle">Platform-wide oversight, access management, and operational controls.</p>
      </div>

      <div className="mb-8 flex flex-wrap gap-3 border-b border-border/60 pb-4">
        {['analytics', 'users', 'events'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition-all duration-300 ${activeTab === tab ? 'bg-primary text-white shadow-[0_12px_28px_-16px_rgba(93,56,145,0.78)]' : 'bg-bg-soft text-muted hover:bg-primary/8 hover:text-primary hover:-translate-y-0.5'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'analytics' && analytics && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="stat-card flex items-center justify-between p-6"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Total accounts</p><p className="mt-2 text-3xl font-semibold text-ink">{analytics.totalUsers}</p></div><Users className="h-10 w-10 text-primary" /></div>
          <div className="stat-card flex items-center justify-between p-6"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Events created</p><p className="mt-2 text-3xl font-semibold text-ink">{analytics.totalEvents}</p></div><Calendar className="h-10 w-10 text-success" /></div>
          <div className="stat-card flex items-center justify-between p-6"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Total bookings</p><p className="mt-2 text-3xl font-semibold text-ink">{analytics.totalRegistrations}</p></div><Shield className="h-10 w-10 text-accent" /></div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card entrance-card p-6">
          <div className="mb-4 max-w-md rounded-2xl border border-border bg-bg-soft px-4 py-2.5 transition-all duration-300 focus-within:-translate-y-0.5 focus-within:border-primary/35 focus-within:bg-surface focus-within:ring-4 focus-within:ring-primary/10">
            <input type="text" placeholder="Search users by name or email..." className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted/70" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-muted"><thead className="bg-bg-soft text-xs uppercase tracking-[0.2em] text-muted"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Roles</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-border/40">{users.map((u) => (<tr key={u.id}><td className="px-4 py-3 font-semibold text-ink">{u.name}</td><td className="px-4 py-3">{u.email}</td><td className="px-4 py-3">{u.roles.join(', ')}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.is_suspended ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>{u.is_suspended ? 'Suspended' : 'Active'}</span></td><td className="px-4 py-3 text-right"><button onClick={() => handleToggleUserSuspension(u.id, u.is_suspended)} className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 ${u.is_suspended ? 'bg-success/10 text-success hover:bg-success/15' : 'bg-danger/10 text-danger hover:bg-danger/15'}`}>{u.is_suspended ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}<span>{u.is_suspended ? 'Reactivate' : 'Suspend'}</span></button></td></tr>))}</tbody></table>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="card entrance-card p-6">
          <div className="mb-4 max-w-md rounded-2xl border border-border bg-bg-soft px-4 py-2.5 transition-all duration-300 focus-within:-translate-y-0.5 focus-within:border-primary/35 focus-within:bg-surface focus-within:ring-4 focus-within:ring-primary/10">
            <input type="text" placeholder="Search events by title or description..." className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted/70" value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-muted"><thead className="bg-bg-soft text-xs uppercase tracking-[0.2em] text-muted"><tr><th className="px-4 py-3">Event title</th><th className="px-4 py-3">Organizer</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-border/40">{events.map((ev) => (<tr key={ev.id}><td className="px-4 py-3 font-semibold text-ink">{ev.title}</td><td className="px-4 py-3">{ev.organizer_name}</td><td className="px-4 py-3">{ev.category_name || 'None'}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ev.status === 'cancelled' ? 'bg-danger/10 text-danger' : ev.status === 'completed' ? 'bg-bg-soft text-muted' : 'bg-success/10 text-success'}`}>{ev.status}</span></td><td className="px-4 py-3 text-right">{ev.status !== 'cancelled' && ev.status !== 'completed' && (<button onClick={() => handleForceCancelEvent(ev.id)} className="ml-auto flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition-all duration-300 hover:-translate-y-0.5 hover:bg-danger/15"><AlertTriangle className="h-3.5 w-3.5" /><span>Force-cancel</span></button>)}</td></tr>))}</tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}
