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
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">Loading admin panel...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center">
          <Shield className="h-8 w-8 text-indigo-600 mr-2" />
          Admin Control Center
        </h1>
        <p className="mt-2 text-gray-600">Platform-wide oversight, user access management, and force-cancellation controls.</p>
      </div>

      <div className="flex border-b border-gray-200 mb-8 space-x-6">
        {['analytics', 'users', 'events'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-semibold capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-500 uppercase">Total Accounts</span>
                <div className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalUsers}</div>
              </div>
              <Users className="h-10 w-10 text-indigo-500" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-500 uppercase">Total Events Created</span>
                <div className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalEvents}</div>
              </div>
              <Calendar className="h-10 w-10 text-green-500" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-500 uppercase">Total Bookings</span>
                <div className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalRegistrations}</div>
              </div>
              <Shield className="h-10 w-10 text-yellow-500" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex bg-gray-100 px-4 py-2 rounded-md max-w-md">
            <input
              type="text"
              placeholder="Search users by name or email..."
              className="bg-transparent border-none outline-none w-full text-sm text-gray-700 placeholder-gray-500"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Roles</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{u.name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.roles.join(', ')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        u.is_suspended ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                      }`}>{u.is_suspended ? 'Suspended' : 'Active'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleUserSuspension(u.id, u.is_suspended)}
                        className={`flex items-center space-x-1 ml-auto text-xs font-semibold px-2 py-1 rounded transition-colors ${
                          u.is_suspended
                            ? 'bg-green-50 hover:bg-green-100 text-green-600'
                            : 'bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                      >
                        {u.is_suspended ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        <span>{u.is_suspended ? 'Reactivate' : 'Suspend'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex bg-gray-100 px-4 py-2 rounded-md max-w-md">
            <input
              type="text"
              placeholder="Search events by title or description..."
              className="bg-transparent border-none outline-none w-full text-sm text-gray-700 placeholder-gray-500"
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-2">Event Title</th>
                  <th className="px-4 py-2">Organizer</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{ev.title}</td>
                    <td className="px-4 py-3">{ev.organizer_name}</td>
                    <td className="px-4 py-3">{ev.category_name || 'None'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        ev.status === 'cancelled'
                          ? 'bg-red-50 text-red-700'
                          : ev.status === 'completed'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-green-50 text-green-700'
                      }`}>{ev.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {ev.status !== 'cancelled' && ev.status !== 'completed' && (
                        <button
                          onClick={() => handleForceCancelEvent(ev.id)}
                          className="flex items-center space-x-1 ml-auto text-xs font-semibold px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Force-Cancel</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
