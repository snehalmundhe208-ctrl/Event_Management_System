import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Bell, LogOut, User as UserIcon } from 'lucide-react';
import api from '../api';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isOrganizer = user?.roles?.includes('organizer');
  const isAdmin = user?.roles?.includes('admin');

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-indigo-600 tracking-wide">
              EventSphere
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link to="/" className="text-gray-600 hover:text-indigo-600 font-medium">Home</Link>
              <Link to="/events" className="text-gray-600 hover:text-indigo-600 font-medium">Events</Link>
              {user && !isOrganizer && !isAdmin && (
                <Link to="/tickets" className="text-gray-600 hover:text-indigo-600 font-medium">My Tickets</Link>
              )}
              {user && isOrganizer && !isAdmin && (
                <Link to="/dashboard" className="text-gray-600 hover:text-indigo-600 font-medium">Organizer Dashboard</Link>
              )}
              {user && isAdmin && (
                <Link to="/admin" className="text-gray-600 hover:text-indigo-600 font-medium">Admin Panel</Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-500 relative"
                  >
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 block h-4 w-4 rounded-full ring-2 ring-white bg-red-500 text-white text-xs font-bold text-center leading-4">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden z-50">
                      <div className="px-4 py-2 border-b border-gray-100 font-semibold text-gray-700 bg-gray-50">
                        Notifications
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">No notifications</div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => !n.is_read && markAsRead(n.id)}
                              className={`px-4 py-3 text-sm cursor-pointer transition-colors ${
                                n.is_read ? 'bg-white text-gray-600' : 'bg-indigo-50 text-indigo-900 font-medium'
                              }`}
                            >
                              <p className="line-clamp-2">{n.message}</p>
                              <span className="text-xs text-gray-400 block mt-1">
                                {new Date(n.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 border-l pl-4 border-gray-200">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                  <button
                    onClick={handleLogout}
                    className="p-1 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="space-x-4">
                <Link to="/login" className="text-gray-600 hover:text-indigo-600 font-medium">Login</Link>
                <Link to="/signup" className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 transition-colors">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
