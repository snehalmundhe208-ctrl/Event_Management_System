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
    return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-500">Loading registration form...</div>;
  }

  if (error && !event) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-red-600 font-bold">{error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/event/${id}`)}
        className="flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Event
      </button>

      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Register for Event</h2>
        <h3 className="text-lg font-semibold text-indigo-600 mb-6">{event.title}</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h4 className="font-semibold text-gray-800 text-sm mb-1">Primary Attendee</h4>
            <p className="text-gray-500 text-xs">Your profile details will be registered as the main attendee.</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-gray-800 flex items-center">
                <Users className="h-4 w-4 mr-1.5 text-indigo-600" />
                Additional Team Members (Optional)
              </h4>
              <button
                type="button"
                onClick={handleAddMember}
                className="flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded transition-colors"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Member
              </button>
            </div>

            {members.map((member, idx) => (
              <div key={idx} className="flex gap-4 items-center bg-gray-50 p-4 rounded-md border border-gray-200 relative">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                      value={member.name}
                      onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                    <input
                      type="email"
                      required
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                      value={member.email}
                      onChange={(e) => handleMemberChange(idx, 'email', e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(idx)}
                  className="text-red-500 hover:text-red-600 transition-colors p-1.5 mt-5"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded transition-colors disabled:opacity-50 text-sm"
          >
            {submitting ? 'Registering...' : 'Confirm Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}
