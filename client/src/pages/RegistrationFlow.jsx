import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Users, Plus, Trash2, ArrowLeft } from 'lucide-react';

export default function RegistrationFlow() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get(`/events/${id}`);
        setEvent(res.data);
      } catch (err) {
        setError('Failed to fetch event');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const handleAddMember = () => {
    setMembers(prev => [...prev, { name: '', email: '' }]);
  };

  const handleRemoveMember = (idx) => {
    setMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMemberChange = (idx, field, val) => {
    setMembers(prev =>
      prev.map((m, i) => i === idx ? { ...m, [field]: val } : m)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/registrations', {
        eventId: id,
        members: members.filter(m => m.name.trim() && m.email.trim())
      });

      const { status } = res.data;
      if (status === 'confirmed') {
        alert('Registration confirmed successfully!');
      } else {
        alert('You have been added to the waitlist. We will notify you once spots open up!');
      }
      navigate('/tickets');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-muted">Loading registration form...</div>;
  }

  if (error && !event) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-center font-bold text-danger">{error}</div>;
  }

  return (
    <div className="page-shell py-8 sm:py-10 fade-in-section">
      <button onClick={() => navigate(`/event/${id}`)} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted transition-all duration-300 hover:-translate-x-0.5 hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Back to event
      </button>

      <div className="card entrance-card p-6 sm:p-8">
        <div className="mb-6 flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-ink">Register for event</h2>
          <h3 className="text-lg font-semibold text-primary">{event.title}</h3>
        </div>

        {error && <div className="alert-error mb-6">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-3xl border border-border bg-bg-soft p-4">
            <h4 className="text-sm font-semibold text-ink">Primary attendee</h4>
            <p className="mt-1 text-sm text-muted">Your profile information will be used as the main registration entry.</p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Users className="h-4 w-4 text-primary" />
                Additional team members (optional)
              </h4>
              <button type="button" onClick={handleAddMember} className="btn-outline flex items-center gap-2 self-start">
                <Plus className="h-4 w-4" />
                Add member
              </button>
            </div>

            {members.map((member, idx) => (
              <div key={idx} className="rounded-3xl border border-border bg-bg-soft p-4 entrance-card">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <div>
                    <label className="label-base">Name</label>
                    <input type="text" required className="input-base" value={member.name} onChange={(e) => handleMemberChange(idx, 'name', e.target.value)} />
                  </div>
                  <div>
                    <label className="label-base">Email</label>
                    <input type="email" required className="input-base" value={member.email} onChange={(e) => handleMemberChange(idx, 'email', e.target.value)} />
                  </div>
                  <button type="button" onClick={() => handleRemoveMember(idx)} className="flex items-center justify-center rounded-2xl border border-danger/20 bg-danger/10 p-2.5 text-danger transition-all duration-300 hover:-translate-y-0.5 hover:bg-danger/14" aria-label="Remove member">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
            {submitting ? 'Registering…' : 'Confirm registration'}
          </button>
        </form>
      </div>
    </div>
  );
}
