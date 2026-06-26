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
    return <div className="page-shell flex min-h-[50vh] items-center justify-center py-16"><div className="card px-8 py-6 text-center"><div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" /><p className="text-sm font-medium text-slate-600">Loading admin console…</p></div></div>;
  }

  return (
    <div className="page-shell py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="page-title flex items-center gap-3"><Shield className="h-8 w-8 text-indigo-600" />Admin control center</h1>
        <p className="page-subtitle">Platform-wide oversight, access management, and operational controls.</p>
      </div>

      <div className="mb-8 flex flex-wrap gap-3 border-b border-slate-200 pb-4">
        {['analytics', 'users', 'events'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'analytics' && analytics && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card flex items-center justify-between p-6"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Total accounts</p><p className="mt-2 text-3xl font-semibold text-slate-900">{analytics.totalUsers}</p></div><Users className="h-10 w-10 text-indigo-500" /></div>
          <div className="card flex items-center justify-between p-6"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Events created</p><p className="mt-2 text-3xl font-semibold text-slate-900">{analytics.totalEvents}</p></div><Calendar className="h-10 w-10 text-emerald-500" /></div>
          <div className="card flex items-center justify-between p-6"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Total bookings</p><p className="mt-2 text-3xl font-semibold text-slate-900">{analytics.totalRegistrations}</p></div><Shield className="h-10 w-10 text-amber-500" /></div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card p-6">
          <div className="mb-4 max-w-md rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
            <input type="text" placeholder="Search users by name or email..." className="w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-slate-600"><thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Roles</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((u) => (<tr key={u.id}><td className="px-4 py-3 font-semibold text-slate-800">{u.name}</td><td className="px-4 py-3">{u.email}</td><td className="px-4 py-3">{u.roles.join(', ')}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.is_suspended ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{u.is_suspended ? 'Suspended' : 'Active'}</span></td><td className="px-4 py-3 text-right"><button onClick={() => handleToggleUserSuspension(u.id, u.is_suspended)} className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${u.is_suspended ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}>{u.is_suspended ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}<span>{u.is_suspended ? 'Reactivate' : 'Suspend'}</span></button></td></tr>))}</tbody></table>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="card p-6">
          <div className="mb-4 max-w-md rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
            <input type="text" placeholder="Search events by title or description..." className="w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-slate-600"><thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500"><tr><th className="px-4 py-3">Event title</th><th className="px-4 py-3">Organizer</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{events.map((ev) => (<tr key={ev.id}><td className="px-4 py-3 font-semibold text-slate-800">{ev.title}</td><td className="px-4 py-3">{ev.organizer_name}</td><td className="px-4 py-3">{ev.category_name || 'None'}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ev.status === 'cancelled' ? 'bg-rose-50 text-rose-700' : ev.status === 'completed' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'}`}>{ev.status}</span></td><td className="px-4 py-3 text-right">{ev.status !== 'cancelled' && ev.status !== 'completed' && (<button onClick={() => handleForceCancelEvent(ev.id)} className="ml-auto flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"><AlertTriangle className="h-3.5 w-3.5" /><span>Force-cancel</span></button>)}</td></tr>))}</tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}
