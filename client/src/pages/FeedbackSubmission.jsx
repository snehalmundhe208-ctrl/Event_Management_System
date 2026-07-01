import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Star, ArrowLeft, ImagePlus, X } from 'lucide-react';
import { toAssetUrl } from '../utils/assets';

export default function FeedbackSubmission() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get(`/events/${eventId}`);
        setEvent(res.data);
      } catch {
        setError('Failed to fetch event details');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0] || null;

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : '');
  };

  const clearPhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(null);
    setPhotoPreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('eventId', eventId);
      formData.append('rating', rating);
      formData.append('comment', comment);
      if (photo) {
        formData.append('photo', photo);
      }

      await api.post('/feedback', formData);
      alert('Thank you for your feedback!');
      navigate(`/event/${eventId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-md mx-auto px-4 py-12 text-center text-muted">Loading form...</div>;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:px-6 lg:px-8 fade-in-section">
      <button
        onClick={() => navigate(`/event/${eventId}`)}
        className="mb-6 inline-flex items-center text-sm font-medium text-muted transition-all duration-300 hover:-translate-x-0.5 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Event
      </button>

      <div className="card entrance-card space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Event Feedback</h2>
          <p className="mt-1 text-sm text-muted">Share your thoughts on: <span className="font-semibold text-primary">{event?.title}</span></p>
        </div>

        {event?.banner_url && (
          <img
            src={toAssetUrl(event.banner_url)}
            alt={event.title}
            className="h-48 w-full rounded-[24px] object-cover"
          />
        )}

        {error && (
          <div className="alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-ink">Rating:</span>
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                type="button"
                key={val}
                onClick={() => setRating(val)}
                className="p-0.5 text-accent transition-transform duration-300 hover:scale-110"
              >
                <Star className={`h-8 w-8 ${val <= rating ? 'fill-current' : 'text-border'}`} />
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Your Comment (Optional)</label>
            <textarea
              rows={4}
              placeholder="Tell us what you liked or how we can improve..."
              className="textarea-base"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-ink">Photo (Optional)</label>
            {!photoPreview ? (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[24px] border border-dashed border-border bg-bg-soft px-4 py-8 text-sm font-medium text-muted transition-all duration-300 hover:border-primary/35 hover:text-primary">
                <ImagePlus className="h-5 w-5" />
                <span>Upload review photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
            ) : (
              <div className="relative overflow-hidden rounded-[24px] border border-border">
                <img src={photoPreview} alt="Feedback preview" className="h-56 w-full object-cover" />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute right-3 top-3 rounded-full bg-white/95 p-2 text-ink shadow-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}
