import React, { useState, useEffect, useContext } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { Search, Calendar, MapPin, Plus, X } from 'lucide-react';

export default function Events() {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);

  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categoryId') || '');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newType, setNewType] = useState('in-person');
  const [newLocation, setNewLocation] = useState('');
  const [newCapacity, setNewCapacity] = useState('50');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newTags, setNewTags] = useState([]);
  const [newBannerFile, setNewBannerFile] = useState(null);
  const [createError, setCreateError] = useState('');

  const fetchFilters = async () => {
    try {
      const catRes = await api.get('/events/categories');
      setCategories(catRes.data);
      const tagRes = await api.get('/events/tags');
      setTags(tagRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvents = async () => {
    try {
      const params = {};
      if (keyword) params.keyword = keyword;
      if (selectedCategory) params.categoryId = selectedCategory;
      if (selectedTag) params.tagId = selectedTag;
      if (selectedType) params.type = selectedType;
      if (startDate) params.startDate = new Date(startDate).toISOString();
      if (endDate) params.endDate = new Date(endDate).toISOString();

      const res = await api.get('/events', { params });
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [keyword, selectedCategory, selectedTag, selectedType, startDate, endDate]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      const eventData = {
        title: newTitle,
        description: newDesc,
        categoryId: newCategory || null,
        startDate: new Date(newStart).toISOString(),
        endDate: new Date(newEnd).toISOString(),
        type: newType,
        location: newLocation,
        capacity: parseInt(newCapacity, 10),
        tags: newTags
      };

      const res = await api.post('/events', eventData);
      const createdEvent = res.data;

      if (newBannerFile) {
        const formData = new FormData();
        formData.append('banner', newBannerFile);
        await api.post(`/events/${createdEvent.id}/banner`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setShowCreateModal(false);
      fetchEvents();
      setNewTitle('');
      setNewDesc('');
      setNewCategory('');
      setNewLocation('');
      setNewStart('');
      setNewEnd('');
      setNewTags([]);
      setNewBannerFile(null);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create event');
    }
  };

  const toggleTagSelection = (tagId) => {
    setNewTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const isOrganizerOrAdmin = user?.roles?.includes('organizer') || user?.roles?.includes('admin');

  return (
    <div className="page-shell py-8 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Discover events</h1>
          <p className="page-subtitle">Search, filter, and discover meaningful experiences crafted for every audience.</p>
        </div>
        {isOrganizerOrAdmin && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2 self-start">
            <Plus className="h-5 w-5" />
            <span>Create event</span>
          </button>
        )}
      </div>

      <div className="card mb-8 p-5 sm:p-6">
        <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 shadow-sm">
          <Search className="mr-2 h-5 w-5 text-slate-400" />
          <input type="text" placeholder="Search by keyword..." className="w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
          <div>
            <label className="label-base">Category</label>
            <select className="select-base" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="label-base">Tag</label>
            <select className="select-base" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
              <option value="">All tags</option>
              {tags.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
          <div>
            <label className="label-base">Type</label>
            <select className="select-base" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="">All types</option>
              <option value="in-person">In-person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="label-base">Start date</label>
            <input type="date" className="input-base" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label-base">End date</label>
            <input type="date" className="input-base" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {events.length === 0 ? (
          <div className="card col-span-full flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-slate-700">No events match your filters right now.</p>
            <p className="mt-2 max-w-md text-sm text-slate-500">Try expanding the search or explore the full event list later.</p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="card-hover overflow-hidden">
              {event.banner_url ? (
                <img src={`http://localhost:5000${event.banner_url}`} alt={event.title} className="h-48 w-full object-cover transition duration-300 group-hover:scale-105" />
              ) : (
                <div className="flex h-48 w-full items-center justify-center bg-slate-100 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">No image</div>
              )}
              <div className="p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="badge-primary">{event.type}</span>
                  <span className="text-xs font-medium text-slate-500">Capacity {event.capacity}</span>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900"><Link to={`/event/${event.id}`} className="transition hover:text-indigo-600">{event.title}</Link></h3>
                <p className="mb-4 line-clamp-2 text-sm text-slate-600">{event.description}</p>
                <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-indigo-500" /><span>{new Date(event.start_date).toLocaleDateString()}</span></div>
                  <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-indigo-500" /><span className="line-clamp-1">{event.location || 'Online'}</span></div>
                </div>
                <div className="mb-5 flex flex-wrap gap-2">
                  {Array.isArray(event.tags) && event.tags.map((t, idx) => (<span key={idx} className="badge-outline">#{t}</span>))}
                </div>
                <Link to={`/event/${event.id}`} className="btn-outline w-full">View details</Link>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <h3 className="text-2xl font-bold text-slate-100 mb-6">Create Event (Draft)</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4 max-h-[70vh] overflow-y-auto">
              {createError && (
                <div className="alert-error">
                  {createError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label-base">Title</label>
                  <input
                    type="text"
                    required
                    className="input-base"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="label-base">Description</label>
                  <textarea
                    required
                    rows={3}
                    className="textarea-base"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-base">Category</label>
                  <select
                    className="select-base"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-base">Type</label>
                  <select
                    className="select-base"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                  >
                    <option value="in-person">In-Person</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="label-base">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    className="input-base"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-base">End Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    className="input-base"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-base">Capacity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="input-base"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-base">Location (URL or Address)</label>
                  <input
                    type="text"
                    className="input-base"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="label-base">Banner Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="input-base file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-slate-100 hover:file:bg-slate-700"
                    onChange={(e) => setNewBannerFile(e.target.files[0])}
                  />
                  {newBannerFile && (
                    <p className="mt-2 text-xs text-slate-400">Selected: {newBannerFile.name}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="label-base mb-3">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(t => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => toggleTagSelection(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          newTags.includes(t.id)
                            ? 'btn-primary'
                            : 'btn-outline'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
