import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, Sparkles } from 'lucide-react';

export default function Signup() {
  const { signup } = useContext(AuthContext);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const roles = ['attendee'];
      if (isOrganizer) {
        roles.push('organizer');
      }
      await signup({ name, email, password, roles });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.18),_transparent_35%),linear-gradient(135deg,_#eef2ff_0%,_#f8fafc_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_32px_100px_-40px_rgba(15,23,42,0.45)] lg:flex-row">
        <div className="flex-1 bg-slate-900 p-8 text-white sm:p-10 lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-slate-200">
            <Sparkles className="h-4 w-4 text-indigo-300" />
            Start with a strong foundation
          </div>
          <h1 className="mt-8 text-3xl font-semibold leading-tight sm:text-4xl">Create your account and unlock the full event workflow.</h1>
          <p className="mt-4 max-w-md text-base text-slate-300 sm:text-lg">Join as an attendee or organizer and move seamlessly from discovery to registration and check-in.</p>
        </div>

        <div className="flex-1 p-8 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-md">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                <UserPlus className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-semibold text-slate-900">Create an account</h2>
              <p className="mt-2 text-sm text-slate-500">A thoughtful sign-up experience for every role.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && <div className="alert-error">{error}</div>}
              <div>
                <label htmlFor="full-name" className="label-base">Full name</label>
                <input id="full-name" name="name" type="text" required className="input-base" placeholder="Alex Morgan" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="email-address" className="label-base">Email address</label>
                <input id="email-address" name="email" type="email" required className="input-base" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label htmlFor="password" className="label-base">Password</label>
                <input id="password" name="password" type="password" required minLength={6} className="input-base" placeholder="Minimum 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <input id="roles" name="roles" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={isOrganizer} onChange={(e) => setIsOrganizer(e.target.checked)} />
                I want to organize events as well
              </label>
              <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Already have an account? <Link to="/login" className="font-semibold text-indigo-600 transition hover:text-indigo-700">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
