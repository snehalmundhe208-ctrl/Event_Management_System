import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Shield, AlertTriangle, Play, Pause, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { toAssetUrl } from '../utils/assets';
import PieChart from '../components/PieChart';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');

  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get('/admin/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/admin/users', { params: { search: userSearch } });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [userSearch]);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get('/admin/events', { params: { search: eventSearch } });
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [eventSearch]);

  const fetchPendingApprovals = useCallback(async () => {
    try {
      const res = await api.get('/admin/events/pending-approvals');
      setPendingApprovals(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchAnalytics(), fetchUsers(), fetchEvents(), fetchPendingApprovals()]);
    setLoading(false);
  }, [fetchAnalytics, fetchEvents, fetchPendingApprovals, fetchUsers]);

  useEffect(() => {
    const run = async () => {
      await loadAll();
    };

    void run();
  }, [loadAll]);

  useEffect(() => {
    const run = async () => {
      await fetchUsers();
    };

    void run();
  }, [fetchUsers]);

  useEffect(() => {
    const run = async () => {
      await fetchEvents();
    };

    void run();
  }, [fetchEvents]);

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

  const handleApproveEvent = async (eventId) => {
    try {
      await api.post(`/admin/events/${eventId}/approve`);
      await Promise.all([fetchPendingApprovals(), fetchEvents(), fetchAnalytics()]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve event');
    }
  };

  const handleRejectEvent = async (eventId) => {
    const reason = window.prompt('Rejection reason (optional):', '');
    if (reason === null) return;
    try {
      await api.post(`/admin/events/${eventId}/reject`, { reason });
      await Promise.all([fetchPendingApprovals(), fetchEvents(), fetchAnalytics()]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject event');
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
        {['analytics', 'pending', 'users', 'events'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition-all duration-300 ${activeTab === tab ? 'bg-primary text-white shadow-[0_12px_28px_-16px_rgba(93,56,145,0.78)]' : 'bg-bg-soft text-muted hover:bg-primary/8 hover:text-primary hover:-translate-y-0.5'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'analytics' && analytics && (() => {
        const eventsByStatus = Array.isArray(analytics.eventsByStatus)
          ? analytics.eventsByStatus.map((row) => ({ label: row.status, value: row.count }))
          : [];
        const usersByRole = Array.isArray(analytics.usersByRole)
          ? analytics.usersByRole.map((row) => ({ label: row.role, value: row.count }))
          : [];
        const bookingsBuckets = (() => {
          const rows = Array.isArray(analytics.bookingsOverTime) ? analytics.bookingsOverTime : [];
          const buckets = [];
          for (let i = 0; i < rows.length; i += 7) {
            const slice = rows.slice(i, i + 7);
            const label = slice.length > 1 ? `${slice[0].day}–${slice[slice.length - 1].day}` : slice[0]?.day || '';
            const value = slice.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
            buckets.push({ label, value });
          }
          return buckets.filter((b) => b.label);
        })();

        return (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <PieChart title="Events by status" data={eventsByStatus} centerLabel="Events" centerValue={analytics.totalEvents} />
            <PieChart title="Users by role" data={usersByRole} centerLabel="Users" centerValue={analytics.totalUsers} />
            <PieChart title="Bookings (last 30d)" data={bookingsBuckets} centerLabel="Bookings" centerValue={analytics.totalRegistrations} />
          </div>
        );
      })()}

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

      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <div className="card entrance-card flex items-center justify-center gap-3 p-8 text-sm font-medium text-muted">
              <Clock3 className="h-5 w-5 text-primary" />
              <span>No events awaiting approval.</span>
            </div>
          ) : (
            pendingApprovals.map((event) => (
              <div key={event.id} className="card entrance-card overflow-hidden">
                {event.banner_url && (
                  <img
                    src={toAssetUrl(event.banner_url)}
                    alt={event.title}
                    className="h-48 w-full object-cover"
                  />
                )}
                <div className="space-y-4 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-ink">{event.title}</h3>
                      <p className="mt-1 text-sm text-muted">Organizer: {event.organizer_name}</p>
                    </div>
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase text-accent">
                      {event.category_name || 'Uncategorized'}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted">{event.description}</p>
                  <div className="grid grid-cols-1 gap-3 text-sm text-muted md:grid-cols-3">
                    <div><span className="font-semibold text-ink">Starts:</span> {new Date(event.start_date).toLocaleString()}</div>
                    <div><span className="font-semibold text-ink">Type:</span> {event.type}</div>
                    <div><span className="font-semibold text-ink">Capacity:</span> {event.capacity}</div>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button onClick={() => handleApproveEvent(event.id)} className="inline-flex items-center gap-2 rounded-2xl bg-success px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-success/90">
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                    <button onClick={() => handleRejectEvent(event.id)} className="inline-flex items-center gap-2 rounded-2xl bg-danger px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-danger/90">
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
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
