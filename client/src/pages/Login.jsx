import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn, ShieldCheck, Sparkles } from 'lucide-react';

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_35%),linear-gradient(135deg,_#eef2ff_0%,_#f8fafc_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_32px_100px_-40px_rgba(15,23,42,0.45)] lg:flex-row">
        <div className="flex-1 bg-slate-950 p-8 text-white sm:p-10 lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-slate-200">
            <Sparkles className="h-4 w-4 text-indigo-300" />
            Secure attendee and organizer access
          </div>
          <h1 className="mt-8 text-3xl font-semibold leading-tight sm:text-4xl">Welcome back to a more polished event experience.</h1>
          <p className="mt-4 max-w-md text-base text-slate-300 sm:text-lg">Manage tickets, scan check-ins, and track every detail from one streamlined dashboard.</p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-slate-200">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-indigo-300" />
              <p>Protected sessions, clear activity feedback, and a consistent experience across every page.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-md">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                <LogIn className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-semibold text-slate-900">Sign in</h2>
              <p className="mt-2 text-sm text-slate-500">Continue with your existing account.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && <div className="alert-error">{error}</div>}
              <div>
                <label htmlFor="email-address" className="label-base">Email address</label>
                <input id="email-address" name="email" type="email" required className="input-base" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
              </div>
              <div>
                <label htmlFor="password" className="label-base">Password</label>
                <input id="password" name="password" type="password" required className="input-base" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              New here? <Link to="/signup" className="font-semibold text-indigo-600 transition hover:text-indigo-700">Create an account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
