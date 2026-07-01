import { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { toAssetUrl } from '../utils/assets';
import { Calendar, Heart, Image as ImageIcon, MapPin, MessageSquare, Reply, Star, Upload, UserPlus, Users } from 'lucide-react';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registration, setRegistration] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, totalCount: 0 });
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [activeReplyTo, setActiveReplyTo] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [followingOrganizer, setFollowingOrganizer] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [bannerFile, setBannerFile] = useState(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const fetchEventDetails = useCallback(async () => {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data);
      setFollowingOrganizer(Boolean(res.data.is_following_organizer));
      setFollowerCount(res.data.organizer_follower_count || 0);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load event details');
    }
  }, [id]);

  const fetchUserRegistration = useCallback(async () => {
    if (!user) {
      setRegistration(null);
      return;
    }

    try {
      const res = await api.get('/registrations/my');
      setRegistration(res.data.find((item) => item.event_id === id) || null);
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
      const [listRes, summaryRes] = await Promise.all([
        api.get(`/feedback/event/${id}`),
        api.get(`/feedback/event/${id}/summary`)
      ]);

      setFeedbacks(listRes.data);
      setRatingSummary(summaryRes.data);
      setHasSubmittedFeedback(Boolean(user && listRes.data.some((item) => item.user_id === user.id)));
    } catch (err) {
      console.error(err);
    }
  }, [id, user]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await api.get(`/events/${id}/comments`);
      setComments(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await Promise.all([
        fetchEventDetails(),
        fetchUserRegistration(),
        fetchGallery(),
        fetchFeedback(),
        fetchComments()
      ]);
      setLoading(false);
    };

    void run();
  }, [fetchComments, fetchEventDetails, fetchFeedback, fetchGallery, fetchUserRegistration]);

  const refreshAll = async () => {
    await Promise.all([
      fetchEventDetails(),
      fetchUserRegistration(),
      fetchGallery(),
      fetchFeedback(),
      fetchComments()
    ]);
  };

  const handleRegisterRedirect = () => navigate(`/register/${id}`);

  const handleCancelRegistration = async () => {
    if (!window.confirm('Are you sure you want to cancel your registration?')) return;

    try {
      await api.delete(`/registrations/${registration.id}`);
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel registration');
    }
  };

  const handlePublish = async () => {
    try {
      await api.post(`/events/${id}/publish`);
      await fetchEventDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish event');
    }
  };

  const handleCancelEvent = async () => {
    if (!window.confirm('Are you sure you want to cancel this event? This will notify all registrants.')) return;

    try {
      await api.post(`/events/${id}/cancel`);
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel event');
    }
  };

  const handleCompleteEvent = async () => {
    if (!window.confirm('Are you sure you want to mark this event as completed? This will generate participation certificates.')) return;

    try {
      await api.post(`/events/${id}/complete`);
      await refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete event');
    }
  };

  const handleBannerUpload = async (e) => {
    e.preventDefault();
    if (!bannerFile) return;

    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append('banner', bannerFile);
      await api.post(`/events/${id}/banner`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBannerFile(null);
      await fetchEventDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Banner upload failed');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('eventId', id);
      await api.post('/gallery', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchGallery();
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
      await fetchGallery();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitComment = async (parentId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const value = parentId ? replyDrafts[parentId]?.trim() : commentText.trim();
    if (!value) return;

    setSubmittingComment(true);
    try {
      await api.post(`/events/${id}/comments`, {
        content: value,
        parentId: parentId || null
      });

      if (parentId) {
        setReplyDrafts((prev) => ({ ...prev, [parentId]: '' }));
        setActiveReplyTo('');
      } else {
        setCommentText('');
      }

      await Promise.all([fetchComments(), fetchEventDetails()]);
    } catch (err) {
      alert(err.response?.data?.message || 'Comment failed');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleToggleCommentHeart = async (commentId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await api.post(`/events/${id}/comments/${commentId}/heart`);
      await fetchComments();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not heart comment');
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const res = await api.post(`/follows/${event.organizer_id}/toggle`);
      setFollowingOrganizer(Boolean(res.data.is_following));
      setFollowerCount(res.data.follower_count || 0);
    } catch (err) {
      alert(err.response?.data?.message || 'Follow failed');
    }
  };

  const renderComment = (comment, isReply = false) => (
    <div key={comment.id} className={`rounded-[22px] border border-border p-4 ${isReply ? 'bg-bg-soft/60' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-ink">{comment.user_name}</span>
        <span className="text-xs text-muted">{new Date(comment.created_at).toLocaleString()}</span>
      </div>
      <p className="mt-3 text-sm text-muted">{comment.content}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!isReply && user && (
          <button onClick={() => setActiveReplyTo(activeReplyTo === comment.id ? '' : comment.id)} className="inline-flex items-center gap-1 rounded-full bg-bg-soft px-3 py-1.5 text-xs font-semibold text-muted transition-all duration-300 hover:bg-primary/8 hover:text-primary">
            <Reply className="h-3.5 w-3.5" />
            <span>Reply</span>
          </button>
        )}
        {comment.can_heart && (
          <button onClick={() => handleToggleCommentHeart(comment.id)} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 ${comment.is_hearted ? 'bg-danger/12 text-danger' : 'bg-bg-soft text-muted hover:bg-danger/8 hover:text-danger'}`}>
            <Heart className={`h-3.5 w-3.5 ${comment.is_hearted ? 'fill-current' : ''}`} />
            <span>{comment.hearts_count}</span>
          </button>
        )}
      </div>
      {!isReply && activeReplyTo === comment.id && (
        <div className="mt-4 space-y-3 rounded-[20px] border border-border bg-bg-soft/60 p-4">
          <textarea rows={2} className="textarea-base" placeholder="Write a reply..." value={replyDrafts[comment.id] || ''} onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [comment.id]: e.target.value }))} />
          <div className="flex gap-2">
            <button onClick={() => handleSubmitComment(comment.id)} className="btn-primary" disabled={submittingComment || !(replyDrafts[comment.id] || '').trim()}>{submittingComment ? 'Replying...' : 'Reply'}</button>
            <button onClick={() => setActiveReplyTo('')} className="btn-outline">Cancel</button>
          </div>
        </div>
      )}
      {comment.replies?.length > 0 && (
        <div className="mt-4 space-y-3 pl-4">
          {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-muted">Loading event details...</div>;
  }

  if (error || !event) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center font-bold text-danger">{error || 'Event not found'}</div>;
  }

  const isOrganizer = event.organizer_id === user?.id;
  const isAdmin = user?.roles?.includes('admin');
  const showAdminControls = isOrganizer || isAdmin;
  const hasEnded = event.status === 'completed' || new Date(event.end_date).getTime() <= Date.now();
  const canUploadGallery = Boolean(user) && !['cancelled', 'rejected'].includes(event.status);
  const canLeaveFeedback = Boolean(user) && hasEnded && !hasSubmittedFeedback && !['cancelled', 'rejected', 'draft'].includes(event.status);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 fade-in-section">
      <div className="relative mb-8 flex h-80 items-center justify-center overflow-hidden rounded-[32px] border border-border bg-bg-soft shadow-[0_24px_70px_-36px_rgba(93,56,145,0.22)]">
        {event.banner_url ? <img src={toAssetUrl(event.banner_url)} alt={event.title} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" /> : <span className="text-2xl font-bold text-primary/45">No Banner Image</span>}
        <div className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-sm font-semibold uppercase text-white shadow-sm">{event.status}</div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div>
            <h1 className="mb-4 text-4xl font-extrabold text-ink">{event.title}</h1>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">{event.category_name || 'Uncategorized'}</span>
              <span className="rounded-full bg-accent/12 px-3 py-1 text-xs font-semibold uppercase text-accent">{event.type}</span>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-muted">
              <div className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-current text-accent" /><span>{event.average_rating || 0}</span><span>({event.total_ratings || 0})</span></div>
              <div className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4 text-primary" /><span>{event.comment_count || 0} comments</span></div>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed text-muted">{event.description}</p>
          </div>

          <div className="card entrance-card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center text-lg font-bold text-ink"><ImageIcon className="mr-2 h-5 w-5 text-primary" />Event Gallery</h3>
              <div className="flex flex-wrap gap-2">
                <Link to={`/gallery/${id}`} className="btn-outline">Open Full Gallery</Link>
                {canUploadGallery && (
                  <label className="btn-primary cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <span>{uploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                  </label>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {gallery.length === 0 ? (
                <div className="col-span-3 py-6 text-center text-sm text-muted">No photos in gallery.</div>
              ) : (
                gallery.slice(0, 6).map((item) => (
                  <div key={item.id} className="group relative overflow-hidden rounded-[22px] border border-border bg-bg-soft shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_-28px_rgba(93,56,145,0.28)]">
                    <img src={toAssetUrl(item.photo_url)} alt="Gallery item" className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 flex items-end justify-between bg-ink/32 p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div>
                        <span className="block max-w-[60%] truncate text-xs text-white">{item.user_name}</span>
                        <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-white/80">{item.upload_phase || 'gallery'}</span>
                      </div>
                      {item.can_like && (
                        <button onClick={() => handleLikeItem(item.id)} className="flex items-center space-x-1 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-danger transition-all duration-300 hover:scale-105">
                          <Heart className={`h-3 w-3 ${item.is_liked ? 'fill-current' : ''}`} />
                          <span>{item.likes_count}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card entrance-card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center text-lg font-bold text-ink"><MessageSquare className="mr-2 h-5 w-5 text-primary" />Attendee Reviews</h3>
              {canLeaveFeedback && <Link to={`/feedback/${id}`} className="btn-primary">Leave Feedback</Link>}
            </div>

            {hasEnded ? (
              <>
                {ratingSummary.totalCount > 0 && (
                  <div className="mb-6 flex items-center space-x-4 border-b border-border pb-4">
                    <div className="text-4xl font-extrabold text-primary">{ratingSummary.averageRating}</div>
                    <div>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, index) => (
                          <Star key={index} className={`h-5 w-5 ${index < Math.round(ratingSummary.averageRating) ? 'fill-current text-accent' : 'text-border'}`} />
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
                    feedbacks.map((item) => (
                      <div key={item.id} className="rounded-[22px] border border-border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="text-sm font-semibold text-ink">{item.user_name}</span>
                            <span className="mt-1 block text-xs text-muted/75">{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, index) => (
                              <Star key={index} className={`h-4 w-4 ${index < item.rating ? 'fill-current text-accent' : 'text-border'}`} />
                            ))}
                          </div>
                        </div>
                        {item.comment && <p className="mt-3 text-sm text-muted">{item.comment}</p>}
                        {item.photo_url && <img src={toAssetUrl(item.photo_url)} alt="Review upload" className="mt-4 h-48 w-full rounded-[18px] object-cover" />}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted">Feedback opens after the event ends.</div>
            )}
          </div>

          <div className="card entrance-card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center text-lg font-bold text-ink"><MessageSquare className="mr-2 h-5 w-5 text-primary" />Comments</h3>
              <span className="text-sm text-muted">{comments.length}</span>
            </div>

            <div className="mb-6 space-y-3">
              <textarea rows={3} className="textarea-base" placeholder={user ? 'Write a comment...' : 'Sign in to comment'} value={commentText} onChange={(e) => setCommentText(e.target.value)} disabled={!user || submittingComment} />
              <button type="button" onClick={() => handleSubmitComment()} className="btn-primary" disabled={!user || submittingComment || !commentText.trim()}>{submittingComment ? 'Posting...' : 'Post Comment'}</button>
            </div>

            <div className="space-y-4">
              {comments.length === 0 ? <div className="py-4 text-center text-sm text-muted">No comments yet.</div> : comments.map((comment) => renderComment(comment))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card entrance-card space-y-4 p-6">
            <h3 className="text-lg font-bold text-ink">Event Info</h3>
            <div className="space-y-3 text-sm text-muted">
              <div className="flex items-center"><Calendar className="mr-3 h-5 w-5 text-primary" /><div><div className="font-semibold text-ink">Date & Time</div><div>{new Date(event.start_date).toLocaleString()}</div></div></div>
              <div className="flex items-center"><MapPin className="mr-3 h-5 w-5 text-accent" /><div><div className="font-semibold text-ink">Location</div><div>{event.location || 'Online'}</div></div></div>
              <div className="flex items-center"><Users className="mr-3 h-5 w-5 text-primary" /><div><div className="font-semibold text-ink">Capacity</div><div>{event.capacity} total seats</div></div></div>
            </div>

            <div className="rounded-[22px] border border-border bg-bg-soft p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-ink">{event.organizer_name}</div>
                  <div className="text-xs text-muted">{followerCount} followers</div>
                </div>
                {user?.id !== event.organizer_id && (
                  <button onClick={handleToggleFollow} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90">
                    <UserPlus className="h-4 w-4" />
                    {followingOrganizer ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            {user ? (
              <>
                {registration ? (
                  <div className="space-y-3 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-muted">Your Status:</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${registration.status === 'confirmed' ? 'bg-success/12 text-success' : 'bg-accent/12 text-accent'}`}>{registration.status}</span>
                    </div>
                    {registration.status === 'confirmed' && <Link to="/tickets" className="block w-full rounded-2xl bg-success px-4 py-2 text-center text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-success/90">View Ticket</Link>}
                    <button onClick={handleCancelRegistration} className="block w-full rounded-2xl bg-danger/10 px-4 py-2 text-center text-sm font-medium text-danger transition-all duration-300 hover:-translate-y-0.5 hover:bg-danger/14">Cancel Registration</button>
                  </div>
                ) : (
                  event.status === 'published' && <button onClick={handleRegisterRedirect} className="btn-primary w-full">Register Now</button>
                )}
              </>
            ) : (
              <Link to="/login" className="btn-primary w-full">Sign In to Register</Link>
            )}
          </div>

          {showAdminControls && (
            <div className="card entrance-card space-y-4 p-6">
              <h3 className="text-lg font-bold text-ink">Organizer Controls</h3>

              <div className="flex flex-col space-y-2">
                {event.status === 'draft' && <button onClick={handlePublish} className="btn-primary w-full">Publish Event</button>}
                {event.status === 'published' && (
                  <>
                    <button onClick={handleCompleteEvent} className="w-full rounded-2xl bg-success px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-success/90">Mark as Completed</button>
                    <button onClick={handleCancelEvent} className="w-full rounded-2xl bg-danger px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-danger/92">Cancel Event</button>
                  </>
                )}
              </div>

              <form onSubmit={handleBannerUpload} className="space-y-3 border-t border-border pt-4">
                <label className="block text-xs font-semibold uppercase text-muted">Change Banner</label>
                <input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} className="input-base text-xs text-muted file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-primary/90" />
                <button type="submit" disabled={uploadingBanner || !bannerFile} className="w-full rounded-2xl bg-ink px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/92 disabled:opacity-50">{uploadingBanner ? 'Uploading...' : 'Upload'}</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
