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
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Organizer Dashboard</h1>
          <p className="mt-2 text-gray-600">Track registrations, manage capacity, and execute attendee check-ins.</p>
        </div>
        {selectedEventId && (
          <Link
            to={`/checkin/${selectedEventId}`}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
          >
            <ScanLine className="h-5 w-5" />
            <span>Launch Check-in Scanner</span>
          </Link>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Event to Manage</label>
        <select
          className="w-full md:max-w-md border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} ({e.status})
            </option>
          ))}
        </select>
      </div>

      {statsLoading ? (
        <div className="text-center py-12 text-gray-500">Updating dashboard stats...</div>
      ) : stats ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-500 uppercase">Total Registrants</span>
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.registrationCount}</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-500 uppercase">Confirmed Seats</span>
                <CheckSquare className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.confirmedCount}</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-500 uppercase">Waitlist size</span>
                <ListCollapse className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.waitlistCount}</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-500 uppercase">Checked In</span>
                <ScanLine className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.checkInCount}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between border-b pb-4 border-gray-100 mb-6">
              <h3 className="text-lg font-bold text-gray-900">Capacity Fill Percentage</h3>
              <span className="text-indigo-600 font-bold">{stats.capacityFillPercentage}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.capacityFillPercentage, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">Attendee List</h3>
                <button
                  onClick={handleExportCsv}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {registrants.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-4 py-4 text-center text-gray-400">No attendees yet.</td>
                      </tr>
                    ) : (
                      registrants.map((reg) => (
                        <React.Fragment key={reg.id}>
                          <tr>
                            <td className="px-4 py-3 font-semibold text-gray-800">{reg.user_name}</td>
                            <td className="px-4 py-3">{reg.user_email}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                reg.status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                              }`}>{reg.status}</span>
                            </td>
                          </tr>
                          {reg.members && reg.members.map((m, idx) => (
                            <tr key={`${reg.id}-m-${idx}`} className="bg-gray-50/50">
                              <td className="px-6 py-2 text-xs text-gray-600">+ {m.name}</td>
                              <td className="px-4 py-2 text-xs text-gray-600">{m.email}</td>
                              <td className="px-4 py-2 text-xs text-gray-600">Guest</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Check-Ins</h3>
              <div className="overflow-y-auto max-h-96">
                <ul className="divide-y divide-gray-100">
                  {checkIns.length === 0 ? (
                    <li className="py-4 text-center text-gray-400 text-sm">No check-ins yet.</li>
                  ) : (
                    checkIns.map((ci) => (
                      <li key={ci.id} className="py-3 flex justify-between items-center text-sm">
                        <div>
                          <p className="font-semibold text-gray-800">{ci.attendee_name}</p>
                          <p className="text-xs text-gray-400">Code: {ci.ticket_code}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{new Date(ci.scanned_at).toLocaleTimeString()}</p>
                          <p className="text-[10px] text-gray-400">Scanner: {ci.scanner_name || 'Admin'}</p>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">Select or create an event to see metrics.</div>
      )}
    </div>
  );
}
