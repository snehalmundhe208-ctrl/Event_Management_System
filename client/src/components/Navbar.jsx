import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Bell, LogOut, User as UserIcon, Menu, X, Sparkles } from 'lucide-react';
import api from '../api';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
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

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="page-shell">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3" onClick={closeMenu}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-900">EventSphere</p>
              <p className="text-xs text-slate-500">Premium event operations</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/" className="text-sm font-medium text-slate-600 transition hover:text-indigo-600">Home</Link>
            <Link to="/events" className="text-sm font-medium text-slate-600 transition hover:text-indigo-600">Events</Link>
            {user && !isOrganizer && !isAdmin && <Link to="/tickets" className="text-sm font-medium text-slate-600 transition hover:text-indigo-600">My Tickets</Link>}
            {user && isOrganizer && !isAdmin && <Link to="/dashboard" className="text-sm font-medium text-slate-600 transition hover:text-indigo-600">Organizer Dashboard</Link>}
            {user && isAdmin && <Link to="/admin" className="text-sm font-medium text-slate-600 transition hover:text-indigo-600">Admin Panel</Link>}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setShowNotifications((prev) => !prev)}
                    className="relative rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Notifications</div>
                      <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-4 text-center text-sm text-slate-500">No notifications yet.</div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => !n.is_read && markAsRead(n.id)}
                              className={`cursor-pointer px-4 py-3 text-sm transition ${n.is_read ? 'bg-white text-slate-600' : 'bg-indigo-50 text-indigo-900'}`}
                            >
                              <p className="line-clamp-2">{n.message}</p>
                              <span className="mt-1 block text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex">
                  <UserIcon className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">{user.name}</span>
                  <button onClick={handleLogout} className="rounded-full p-1.5 text-slate-500 transition hover:bg-white hover:text-rose-500" aria-label="Logout">
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="hidden items-center gap-3 sm:flex">
                <Link to="/login" className="text-sm font-medium text-slate-600 transition hover:text-indigo-600">Login</Link>
                <Link to="/signup" className="btn-primary">Sign Up</Link>
              </div>
            )}

            <button className="rounded-2xl p-2 text-slate-600 transition hover:bg-slate-100 md:hidden" onClick={() => setMobileMenuOpen((prev) => !prev)} aria-label="Toggle navigation">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg md:hidden">
            <div className="flex flex-col gap-3">
              <Link to="/" onClick={closeMenu} className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-indigo-600">Home</Link>
              <Link to="/events" onClick={closeMenu} className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-indigo-600">Events</Link>
              {user && !isOrganizer && !isAdmin && <Link to="/tickets" onClick={closeMenu} className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-indigo-600">My Tickets</Link>}
              {user && isOrganizer && !isAdmin && <Link to="/dashboard" onClick={closeMenu} className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-indigo-600">Organizer Dashboard</Link>}
              {user && isAdmin && <Link to="/admin" onClick={closeMenu} className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-indigo-600">Admin Panel</Link>}
              {!user ? (
                <div className="flex gap-2 pt-2">
                  <Link to="/login" onClick={closeMenu} className="btn-outline w-full justify-center">Login</Link>
                  <Link to="/signup" onClick={closeMenu} className="btn-primary w-full justify-center">Sign Up</Link>
                </div>
              ) : (
                <button onClick={() => { handleLogout(); closeMenu(); }} className="btn-outline w-full justify-center">Logout</button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
