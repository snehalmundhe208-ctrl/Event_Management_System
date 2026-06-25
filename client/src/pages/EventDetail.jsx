import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { Calendar, MapPin, CheckCircle, Users, Image as ImageIcon, MessageSquare, Star, Heart, Upload } from 'lucide-react';

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

  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  const [bannerFile, setBannerFile] = useState(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const fetchEventDetails = async () => {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load event details');
    }
  };

  const fetchUserRegistration = async () => {
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
  };

  const fetchGallery = async () => {
    try {
      const params = user ? { userId: user.id } : {};
      const res = await api.get(`/gallery/event/${id}`, { params });
      setGallery(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFeedback = async () => {
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
  };

  const loadData = async () => {
    setLoading(true);
    await fetchEventDetails();
    await fetchUserRegistration();
    await fetchGallery();
    await fetchFeedback();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id, user]);

  const handleRegisterRedirect = () => {
    navigate(`/register/${id}`);
  };

  const handleCancelRegistration = async () => {
    if (!window.confirm('Are you sure you want to cancel your registration?')) return;
    try {
      await api.delete(`/registrations/${registration.id}`);
      setRegistration(null);
      setIsCheckedIn(false);
      loadData();
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

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackError('');
    try {
      await api.post('/feedback', {
        eventId: id,
        rating: newRating,
        comment: newComment
      });
      setNewComment('');
      fetchFeedback();
    } catch (err) {
      setFeedbackError(err.response?.data?.message || 'Feedback submission failed');
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">Loading event details...</div>;
  }

  if (error || !event) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-red-600 font-bold">{error || 'Event not found'}</div>;
  }

  const isOrganizer = event.organizer_id === user?.id;
  const isAdmin = user?.roles?.includes('admin');
  const showAdminControls = isOrganizer || isAdmin;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="relative rounded-xl overflow-hidden mb-8 h-80 bg-indigo-50 flex items-center justify-center border border-gray-200">
        {event.banner_url ? (
          <img
            src={`http://localhost:5000${event.banner_url}`}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl font-bold text-indigo-300">No Banner Image</span>
        )}
        <div className="absolute top-4 left-4 bg-indigo-600 text-white px-3 py-1 rounded text-sm font-semibold uppercase">
          {event.status}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{event.title}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold uppercase">
                {event.category_name || 'Uncategorized'}
              </span>
              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold uppercase">
                {event.type}
              </span>
            </div>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <ImageIcon className="h-5 w-5 mr-2 text-indigo-600" />
              Event Gallery
            </h3>
            {isCheckedIn && (
              <div className="mb-6 flex items-center space-x-3">
                <label className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm cursor-pointer transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                </label>
                {uploadingPhoto && <span className="text-sm text-gray-500">Uploading...</span>}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {gallery.length === 0 ? (
                <div className="col-span-3 text-center py-6 text-sm text-gray-400">No photos in gallery.</div>
              ) : (
                gallery.map(item => (
                  <div key={item.id} className="relative rounded overflow-hidden group shadow-sm border border-gray-100 bg-gray-50">
                    <img
                      src={`http://localhost:5000${item.photo_url}`}
                      alt="Gallery item"
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-white truncate max-w-[60%]">{item.user_name}</span>
                      <button
                        onClick={() => handleLikeItem(item.id)}
                        className="flex items-center space-x-1 bg-white bg-opacity-95 text-red-500 hover:bg-opacity-100 rounded px-1.5 py-0.5 text-xs font-semibold"
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

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-indigo-600" />
              Attendee Reviews
            </h3>

            {ratingSummary.totalCount > 0 && (
              <div className="flex items-center space-x-4 mb-6 border-b pb-4 border-gray-100">
                <div className="text-4xl font-extrabold text-indigo-600">{ratingSummary.averageRating}</div>
                <div>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.round(ratingSummary.averageRating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{ratingSummary.totalCount} ratings</div>
                </div>
              </div>
            )}

            {isCheckedIn && !hasSubmittedFeedback && (
              <form onSubmit={handleFeedbackSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-gray-800">Leave Feedback</h4>
                {feedbackError && <div className="text-red-700 text-xs">{feedbackError}</div>}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Rating:</span>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setNewRating(val)}
                      className="p-0.5 text-yellow-400 hover:scale-110 transition-transform"
                    >
                      <Star className={`h-6 w-6 ${val <= newRating ? 'fill-current' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Comment</label>
                  <textarea
                    rows={2}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-sm font-semibold transition-colors"
                >
                  Submit Feedback
                </button>
              </form>
            )}

            <div className="space-y-4">
              {feedbacks.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-400">No reviews yet.</div>
              ) : (
                feedbacks.map(f => (
                  <div key={f.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-sm text-gray-800">{f.user_name}</span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < f.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    {f.comment && <p className="text-gray-600 text-sm mt-2">{f.comment}</p>}
                    <span className="text-xs text-gray-400 block mt-1">
                      {new Date(f.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Event Info</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-3 text-indigo-600" />
                <div>
                  <div className="font-semibold text-gray-800">Date & Time</div>
                  <div>{new Date(event.start_date).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 mr-3 text-indigo-600" />
                <div>
                  <div className="font-semibold text-gray-800">Location</div>
                  <div>{event.location || 'Online'}</div>
                </div>
              </div>
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-3 text-indigo-600" />
                <div>
                  <div className="font-semibold text-gray-800">Capacity</div>
                  <div>{event.capacity} total seats</div>
                </div>
              </div>
            </div>

            {user ? (
              <>
                {registration ? (
                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Your Status:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        registration.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {registration.status}
                      </span>
                    </div>

                    {registration.status === 'confirmed' && (
                      <Link
                        to="/tickets"
                        className="block text-center w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded transition-colors text-sm"
                      >
                        View Ticket
                      </Link>
                    )}

                    <button
                      onClick={handleCancelRegistration}
                      className="block text-center w-full bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2 rounded transition-colors text-sm"
                    >
                      Cancel Registration
                    </button>
                  </div>
                ) : (
                  event.status === 'published' && (
                    <button
                      onClick={handleRegisterRedirect}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded transition-colors text-sm"
                    >
                      Register Now
                    </button>
                  )
                )}
              </>
            ) : (
              <Link
                to="/login"
                className="block text-center w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded transition-colors text-sm"
              >
                Sign In to Register
              </Link>
            )}
          </div>

          {showAdminControls && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Organizer Controls</h3>

              <div className="flex flex-col space-y-2">
                {event.status === 'draft' && (
                  <button
                    onClick={handlePublish}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded text-sm font-semibold transition-colors"
                  >
                    Publish Event
                  </button>
                )}
                {event.status === 'published' && (
                  <>
                    <button
                      onClick={handleCompleteEvent}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-semibold transition-colors"
                    >
                      Mark as Completed
                    </button>
                    <button
                      onClick={handleCancelEvent}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm font-semibold transition-colors"
                    >
                      Cancel Event
                    </button>
                  </>
                )}
              </div>

              <form onSubmit={handleBannerUpload} className="pt-4 border-t border-gray-100 space-y-3">
                <label className="block text-xs font-semibold text-gray-500 uppercase">Change Banner</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerFile(e.target.files[0])}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <button
                  type="submit"
                  disabled={uploadingBanner || !bannerFile}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white py-1 text-xs font-semibold rounded disabled:opacity-50 transition-colors"
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
