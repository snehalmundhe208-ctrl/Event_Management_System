import { useContext, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Bell, LogOut, User as UserIcon, Menu, X, Sparkles } from 'lucide-react';
import api from '../api';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        if (!cancelled) {
          setNotifications(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    void loadNotifications();
    const interval = setInterval(() => {
      void loadNotifications();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
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

  const openNotification = async (notification) => {
    try {
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
    } finally {
      setShowNotifications(false);
      navigate(notification.target_path || '/dashboard');
    }
  };

  const isOrganizer = user?.roles?.includes('organizer');

  const closeMenu = () => setMobileMenuOpen(false);
  const linkClass = (path) => `rounded-full px-3 py-2 text-sm font-medium transition-all duration-300 ease-out ${
    location.pathname === path
      ? 'bg-primary text-white shadow-[0_12px_28px_-16px_rgba(93,56,145,0.78)]'
      : 'text-muted hover:-translate-y-0.5 hover:bg-primary/8 hover:text-primary'
  }`;

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg-soft/90 backdrop-blur-xl">
      <div className="page-shell">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 transition-transform duration-300 hover:scale-[1.01]" onClick={closeMenu}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_16px_32px_-18px_rgba(93,56,145,0.72)] transition-transform duration-300 hover:rotate-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-ink">EventSphere</p>
              <p className="text-xs text-muted">Premium event operations</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link to="/" className={linkClass('/')} onClick={closeMenu}>Home</Link>
            <Link to="/events" className={linkClass('/events')} onClick={closeMenu}>Events</Link>
            {user && <Link to="/dashboard" className={linkClass('/dashboard')} onClick={closeMenu}>Dashboard</Link>}
            {user && !isOrganizer && !isAdmin && <Link to="/tickets" className={linkClass('/tickets')} onClick={closeMenu}>My Tickets</Link>}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setShowNotifications((prev) => !prev)}
                    className="relative rounded-full border border-border/60 bg-surface/75 p-2 text-muted transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/8 hover:text-primary"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white shadow-sm">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_26px_60px_-30px_rgba(93,56,145,0.28)] animate-soft-pop">
                      <div className="border-b border-border/60 bg-bg-soft px-4 py-3 text-sm font-semibold text-ink">Notifications</div>
                      <div className="max-h-72 divide-y divide-border/50 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-4 text-center text-sm text-muted">No notifications yet.</div>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => openNotification(n)}
                              className={`block w-full px-4 py-3 text-left text-sm transition-all duration-300 hover:bg-primary/6 ${
                                n.is_read ? 'bg-surface text-muted' : 'bg-primary/10 text-ink'
                              }`}
                            >
                              <p className="line-clamp-2">{n.message}</p>
                              <span className="mt-1 block text-xs text-muted/70">{new Date(n.created_at).toLocaleDateString()}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative hidden sm:block">
                  <button onClick={() => setShowProfileMenu((prev) => !prev)} className="flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1.5 shadow-sm transition-all duration-300 hover:border-primary/20">
                    <UserIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-ink">{user.name}</span>
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_26px_60px_-30px_rgba(93,56,145,0.28)] animate-soft-pop">
                      <button onClick={() => { setShowProfileMenu(false); navigate('/dashboard'); }} className="block w-full px-4 py-3 text-left text-sm text-ink transition-all duration-300 hover:bg-primary/6">Dashboard</button>
                      <button onClick={() => { setShowProfileMenu(false); navigate('/tickets'); }} className="block w-full px-4 py-3 text-left text-sm text-ink transition-all duration-300 hover:bg-primary/6">My Tickets</button>
                      <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-danger transition-all duration-300 hover:bg-danger/8"><LogOut className="h-4 w-4" /><span>Logout</span></button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden items-center gap-3 sm:flex">
                <Link to="/login" className="rounded-full px-3 py-2 text-sm font-medium text-muted transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/8 hover:text-primary">Login</Link>
                <Link to="/signup" className="btn-primary">Sign Up</Link>
              </div>
            )}

            <button className="rounded-2xl border border-border/70 bg-surface/75 p-2 text-muted transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/8 hover:text-primary md:hidden" onClick={() => setMobileMenuOpen((prev) => !prev)} aria-label="Toggle navigation">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mb-3 rounded-3xl border border-border bg-surface/95 p-4 shadow-[0_20px_50px_-32px_rgba(93,56,145,0.32)] animate-fade-in-up md:hidden">
            <div className="flex flex-col gap-3">
              <Link to="/" onClick={closeMenu} className={linkClass('/')}>Home</Link>
              <Link to="/events" onClick={closeMenu} className={linkClass('/events')}>Events</Link>
              {user && <Link to="/dashboard" onClick={closeMenu} className={linkClass('/dashboard')}>Dashboard</Link>}
              {user && !isOrganizer && !isAdmin && <Link to="/tickets" onClick={closeMenu} className={linkClass('/tickets')}>My Tickets</Link>}
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
