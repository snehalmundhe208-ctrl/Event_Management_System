import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { BarChart3, Download, Users, CheckSquare, ScanLine, ListCollapse } from 'lucide-react';

export default function OrganizerDashboard() {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [stats, setStats] = useState(null);
  const [registrants, setRegistrants] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  const isAdmin = user?.roles?.includes('admin');

  const fetchOrganizerEvents = async () => {
    try {
      const params = { status: 'all' };
      // Organizers only see their own events; admins see all events
      if (!isAdmin && user?.id) {
        params.organizerId = user.id;
      }
      const res = await api.get('/events', { params });
      setEvents(res.data);
      if (res.data.length > 0) {
        setSelectedEventId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventStatsAndDetails = async (eventId) => {
    if (!eventId) return;
    setStatsLoading(true);
    try {
      const statsRes = await api.get(`/dashboard/event/${eventId}`);
      setStats(statsRes.data);

      const regRes = await api.get(`/registrations/event/${eventId}`);
      setRegistrants(regRes.data);

      const checkRes = await api.get(`/checkin/event/${eventId}`);
      setCheckIns(checkRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrganizerEvents();
    }
  }, [user]);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventStatsAndDetails(selectedEventId);
    }
  }, [selectedEventId]);

  const handleExportCsv = async () => {
    if (!selectedEventId) return;
    try {
      const res = await api.get(`/dashboard/event/${selectedEventId}/export-csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `registrants-${selectedEventId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('CSV Export failed.');
    }
  };

  if (loading) {
    return <div className="page-shell flex min-h-[50vh] items-center justify-center py-16"><div className="card px-8 py-6 text-center"><div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-primary/15 border-t-primary" /><p className="text-sm font-medium text-muted">Loading dashboard…</p></div></div>;
  }

  return (
    <div className="page-shell py-8 sm:py-10 fade-in-section">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Organizer dashboard</h1>
          <p className="page-subtitle">Track registrations, monitor capacity, and keep check-ins moving smoothly.</p>
        </div>
        {selectedEventId && (
          <Link to={`/checkin/${selectedEventId}`} className="btn-primary flex items-center gap-2 self-start">
            <ScanLine className="h-5 w-5" />
            <span>Launch check-in scanner</span>
          </Link>
        )}
      </div>

      <div className="card mb-8 p-5 sm:p-6 entrance-card">
        <label className="label-base">Select event to manage</label>
        <select className="select-base max-w-xl" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title} ({e.status})</option>)}
        </select>
      </div>

      {statsLoading ? (
        <div className="card flex min-h-[220px] items-center justify-center text-sm font-medium text-muted animate-pulse">Updating dashboard stats…</div>
      ) : stats ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="stat-card p-6">
              <div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Total registrants</span><Users className="h-6 w-6 text-primary" /></div>
              <div className="text-3xl font-semibold text-ink">{stats.registrationCount}</div>
            </div>
            <div className="stat-card p-6">
              <div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Confirmed seats</span><CheckSquare className="h-6 w-6 text-success" /></div>
              <div className="text-3xl font-semibold text-ink">{stats.confirmedCount}</div>
            </div>
            <div className="stat-card p-6">
              <div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Waitlist</span><ListCollapse className="h-6 w-6 text-accent" /></div>
              <div className="text-3xl font-semibold text-ink">{stats.waitlistCount}</div>
            </div>
            <div className="stat-card p-6">
              <div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Checked in</span><ScanLine className="h-6 w-6 text-primary" /></div>
              <div className="text-3xl font-semibold text-ink">{stats.checkInCount}</div>
            </div>
          </div>

          <div className="card entrance-card p-6">
            <div className="mb-6 flex items-center justify-between"><h3 className="text-lg font-semibold text-ink">Capacity fill</h3><span className="text-lg font-semibold text-primary">{stats.capacityFillPercentage}%</span></div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-bg-soft"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${Math.min(stats.capacityFillPercentage, 100)}%` }} /></div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="card entrance-card p-6">
              <div className="mb-6 flex items-center justify-between"><h3 className="text-lg font-semibold text-ink">Attendee list</h3><button onClick={handleExportCsv} className="btn-outline flex items-center gap-2 text-xs"> <Download className="h-4 w-4" /><span>Export CSV</span></button></div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-muted">
                  <thead className="bg-bg-soft text-xs uppercase tracking-[0.2em] text-muted"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th></tr></thead>
                  <tbody className="divide-y divide-border/40">
                    {registrants.length === 0 ? <tr><td colSpan="3" className="px-4 py-6 text-center text-muted">No attendees yet.</td></tr> : registrants.map((reg) => (<React.Fragment key={reg.id}><tr><td className="px-4 py-3 font-semibold text-ink">{reg.user_name}</td><td className="px-4 py-3">{reg.user_email}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${reg.status === 'confirmed' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'}`}>{reg.status}</span></td></tr>{reg.members && reg.members.map((m, idx) => (<tr key={`${reg.id}-m-${idx}`} className="bg-bg-soft/70"><td className="px-6 py-2 text-xs text-muted">+ {m.name}</td><td className="px-4 py-2 text-xs text-muted">{m.email}</td><td className="px-4 py-2 text-xs text-muted">Guest</td></tr>))}</React.Fragment>))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card entrance-card p-6">
              <h3 className="mb-6 text-lg font-semibold text-ink">Recent check-ins</h3>
              <div className="max-h-96 overflow-y-auto">
                <ul className="divide-y divide-border/40">
                  {checkIns.length === 0 ? <li className="py-6 text-center text-sm text-muted">No check-ins yet.</li> : checkIns.map((ci) => (<li key={ci.id} className="flex items-center justify-between py-3"><div><p className="font-semibold text-ink">{ci.attendee_name}</p><p className="text-xs text-muted">Code: {ci.ticket_code}</p></div><div className="text-right"><p className="text-xs text-muted">{new Date(ci.scanned_at).toLocaleTimeString()}</p><p className="text-[10px] text-muted/70">Scanner: {ci.scanner_name || 'Admin'}</p></div></li>))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card flex min-h-[220px] items-center justify-center text-sm font-medium text-muted">Select or create an event to view metrics.</div>
      )}
    </div>
  );
}
