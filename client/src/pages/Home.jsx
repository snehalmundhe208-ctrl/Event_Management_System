import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import {
  Calendar,
  MapPin,
  Search,
  Sparkles,
  ShieldCheck,
  QrCode,
  MessageSquareHeart,
  Image as ImageIcon,
  GraduationCap,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Search/Filter states
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const catRes = await api.get('/events/categories');
        setCategories(catRes.data);

        // Fetch published/active events for upcoming events section
        const eventRes = await api.get('/events');
        // Sort by start date and limit to 3
        const sorted = (eventRes.data || [])
          .filter(e => e.status === 'published' || e.status === 'active')
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
          .slice(0, 3);
        setFeaturedEvents(sorted);
      } catch (err) {
        console.error('Failed to load home page data:', err);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchHomeData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.append('keyword', keyword);
    if (selectedCategory) params.append('categoryId', selectedCategory);
    if (selectedType) params.append('type', selectedType);
    
    navigate(`/events?${params.toString()}`);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-transparent text-ink">
      {/* Hero Section */}
      <section className="relative px-4 py-24 text-ink sm:px-6 lg:px-8 fade-in-section">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8 inline-flex items-center space-x-2 rounded-full border border-primary/15 bg-surface/80 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm sm:text-sm">
            <Sparkles className="h-4 w-4 text-accent" />
            <span>Next-Generation Event Operations & Tracking</span>
          </div>

          <h1 className="mb-6 text-4xl font-extrabold leading-none tracking-tight text-ink sm:text-6xl">
            Experience Events Like <br className="hidden sm:block" />
            <span className="text-primary">
              Never Before
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-base font-light leading-relaxed text-muted sm:text-xl">
            Discover workshops, organize conferences, manage digital ticketing, track real-time attendance, and issue certificates — all in one premium platform.
          </p>

          {/* Quick-Search Glassmorphic Bar */}
          <div className="mx-auto max-w-4xl rounded-[30px] border border-border bg-surface/88 p-4 shadow-[0_28px_80px_-40px_rgba(93,56,145,0.24)] backdrop-blur-sm sm:p-6 entrance-card">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center rounded-2xl border border-border bg-bg-soft px-4 py-2.5 text-ink shadow-sm transition-all duration-300 focus-within:-translate-y-0.5 focus-within:border-primary/40 focus-within:bg-surface focus-within:ring-4 focus-within:ring-primary/10">
                <Search className="mr-2 h-5 w-5 flex-shrink-0 text-primary" />
                <input
                  type="text"
                  placeholder="Event keyword..."
                  className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted/70 focus:ring-0"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>

              <div>
                <select
                  className="input-base"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  className="input-base"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="in-person">In-Person</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary flex items-center justify-center space-x-2"
              >
                <span>Search</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Featured / Upcoming Events Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 fade-in-section">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-4">
          <div>
            <div className="mb-2 flex items-center space-x-2 text-sm font-bold uppercase tracking-wider text-primary">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span>Happening Soon</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Featured Events
            </h2>
          </div>
          <Link
            to="/events"
            className="group flex items-center space-x-1.5 font-semibold text-muted transition-all duration-300 hover:text-primary"
          >
            <span>Explore all events</span>
            <ChevronRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loadingEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="card h-80 animate-pulse" />
            ))}
          </div>
        ) : featuredEvents.length === 0 ? (
          <div className="card p-8 py-16 text-center entrance-card">
            <p className="mb-4 text-lg text-muted">No upcoming events listed at the moment.</p>
            <Link
              to="/events"
              className="btn-primary inline-flex items-center space-x-2"
            >
              <span>Discover Events</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredEvents.map((event) => (
              <div
                key={event.id}
                className="group card-hover entrance-card"
              >
                {event.banner_url ? (
                  <div className="image-zoom-shell relative h-48 w-full">
                    <img
                      src={`http://localhost:5000${event.banner_url}`}
                      alt={event.title}
                      className="image-zoom h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-primary/10" />
                  </div>
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-bg-soft text-sm font-bold uppercase tracking-[0.2em] text-muted">
                    NO IMAGE
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="badge-primary text-xs">
                      {event.type}
                    </span>
                    <span className="text-xs font-medium text-muted">
                      Limit: {event.capacity} seats
                    </span>
                  </div>

                  <h3 className="mb-2 line-clamp-1 text-xl font-bold text-ink transition-colors group-hover:text-primary">
                    <Link to={`/event/${event.id}`}>{event.title}</Link>
                  </h3>
                  
                  <p className="mb-4 line-clamp-2 text-sm font-normal text-muted">
                    {event.description}
                  </p>

                  <div className="mb-6 flex flex-col gap-2.5 border-t border-border pt-4 text-sm text-muted">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="line-clamp-1">
                        {new Date(event.start_date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="mr-2 h-4 w-4 flex-shrink-0 text-accent" />
                      <span className="line-clamp-1">{event.location || 'Online / Link Available'}</span>
                    </div>
                  </div>

                  <Link
                    to={`/event/${event.id}`}
                    className="block w-full rounded-2xl border border-border bg-bg-soft py-2.5 text-center text-sm font-semibold text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary hover:text-white"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Core Platform Capabilities Section */}
      <section className="border-y border-border bg-bg-soft/70 px-4 py-24 text-ink sm:px-6 lg:px-8 fade-in-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Designed for Seamless Operations
            </h2>
            <p className="mx-auto max-w-xl text-sm font-light text-muted sm:text-base">
              A comprehensive event stack empowering organizers and attendees with secure digital tooling and automated tracking systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card-hover p-6">
              <div className="mb-4 inline-block rounded-2xl bg-primary/10 p-3 text-primary">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-ink">Secure Ticket QR Scanner</h3>
              <p className="text-sm leading-relaxed text-muted">
                Unique ticket generation with instant signatures. Verify check-ins securely with our built-in scanner during the live event.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-hover p-6">
              <div className="mb-4 inline-block rounded-2xl bg-accent/12 p-3 text-accent">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-ink">Automated Waitlist seats</h3>
              <p className="text-sm leading-relaxed text-muted">
                Exceeded capacities are managed automatically. Registrants join the waitlist and get auto-promoted when spots open up.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-hover p-6">
              <div className="mb-4 inline-block rounded-2xl bg-primary/10 p-3 text-primary">
                <MessageSquareHeart className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-ink">Feedback & Evaluation</h3>
              <p className="text-sm leading-relaxed text-muted">
                Attendees rate sessions and submit feedback directly, helping organizers analyze workshop effectiveness and refine parameters.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card-hover p-6">
              <div className="mb-4 inline-block rounded-2xl bg-accent/12 p-3 text-accent">
                <ImageIcon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-ink">Shared Digital Galleries</h3>
              <p className="text-sm leading-relaxed text-muted">
                Collaborative photo streams for active engagement. Attendees share memories and like photos live in real-time.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card-hover p-6">
              <div className="mb-4 inline-block rounded-2xl bg-primary/10 p-3 text-primary">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-ink">Verified PDFs & Certificates</h3>
              <p className="text-sm leading-relaxed text-muted">
                Automatic generation of digital participation certificates with custom designs once the event is marked completed.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card-hover p-6">
              <div className="mb-4 inline-block rounded-2xl bg-accent/12 p-3 text-accent">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-ink">Live Metrics Dashboard</h3>
              <p className="text-sm leading-relaxed text-muted">
                Real-time dashboard updates tracking user check-ins, capacity fill percentages, and instant CSV registrant reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Statistics / Mockup Dashboard */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 fade-in-section">
        <div className="card grid grid-cols-1 items-center gap-12 p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <span className="badge-primary text-xs mb-4 inline-block">
              Operational Statistics
            </span>
            <h2 className="mb-6 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
              Track Real-time Activity <br />
              With Zero Overhead
            </h2>
            <p className="mb-8 text-base font-light leading-relaxed text-muted">
              EventSphere eliminates administrative bottlenecks. Monitor ticket check-ins, download reports, and observe waitlist state dynamically as registrations change.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="border-l-4 border-primary pl-4">
                <div className="text-3xl font-extrabold text-ink">98.6%</div>
                <div className="mt-1 text-xs font-semibold uppercase text-muted">Average Check-in Rate</div>
              </div>
              <div className="border-l-4 border-accent pl-4">
                <div className="text-3xl font-extrabold text-ink">&lt; 3s</div>
                <div className="mt-1 text-xs font-semibold uppercase text-muted">Verification Speed</div>
              </div>
            </div>
          </div>

          {/* Interactive mockup representation */}
          <div className="relative rounded-[28px] border border-border bg-bg-soft p-6 text-ink shadow-[0_24px_70px_-38px_rgba(93,56,145,0.26)]">
            <div className="absolute top-3 right-3 flex space-x-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-danger" />
              <div className="h-2.5 w-2.5 rounded-full bg-accent" />
              <div className="h-2.5 w-2.5 rounded-full bg-success" />
            </div>

            <div className="mb-6 flex items-center space-x-3 border-b border-border pb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-white">
                ES
              </div>
              <div>
                <p className="text-xs text-muted">Live Status Tracker</p>
                <p className="text-sm font-semibold">Organizer Terminal</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/90 p-3">
                <span className="text-muted">Active Registrants:</span>
                <span className="font-bold text-success">1,824 Attendees</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/90 p-3">
                <span className="text-muted">Waitlist promoted:</span>
                <span className="font-bold text-ink">+42 promoted</span>
              </div>

              <div>
                <div className="mb-1.5 flex justify-between text-[10px] text-muted">
                  <span>CAPACITY FILL</span>
                  <span>92%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full border border-border bg-surface">
                  <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-primary to-accent" />
                </div>
              </div>

              <div className="pt-2">
                <div className="mb-2 text-[10px] text-muted">LIVE ACTIONS LOG</div>
                <div className="rounded-2xl border border-border bg-surface p-3 text-[11px] leading-normal text-ink">
                  &gt; Ticket signed matching keys [OK] <br />
                  &gt; attendee@example.com checked in <br />
                  &gt; QR Code verified successfully
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="px-4 py-16 text-center sm:px-6 lg:px-8 fade-in-section">

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="rounded-[32px] border border-border bg-surface/90 px-6 py-12 shadow-[0_28px_80px_-38px_rgba(93,56,145,0.25)]">
          <h2 className="mb-4 text-3xl font-extrabold text-ink sm:text-4xl">
            Ready to Organize Your Next Event?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-sm font-light text-muted sm:text-base">
            Create an organizer account, post workshop schedules, upload custom banners, and start tracking registration waitlists immediately.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              to="/signup"
              className="btn-primary flex items-center space-x-2 w-full sm:w-auto justify-center"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/events"
              className="btn-outline flex items-center space-x-2 w-full sm:w-auto justify-center"
            >
              <span>Explore Events</span>
            </Link>
          </div>
          </div>
        </div>
      </section>
    </div>
  );
}
