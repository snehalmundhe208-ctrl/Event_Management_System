import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Star, ArrowLeft } from 'lucide-react';

export default function FeedbackSubmission() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get(`/events/${eventId}`);
        setEvent(res.data);
      } catch (err) {
        setError('Failed to fetch event details');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/feedback', {
        eventId,
        rating,
        comment
      });
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
