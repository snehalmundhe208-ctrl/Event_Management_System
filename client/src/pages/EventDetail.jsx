import { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { toAssetUrl } from '../utils/assets';
import { Calendar, MapPin, Users, Image as ImageIcon, MessageSquare, Star, Heart, Upload } from 'lucide-react';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [registration, setRegistration] = useState(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const [gallery, setGallery] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [feedbacks, setFeedbacks] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, totalCount: 0 });
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);

  const [bannerFile, setBannerFile] = useState(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const fetchEventDetails = useCallback(async () => {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load event details');
    }
  }, [id]);

  const fetchUserRegistration = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/registrations/my');
      const reg = res.data.find(r => r.event_id === id);
      setRegistration(reg || null);

      if (reg && reg.status === 'confirmed') {
        const ticketRes = await api.get(`/tickets/${reg.ticket_id}`);
        const checkinRes = await api.get(`/checkin/event/${id}`);
        const checked = checkinRes.data.some(c => c.ticket_code === ticketRes.data.ticket_code);
        setIsCheckedIn(checked);
      }
    } catch (err) {
      console.error(err);
    }
  }, [id, user]);

  const fetchGallery = useCallback(async () => {
    try {
      const params = user ? { userId: user.id } : {};
      const res = await api.get(`/gallery/event/${id}`, { params });
      setGallery(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [id, user]);

  const fetchFeedback = useCallback(async () => {
    try {
      const listRes = await api.get(`/feedback/event/${id}`);
      setFeedbacks(listRes.data);

      const sumRes = await api.get(`/feedback/event/${id}/summary`);
      setRatingSummary(sumRes.data);

      if (user) {
        const submitted = listRes.data.some(f => f.user_id === user.id);
        setHasSubmittedFeedback(submitted);
      }
    } catch (err) {
      console.error(err);
    }
  }, [id, user]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await fetchEventDetails();
      await fetchUserRegistration();
      await fetchGallery();
      await fetchFeedback();
      setLoading(false);
    };

    void run();
  }, [fetchEventDetails, fetchFeedback, fetchGallery, fetchUserRegistration]);

  const handleRegisterRedirect = () => {
    navigate(`/register/${id}`);
  };

  const handleCancelRegistration = async () => {
    if (!window.confirm('Are you sure you want to cancel your registration?')) return;
    try {
      await api.delete(`/registrations/${registration.id}`);
      setRegistration(null);
      setIsCheckedIn(false);
      await fetchEventDetails();
      await fetchUserRegistration();
      await fetchGallery();
      await fetchFeedback();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel registration');
    }
  };

  const handlePublish = async () => {
    try {
      await api.post(`/events/${id}/publish`);
      fetchEventDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish event');
    }
  };

  const handleCancelEvent = async () => {
    if (!window.confirm('Are you sure you want to cancel this event? This will notify all registrants.')) return;
    try {
      await api.post(`/events/${id}/cancel`);
      fetchEventDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel event');
    }
  };

  const handleCompleteEvent = async () => {
    if (!window.confirm('Are you sure you want to mark this event as completed? This will generate participation certificates.')) return;
    try {
      await api.post(`/events/${id}/complete`);
      fetchEventDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete event');
    }
  };

  const handleBannerUpload = async (e) => {
    e.preventDefault();
    if (!bannerFile) return;
    setUploadingBanner(true);
    const formData = new FormData();
    formData.append('banner', bannerFile);
    try {
      await api.post(`/events/${id}/banner`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchEventDetails();
      setBannerFile(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Banner upload failed');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('eventId', id);
    try {
      await api.post('/gallery', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchGallery();
    } catch (err) {
      alert(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLikeItem = async (itemId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post(`/gallery/item/${itemId}/like`);
      fetchGallery();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-muted">Loading event details...</div>;
  }

  if (error || !event) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center font-bold text-danger">{error || 'Event not found'}</div>;
  }

  const isOrganizer = event.organizer_id === user?.id;
  const isAdmin = user?.roles?.includes('admin');
  const showAdminControls = isOrganizer || isAdmin;
  const isCompleted = event.status === 'completed';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 fade-in-section">
      <div className="relative mb-8 flex h-80 items-center justify-center overflow-hidden rounded-[32px] border border-border bg-bg-soft shadow-[0_24px_70px_-36px_rgba(93,56,145,0.22)]">
        {event.banner_url ? (
          <img
            src={toAssetUrl(event.banner_url)}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <span className="text-2xl font-bold text-primary/45">No Banner Image</span>
        )}
        <div className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-sm font-semibold uppercase text-white shadow-sm">
          {event.status}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h1 className="mb-4 text-4xl font-extrabold text-ink">{event.title}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                {event.category_name || 'Uncategorized'}
              </span>
              <span className="rounded-full bg-accent/12 px-3 py-1 text-xs font-semibold uppercase text-accent">
                {event.type}
              </span>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed text-muted">{event.description}</p>
          </div>

          {isCompleted && (
            <>
              <div className="card entrance-card p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="flex items-center text-lg font-bold text-ink">
                    <ImageIcon className="mr-2 h-5 w-5 text-primary" />
                    Event Gallery
                  </h3>
                  {isCheckedIn && (
                    <label className="btn-primary cursor-pointer">
                      <Upload className="h-4 w-4" />
                      <span>{uploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                      />
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {gallery.length === 0 ? (
                    <div className="col-span-3 py-6 text-center text-sm text-muted">No photos in gallery.</div>
                  ) : (
                    gallery.map((item) => (
                      <div key={item.id} className="group relative overflow-hidden rounded-[22px] border border-border bg-bg-soft shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_-28px_rgba(93,56,145,0.28)]">
                        <img
                          src={toAssetUrl(item.photo_url)}
                          alt="Gallery item"
                          className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 flex items-end justify-between bg-ink/32 p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <span className="max-w-[60%] truncate text-xs text-white">{item.user_name}</span>
                          <button
                            onClick={() => handleLikeItem(item.id)}
                            className="flex items-center space-x-1 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-danger transition-all duration-300 hover:scale-105"
                          >
                            <Heart className={`h-3 w-3 ${item.is_liked ? 'fill-current' : ''}`} />
                            <span>{item.likes_count}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="card entrance-card p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="flex items-center text-lg font-bold text-ink">
                    <MessageSquare className="mr-2 h-5 w-5 text-primary" />
                    Attendee Reviews
                  </h3>
                  {isCheckedIn && !hasSubmittedFeedback && (
                    <Link to={`/feedback/${id}`} className="btn-primary">
                      Leave Feedback
                    </Link>
                  )}
                </div>

                {ratingSummary.totalCount > 0 && (
                  <div className="mb-6 flex items-center space-x-4 border-b border-border pb-4">
                    <div className="text-4xl font-extrabold text-primary">{ratingSummary.averageRating}</div>
                    <div>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < Math.round(ratingSummary.averageRating) ? 'fill-current text-accent' : 'text-border'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="mt-1 text-sm text-muted">{ratingSummary.totalCount} ratings</div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {feedbacks.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted">No reviews yet.</div>
                  ) : (
                    feedbacks.map((f) => (
                      <div key={f.id} className="rounded-[22px] border border-border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="text-sm font-semibold text-ink">{f.user_name}</span>
                            <span className="mt-1 block text-xs text-muted/75">
                              {new Date(f.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < f.rating ? 'fill-current text-accent' : 'text-border'}`}
                              />
                            ))}
                          </div>
                        </div>
                        {f.comment && <p className="mt-3 text-sm text-muted">{f.comment}</p>}
                        {f.photo_url && (
                          <img
                            src={toAssetUrl(f.photo_url)}
                            alt="Review upload"
                            className="mt-4 h-48 w-full rounded-[18px] object-cover"
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <div className="card entrance-card space-y-4 p-6">
            <h3 className="text-lg font-bold text-ink">Event Info</h3>
            <div className="space-y-3 text-sm text-muted">
              <div className="flex items-center">
                <Calendar className="mr-3 h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold text-ink">Date & Time</div>
                  <div>{new Date(event.start_date).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center">
                <MapPin className="mr-3 h-5 w-5 text-accent" />
                <div>
                  <div className="font-semibold text-ink">Location</div>
                  <div>{event.location || 'Online'}</div>
                </div>
              </div>
              <div className="flex items-center">
                <Users className="mr-3 h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold text-ink">Capacity</div>
                  <div>{event.capacity} total seats</div>
                </div>
              </div>
            </div>

            {user ? (
              <>
                {registration ? (
                  <div className="space-y-3 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-muted">Your Status:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        registration.status === 'confirmed'
                          ? 'bg-success/12 text-success'
                          : 'bg-accent/12 text-accent'
                      }`}>
                        {registration.status}
                      </span>
                    </div>

                    {registration.status === 'confirmed' && (
                      <Link
                        to="/tickets"
                        className="block w-full rounded-2xl bg-success px-4 py-2 text-center text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-success/90"
                      >
                        View Ticket
                      </Link>
                    )}

                    <button
                      onClick={handleCancelRegistration}
                      className="block w-full rounded-2xl bg-danger/10 px-4 py-2 text-center text-sm font-medium text-danger transition-all duration-300 hover:-translate-y-0.5 hover:bg-danger/14"
                    >
                      Cancel Registration
                    </button>
                  </div>
                ) : (
                  event.status === 'published' && (
                    <button
                      onClick={handleRegisterRedirect}
                      className="btn-primary w-full"
                    >
                      Register Now
                    </button>
                  )
                )}
              </>
            ) : (
              <Link
                to="/login"
                className="btn-primary w-full"
              >
                Sign In to Register
              </Link>
            )}
          </div>

          {!isCompleted && (
            <div className="card entrance-card p-6 text-sm text-muted">
              Gallery and attendee feedback unlock after the event is completed.
            </div>
          )}

          {showAdminControls && (
            <div className="card entrance-card space-y-4 p-6">
              <h3 className="text-lg font-bold text-ink">Organizer Controls</h3>

              <div className="flex flex-col space-y-2">
                {event.status === 'draft' && (
                  <button
                    onClick={handlePublish}
                    className="btn-primary w-full"
                  >
                    Publish Event
                  </button>
                )}
                {event.status === 'published' && (
                  <>
                    <button
                      onClick={handleCompleteEvent}
                      className="w-full rounded-2xl bg-success px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-success/90"
                    >
                      Mark as Completed
                    </button>
                    <button
                      onClick={handleCancelEvent}
                      className="w-full rounded-2xl bg-danger px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-danger/92"
                    >
                      Cancel Event
                    </button>
                  </>
                )}
              </div>

              <form onSubmit={handleBannerUpload} className="space-y-3 border-t border-border pt-4">
                <label className="block text-xs font-semibold uppercase text-muted">Change Banner</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerFile(e.target.files[0])}
                  className="input-base text-xs text-muted file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-primary/90"
                />
                <button
                  type="submit"
                  disabled={uploadingBanner || !bannerFile}
                  className="w-full rounded-2xl bg-ink px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/92 disabled:opacity-50"
                >
                  {uploadingBanner ? 'Uploading...' : 'Upload'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
