import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { toAssetUrl } from '../utils/assets';
import PieChart from '../components/PieChart';
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Clock3,
  Download,
  ExternalLink,
  Heart,
  ImagePlus,
  ListCollapse,
  MessageSquare,
  Pause,
  Play,
  ScanLine,
  Star,
  Users,
  XCircle
} from 'lucide-react';

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default function OrganizerDashboard() {
  const { user } = useContext(AuthContext);
  const [dashboard, setDashboard] = useState({
    attendedEvents: [],
    following: [],
    comments: [],
    reviews: []
  });
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [stats, setStats] = useState(null);
  const [registrants, setRegistrants] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [platformEvents, setPlatformEvents] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState('analytics');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);

  const isAdmin = user?.roles?.includes('admin');
  const canManage = user?.roles?.some((role) => ['organizer', 'admin'].includes(role));

  const reviewedEventIds = useMemo(
    () => new Set(dashboard.reviews.map((review) => review.event_id)),
    [dashboard.reviews]
  );

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const fetchAnalytics = useCallback(async () => {
    if (!isAdmin) return null;
    const res = await api.get('/admin/analytics');
    setAnalytics(res.data);
    return res.data;
  }, [isAdmin]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return [];
    const res = await api.get('/admin/users', { params: { search: userSearch } });
    setUsers(res.data);
    return res.data;
  }, [isAdmin, userSearch]);

  const fetchPlatformEvents = useCallback(async () => {
    if (!isAdmin) return [];
    const res = await api.get('/admin/events', { params: { search: eventSearch } });
    setPlatformEvents(res.data);
    return res.data;
  }, [eventSearch, isAdmin]);

  const fetchPendingApprovals = useCallback(async () => {
    if (!isAdmin) return [];
    const res = await api.get('/admin/events/pending-approvals');
    setPendingApprovals(res.data);
    return res.data;
  }, [isAdmin]);

  const fetchDashboard = useCallback(async () => {
    const res = await api.get('/dashboard/me');
    setDashboard(res.data);
    return res.data;
  }, []);

  const fetchManagedEvents = useCallback(async () => {
    if (!canManage) {
      setEvents([]);
      setSelectedEventId('');
      return [];
    }

    const params = { status: 'all' };
    if (!isAdmin && user?.id) {
      params.organizerId = user.id;
    }

    const res = await api.get('/events', { params });
    setEvents(res.data);
    setSelectedEventId((current) => current || res.data[0]?.id || '');
    return res.data;
  }, [canManage, isAdmin, user?.id]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [fetchDashboard(), fetchManagedEvents()];

      if (isAdmin) {
        requests.push(fetchAnalytics(), fetchUsers(), fetchPlatformEvents(), fetchPendingApprovals());
      }

      await Promise.all(requests);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchAnalytics, fetchDashboard, fetchManagedEvents, fetchPendingApprovals, fetchPlatformEvents, fetchUsers, isAdmin]);

  useEffect(() => {
    if (!user) return;
    void loadPage();
  }, [loadPage, user]);

  useEffect(() => {
    if (!isAdmin) return;
    void fetchUsers();
  }, [fetchUsers, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    void fetchPlatformEvents();
  }, [fetchPlatformEvents, isAdmin]);

  useEffect(() => {
    if (!canManage || !selectedEventId) return;

    let cancelled = false;

    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const [statsRes, regRes, checkRes] = await Promise.all([
          api.get(`/dashboard/event/${selectedEventId}`),
          api.get(`/registrations/event/${selectedEventId}`),
          api.get(`/checkin/event/${selectedEventId}`)
        ]);

        if (cancelled) return;

        setStats(statsRes.data);
        setRegistrants(regRes.data);
        setCheckIns(checkRes.data);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setStats(null);
          setRegistrants([]);
          setCheckIns([]);
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    };

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [canManage, selectedEventId]);

  const handleExportCsv = async () => {
    if (!selectedEventId) return;

    try {
      const res = await api.get(`/dashboard/event/${selectedEventId}/export-csv`, { responseType: 'blob' });
      downloadBlob(new Blob([res.data]), `registrants-${selectedEventId}.csv`);
    } catch {
      alert('CSV export failed.');
    }
  };

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!selectedEventId || files.length === 0) return;

    setGalleryUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('photos', file));
      await api.post(`/events/${selectedEventId}/gallery`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      event.target.value = '';
      alert('Gallery updated.');
    } catch (err) {
      alert(err.response?.data?.message || 'Gallery upload failed.');
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleToggleUserSuspension = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'reactivate' : 'suspend'} this user?`)) return;

    try {
      await api.put(`/admin/users/${userId}/status`, { isSuspended: !currentStatus });
      await Promise.all([fetchUsers(), fetchAnalytics()]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleForceCancelEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to force-cancel this event? This will alert all attendees.')) return;

    try {
      await api.post(`/admin/events/${eventId}/force-cancel`);
      await Promise.all([fetchPlatformEvents(), fetchAnalytics()]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to force-cancel event');
    }
  };

  const handleApproveEvent = async (eventId) => {
    try {
      await api.post(`/admin/events/${eventId}/approve`);
      await Promise.all([fetchPendingApprovals(), fetchPlatformEvents(), fetchAnalytics(), fetchManagedEvents()]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve event');
    }
  };

  const handleRejectEvent = async (eventId) => {
    const reason = window.prompt('Rejection reason (optional):', '');
    if (reason === null) return;

    try {
      await api.post(`/admin/events/${eventId}/reject`, { reason });
      await Promise.all([fetchPendingApprovals(), fetchPlatformEvents(), fetchAnalytics(), fetchManagedEvents()]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject event');
    }
  };

  if (loading) {
    return <div className="page-shell flex min-h-[50vh] items-center justify-center py-16"><div className="card px-8 py-6 text-center"><div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-primary/15 border-t-primary" /><p className="text-sm font-medium text-muted">Loading dashboard…</p></div></div>;
  }

  return (
    <div className="page-shell py-8 sm:py-10 fade-in-section">
      <div className="mb-8">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          {isAdmin ? 'Personal activity, organizer tools, and full platform control in one place.' : 'Your activity, reviews, follows, and event tools in one place.'}
        </p>
      </div>

      {isAdmin && analytics && (
        (() => {
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
            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <PieChart title="Events by status" data={eventsByStatus} centerLabel="Events" centerValue={analytics.totalEvents} />
              <PieChart title="Users by role" data={usersByRole} centerLabel="Users" centerValue={analytics.totalUsers} />
              <PieChart title="Bookings (last 30d)" data={bookingsBuckets} centerLabel="Bookings" centerValue={analytics.totalRegistrations} />
            </div>
          );
        })()
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card p-6">
          <div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Attended</span><CheckSquare className="h-6 w-6 text-success" /></div>
          <div className="text-3xl font-semibold text-ink">{dashboard.attendedEvents.length}</div>
        </div>
        <div className="stat-card p-6">
          <div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Following</span><Heart className="h-6 w-6 text-danger" /></div>
          <div className="text-3xl font-semibold text-ink">{dashboard.following.length}</div>
        </div>
        <div className="stat-card p-6">
          <div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Comments</span><MessageSquare className="h-6 w-6 text-primary" /></div>
          <div className="text-3xl font-semibold text-ink">{dashboard.comments.length}</div>
        </div>
        <div className="stat-card p-6">
          <div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Reviews</span><Star className="h-6 w-6 text-accent" /></div>
          <div className="text-3xl font-semibold text-ink">{dashboard.reviews.length}</div>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-10">
          <div className="mb-8 flex flex-wrap gap-3 border-b border-border/60 pb-4">
            {['analytics', 'pending', 'users', 'events'].map((tab) => (
              <button key={tab} onClick={() => setActiveAdminTab(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition-all duration-300 ${activeAdminTab === tab ? 'bg-primary text-white shadow-[0_12px_28px_-16px_rgba(93,56,145,0.78)]' : 'bg-bg-soft text-muted hover:bg-primary/8 hover:text-primary hover:-translate-y-0.5'}`}>{tab}</button>
            ))}
          </div>

          {activeAdminTab === 'analytics' && analytics && (
            <div className="card entrance-card p-6 text-sm text-muted">
              Real platform counts are loaded above. Use the tabs to manage pending approvals, users, and events.
            </div>
          )}

          {activeAdminTab === 'users' && (
            <div className="card entrance-card p-6">
              <div className="mb-4 max-w-md rounded-2xl border border-border bg-bg-soft px-4 py-2.5 transition-all duration-300 focus-within:-translate-y-0.5 focus-within:border-primary/35 focus-within:bg-surface focus-within:ring-4 focus-within:ring-primary/10">
                <input type="text" placeholder="Search users by name or email..." className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted/70" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-muted">
                  <thead className="bg-bg-soft text-xs uppercase tracking-[0.2em] text-muted">
                    <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Roles</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {users.map((platformUser) => (
                      <tr key={platformUser.id}>
                        <td className="px-4 py-3 font-semibold text-ink">{platformUser.name}</td>
                        <td className="px-4 py-3">{platformUser.email}</td>
                        <td className="px-4 py-3">{platformUser.roles.join(', ')}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${platformUser.is_suspended ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>{platformUser.is_suspended ? 'Suspended' : 'Active'}</span></td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleToggleUserSuspension(platformUser.id, platformUser.is_suspended)} className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 ${platformUser.is_suspended ? 'bg-success/10 text-success hover:bg-success/15' : 'bg-danger/10 text-danger hover:bg-danger/15'}`}>
                            {platformUser.is_suspended ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                            <span>{platformUser.is_suspended ? 'Reactivate' : 'Suspend'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeAdminTab === 'pending' && (
            <div className="space-y-4">
              {pendingApprovals.length === 0 ? (
                <div className="card entrance-card flex items-center justify-center gap-3 p-8 text-sm font-medium text-muted">
                  <Clock3 className="h-5 w-5 text-primary" />
                  <span>No events awaiting approval.</span>
                </div>
              ) : (
                pendingApprovals.map((event) => (
                  <div key={event.id} className="card entrance-card overflow-hidden">
                    {event.banner_url && <img src={toAssetUrl(event.banner_url)} alt={event.title} className="h-48 w-full object-cover" />}
                    <div className="space-y-4 p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-bold text-ink">{event.title}</h3>
                          <p className="mt-1 text-sm text-muted">Organizer: {event.organizer_name}</p>
                        </div>
                        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase text-accent">{event.category_name || 'Uncategorized'}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-muted">{event.description}</p>
                      <div className="grid grid-cols-1 gap-3 text-sm text-muted md:grid-cols-3">
                        <div><span className="font-semibold text-ink">Starts:</span> {new Date(event.start_date).toLocaleString()}</div>
                        <div><span className="font-semibold text-ink">Type:</span> {event.type}</div>
                        <div><span className="font-semibold text-ink">Capacity:</span> {event.capacity}</div>
                      </div>
                      <div className="flex flex-wrap gap-3 pt-2">
                        <button onClick={() => handleApproveEvent(event.id)} className="inline-flex items-center gap-2 rounded-2xl bg-success px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-success/90"><CheckCircle2 className="h-4 w-4" /><span>Approve</span></button>
                        <button onClick={() => handleRejectEvent(event.id)} className="inline-flex items-center gap-2 rounded-2xl bg-danger px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-danger/90"><XCircle className="h-4 w-4" /><span>Reject</span></button>
                        <Link to={`/event/${event.id}`} className="btn-outline text-sm">Open</Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeAdminTab === 'events' && (
            <div className="card entrance-card p-6">
              <div className="mb-4 max-w-md rounded-2xl border border-border bg-bg-soft px-4 py-2.5 transition-all duration-300 focus-within:-translate-y-0.5 focus-within:border-primary/35 focus-within:bg-surface focus-within:ring-4 focus-within:ring-primary/10">
                <input type="text" placeholder="Search events by title or description..." className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted/70" value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-muted">
                  <thead className="bg-bg-soft text-xs uppercase tracking-[0.2em] text-muted">
                    <tr><th className="px-4 py-3">Event title</th><th className="px-4 py-3">Organizer</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {platformEvents.map((platformEvent) => (
                      <tr key={platformEvent.id}>
                        <td className="px-4 py-3 font-semibold text-ink">{platformEvent.title}</td>
                        <td className="px-4 py-3">{platformEvent.organizer_name}</td>
                        <td className="px-4 py-3">{platformEvent.category_name || 'None'}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${platformEvent.status === 'cancelled' ? 'bg-danger/10 text-danger' : platformEvent.status === 'completed' ? 'bg-bg-soft text-muted' : 'bg-success/10 text-success'}`}>{platformEvent.status}</span></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Link to={`/event/${platformEvent.id}`} className="btn-outline text-xs">Open</Link>
                            {platformEvent.status !== 'cancelled' && platformEvent.status !== 'completed' && (
                              <button onClick={() => handleForceCancelEvent(platformEvent.id)} className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition-all duration-300 hover:-translate-y-0.5 hover:bg-danger/15"><AlertTriangle className="h-3.5 w-3.5" /><span>Force-cancel</span></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="card entrance-card p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">Events attended</h3>
            <Link to="/events" className="btn-outline text-xs">Browse events</Link>
          </div>
          <div className="space-y-4">
            {dashboard.attendedEvents.length === 0 ? (
              <div className="rounded-2xl bg-bg-soft px-4 py-8 text-center text-sm text-muted">No attended events yet.</div>
            ) : (
              dashboard.attendedEvents.map((event) => {
                const hasEnded = event.end_date ? new Date(event.end_date).getTime() <= Date.now() : event.status === 'completed';

                return (
                  <div key={event.id} className="overflow-hidden rounded-[24px] border border-border bg-surface">
                    {event.banner_url && <img src={toAssetUrl(event.banner_url)} alt={event.title} className="h-40 w-full object-cover" />}
                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-ink">{event.title}</h4>
                          <p className="text-xs text-muted">Organizer: {event.organizer_name}</p>
                        </div>
                        <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">{event.status}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/event/${event.id}`} className="btn-outline text-xs">Open event</Link>
                        <Link to={`/gallery/${event.id}`} className="btn-outline text-xs">Gallery</Link>
                        {hasEnded && !reviewedEventIds.has(event.id) && (
                          <Link to={`/feedback/${event.id}`} className="btn-primary text-xs">Leave review</Link>
                        )}
                        {hasEnded && reviewedEventIds.has(event.id) && (
                          <span className="rounded-full bg-bg-soft px-3 py-2 text-xs font-semibold text-muted">Reviewed</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card entrance-card p-6">
          <h3 className="mb-6 text-lg font-semibold text-ink">Following</h3>
          <div className="space-y-4">
            {dashboard.following.length === 0 ? (
              <div className="rounded-2xl bg-bg-soft px-4 py-8 text-center text-sm text-muted">You are not following anyone yet.</div>
            ) : (
              dashboard.following.map((person) => (
                <div key={person.id} className="flex items-center justify-between rounded-[22px] border border-border px-4 py-3">
                  <div>
                    <p className="font-semibold text-ink">{person.name}</p>
                    <p className="text-xs text-muted">{person.roles.join(', ')} · {person.event_count} events</p>
                  </div>
                  <span className="text-xs font-semibold text-primary">{new Date(person.created_at).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card entrance-card p-6">
          <h3 className="mb-6 text-lg font-semibold text-ink">Comments & interactions</h3>
          <div className="space-y-4">
            {dashboard.comments.length === 0 ? (
              <div className="rounded-2xl bg-bg-soft px-4 py-8 text-center text-sm text-muted">No comments yet.</div>
            ) : (
              dashboard.comments.map((comment) => (
                <div key={comment.id} className="rounded-[22px] border border-border p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Link to={`/event/${comment.event_id}`} className="font-semibold text-ink hover:text-primary">{comment.event_title}</Link>
                    <span className="text-xs text-muted">{new Date(comment.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-muted">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card entrance-card p-6">
          <h3 className="mb-6 text-lg font-semibold text-ink">Reviews given</h3>
          <div className="space-y-4">
            {dashboard.reviews.length === 0 ? (
              <div className="rounded-2xl bg-bg-soft px-4 py-8 text-center text-sm text-muted">No reviews yet.</div>
            ) : (
              dashboard.reviews.map((review) => (
                <div key={review.id} className="rounded-[22px] border border-border p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Link to={`/event/${review.event_id}`} className="font-semibold text-ink hover:text-primary">{review.event_title}</Link>
                    <div className="flex items-center gap-1 text-accent">
                      {[...Array(5)].map((_, index) => (
                        <Star key={index} className={`h-4 w-4 ${index < review.rating ? 'fill-current' : ''}`} />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-muted">{review.comment}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {canManage && (
        <div className="mt-10 space-y-8">
          <div className="mb-2">
            <h2 className="text-2xl font-bold text-ink">Organizer / admin tools</h2>
          </div>

          <div className="card entrance-card p-5 sm:p-6">
            <label className="label-base">Select event to manage</label>
            <select className="select-base max-w-xl" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
              {events.map((event) => <option key={event.id} value={event.id}>{event.title} ({event.status})</option>)}
            </select>
            {selectedEvent && (
              <div className="mt-4 flex flex-wrap gap-3">
                {selectedEvent.status === 'published' ? (
                  <Link to={`/checkin/${selectedEvent.id}`} className="btn-primary flex items-center gap-2 text-sm"><ScanLine className="h-4 w-4" /><span>Scan tickets</span></Link>
                ) : (
                  <button type="button" disabled className="btn-outline flex items-center gap-2 text-sm opacity-60 cursor-not-allowed"><ScanLine className="h-4 w-4" /><span>Scan tickets</span></button>
                )}
                <Link to={`/event/${selectedEvent.id}`} className="btn-outline flex items-center gap-2 text-sm"><ExternalLink className="h-4 w-4" /><span>Open event</span></Link>
                <Link to={`/gallery/${selectedEvent.id}`} className="btn-outline text-sm">Open gallery</Link>
                <label className="btn-outline flex cursor-pointer items-center gap-2 text-sm">
                  <ImagePlus className="h-4 w-4" />
                  <span>{galleryUploading ? 'Uploading...' : 'Add gallery photos'}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} disabled={galleryUploading} />
                </label>
                {(selectedEvent.status === 'completed' || new Date(selectedEvent.end_date).getTime() <= Date.now()) && !reviewedEventIds.has(selectedEvent.id) && (
                  <Link to={`/feedback/${selectedEvent.id}`} className="btn-outline text-sm">Submit review</Link>
                )}
              </div>
            )}
          </div>

          {statsLoading ? (
            <div className="card flex min-h-[220px] items-center justify-center text-sm font-medium text-muted animate-pulse">Updating event tools…</div>
          ) : stats ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="stat-card p-6"><div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Registrants</span><Users className="h-6 w-6 text-primary" /></div><div className="text-3xl font-semibold text-ink">{stats.registrationCount}</div></div>
                <div className="stat-card p-6"><div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Confirmed</span><CheckSquare className="h-6 w-6 text-success" /></div><div className="text-3xl font-semibold text-ink">{stats.confirmedCount}</div></div>
                <div className="stat-card p-6"><div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Waitlist</span><ListCollapse className="h-6 w-6 text-accent" /></div><div className="text-3xl font-semibold text-ink">{stats.waitlistCount}</div></div>
                <div className="stat-card p-6"><div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Checked in</span><ScanLine className="h-6 w-6 text-primary" /></div><div className="text-3xl font-semibold text-ink">{stats.checkInCount}</div></div>
              </div>

              <div className="card entrance-card p-6">
                <div className="mb-6 flex items-center justify-between"><h3 className="text-lg font-semibold text-ink">Capacity fill</h3><span className="text-lg font-semibold text-primary">{stats.capacityFillPercentage}%</span></div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-bg-soft"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${Math.min(stats.capacityFillPercentage, 100)}%` }} /></div>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="card entrance-card p-6">
                  <div className="mb-6 flex items-center justify-between"><h3 className="text-lg font-semibold text-ink">Attendee list</h3><button onClick={handleExportCsv} className="btn-outline flex items-center gap-2 text-xs"><Download className="h-4 w-4" /><span>Export CSV</span></button></div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-muted">
                      <thead className="bg-bg-soft text-xs uppercase tracking-[0.2em] text-muted"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th></tr></thead>
                      <tbody className="divide-y divide-border/40">
                        {registrants.length === 0 ? <tr><td colSpan="3" className="px-4 py-6 text-center text-muted">No attendees yet.</td></tr> : registrants.map((reg) => (<React.Fragment key={reg.id}><tr><td className="px-4 py-3 font-semibold text-ink">{reg.user_name}</td><td className="px-4 py-3">{reg.user_email}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${reg.status === 'confirmed' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'}`}>{reg.status}</span></td></tr>{reg.members && reg.members.map((member, index) => (<tr key={`${reg.id}-m-${index}`} className="bg-bg-soft/70"><td className="px-6 py-2 text-xs text-muted">+ {member.name}</td><td className="px-4 py-2 text-xs text-muted">{member.email}</td><td className="px-4 py-2 text-xs text-muted">Guest</td></tr>))}</React.Fragment>))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card entrance-card p-6">
                  <h3 className="mb-6 text-lg font-semibold text-ink">Recent check-ins</h3>
                  <div className="max-h-96 overflow-y-auto">
                    <ul className="divide-y divide-border/40">
                      {checkIns.length === 0 ? <li className="py-6 text-center text-sm text-muted">No check-ins yet.</li> : checkIns.map((checkIn) => (<li key={checkIn.id} className="flex items-center justify-between py-3"><div><p className="font-semibold text-ink">{checkIn.attendee_name}</p><p className="text-xs text-muted">Code: {checkIn.ticket_code}</p></div><div className="text-right"><p className="text-xs text-muted">{new Date(checkIn.scanned_at).toLocaleTimeString()}</p><p className="text-[10px] text-muted/70">Scanner: {checkIn.scanner_name || 'Admin'}</p></div></li>))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card flex min-h-[220px] items-center justify-center text-sm font-medium text-muted">Select an event to view management tools.</div>
          )}
        </div>
      )}
    </div>
  );
}
