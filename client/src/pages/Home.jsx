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
    <div className="bg-slate-950 min-h-screen text-slate-100 overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-slate-950 text-slate-100 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-700 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-slate-300 mb-8">
            <Sparkles className="h-4 w-4 text-slate-400" />
            <span>Next-Generation Event Operations & Tracking</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none mb-6 text-slate-100">
            Experience Events Like <br className="hidden sm:block" />
            <span className="text-slate-100">
              Never Before
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-slate-300 text-base sm:text-xl mb-12 font-light leading-relaxed">
            Discover workshops, organize conferences, manage digital ticketing, track real-time attendance, and issue certificates — all in one premium platform.
          </p>

          {/* Quick-Search Glassmorphic Bar */}
          <div className="max-w-4xl mx-auto bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-700">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl text-slate-200">
                <Search className="h-5 w-5 text-slate-300 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Event keyword..."
                  className="bg-transparent border-none outline-none w-full text-sm placeholder-slate-500 focus:ring-0"
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
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-slate-400 font-bold text-sm uppercase tracking-wider mb-2">
              <TrendingUp className="h-4 w-4 text-slate-300" />
              <span>Happening Soon</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              Featured Events
            </h2>
          </div>
          <Link
            to="/events"
            className="group flex items-center space-x-1.5 text-slate-300 font-semibold hover:text-slate-100 transition-colors duration-200"
          >
            <span>Explore all events</span>
            <ChevronRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loadingEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="card h-80" />
            ))}
          </div>
        ) : featuredEvents.length === 0 ? (
          <div className="text-center py-16 card p-8">
            <p className="text-slate-400 text-lg mb-4">No upcoming events listed at the moment.</p>
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
                className="group card-hover"
              >
                {event.banner_url ? (
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={`http://localhost:5000${event.banner_url}`}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-slate-950/50" />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-slate-900 flex items-center justify-center text-slate-400 font-bold">
                    NO IMAGE
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="badge-primary text-xs">
                      {event.type}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Limit: {event.capacity} seats
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-slate-100 transition-colors line-clamp-1">
                    <Link to={`/event/${event.id}`}>{event.title}</Link>
                  </h3>
                  
                  <p className="text-slate-400 text-sm line-clamp-2 mb-4 font-normal">
                    {event.description}
                  </p>

                  <div className="flex flex-col gap-2.5 text-slate-400 text-sm border-t border-slate-700 pt-4 mb-6">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-slate-300 flex-shrink-0" />
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
                      <MapPin className="h-4 w-4 mr-2 text-slate-300 flex-shrink-0" />
                      <span className="line-clamp-1">{event.location || 'Online / Link Available'}</span>
                    </div>
                  </div>

                  <Link
                    to={`/event/${event.id}`}
                    className="block text-center w-full bg-slate-700/50 border border-slate-600 hover:bg-slate-700 hover:border-slate-600 hover:text-white text-slate-200 font-semibold py-2.5 rounded-xl transition-colors duration-200 text-sm"
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
      <section className="bg-slate-900 text-white py-24 px-4 sm:px-6 lg:px-8 border-y border-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Designed for Seamless Operations
            </h2>
            <p className="max-w-xl mx-auto text-slate-300 font-light text-sm sm:text-base">
              A comprehensive event stack empowering organizers and attendees with secure digital tooling and automated tracking systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 transition-colors duration-200 hover:border-slate-600">
              <div className="p-3 bg-slate-800 rounded-xl inline-block mb-4 text-slate-200">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-100">Secure Ticket QR Scanner</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Unique ticket generation with instant signatures. Verify check-ins securely with our built-in scanner during the live event.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 transition-colors duration-200 hover:border-slate-600">
              <div className="p-3 bg-slate-800 rounded-xl inline-block mb-4 text-slate-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-100">Automated Waitlist seats</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Exceeded capacities are managed automatically. Registrants join the waitlist and get auto-promoted when spots open up.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 transition-colors duration-200 hover:border-slate-600">
              <div className="p-3 bg-slate-800 rounded-xl inline-block mb-4 text-slate-200">
                <MessageSquareHeart className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-100">Feedback & Evaluation</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Attendees rate sessions and submit feedback directly, helping organizers analyze workshop effectiveness and refine parameters.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 transition-colors duration-200 hover:border-slate-600">
              <div className="p-3 bg-slate-800 rounded-xl inline-block mb-4 text-slate-200">
                <ImageIcon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-100">Shared Digital Galleries</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Collaborative photo streams for active engagement. Attendees share memories and like photos live in real-time.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 transition-colors duration-200 hover:border-slate-600">
              <div className="p-3 bg-slate-800 rounded-xl inline-block mb-4 text-slate-200">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-100">Verified PDFs & Certificates</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Automatic generation of digital participation certificates with custom designs once the event is marked completed.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 transition-colors duration-200 hover:border-slate-600">
              <div className="p-3 bg-slate-800 rounded-xl inline-block mb-4 text-slate-200">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-100">Live Metrics Dashboard</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Real-time dashboard updates tracking user check-ins, capacity fill percentages, and instant CSV registrant reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Statistics / Mockup Dashboard */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="card p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="badge-primary text-xs mb-4 inline-block">
              Operational Statistics
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight leading-tight mb-6">
              Track Real-time Activity <br />
              With Zero Overhead
            </h2>
            <p className="text-slate-300 mb-8 font-light text-base leading-relaxed">
              EventSphere eliminates administrative bottlenecks. Monitor ticket check-ins, download reports, and observe waitlist state dynamically as registrations change.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="border-l-4 border-slate-600 pl-4">
                <div className="text-3xl font-extrabold text-slate-100">98.6%</div>
                <div className="text-slate-400 text-xs mt-1 uppercase font-semibold">Average Check-in Rate</div>
              </div>
              <div className="border-l-4 border-slate-600 pl-4">
                <div className="text-3xl font-extrabold text-slate-100">&lt; 3s</div>
                <div className="text-slate-400 text-xs mt-1 uppercase font-semibold">Verification Speed</div>
              </div>
            </div>
          </div>

          {/* Interactive mockup representation */}
          <div className="bg-slate-950 rounded-2xl p-6 border border-slate-700 text-white shadow-sm relative">
            <div className="absolute top-3 right-3 flex space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>

            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700">
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm font-black">
                ES
              </div>
              <div>
                <p className="text-xs text-slate-400">Live Status Tracker</p>
                <p className="text-sm font-semibold">Organizer Terminal</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-lg border border-slate-700/80">
                <span className="text-slate-400">Active Registrants:</span>
                <span className="text-emerald-400 font-bold">1,824 Attendees</span>
              </div>

              <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-lg border border-slate-700/80">
                <span className="text-slate-400">Waitlist promoted:</span>
                <span className="text-slate-100 font-bold">+42 promoted</span>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                  <span>CAPACITY FILL</span>
                  <span>92%</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700">
                  <div className="bg-slate-600 h-full rounded-full w-[92%]" />
                </div>
              </div>

              <div className="pt-2">
                <div className="text-[10px] text-slate-500 mb-2">LIVE ACTIONS LOG</div>
                <div className="bg-slate-900 p-3 rounded-lg text-[11px] text-slate-100 leading-normal border border-slate-700/50">
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
      <section className="bg-slate-900 py-16 px-4 sm:px-6 lg:px-8 text-center text-white">

        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Ready to Organize Your Next Event?
          </h2>
          <p className="text-slate-200 text-sm sm:text-base max-w-xl mx-auto mb-8 font-light">
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
      </section>
    </div>
  );
}
