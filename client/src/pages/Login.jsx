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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(93,56,145,0.14),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(247,148,29,0.16),_transparent_28%),linear-gradient(180deg,_#EDE3E3_0%,_#F5F4F4_100%)] px-4 py-10 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="mx-auto flex max-w-6xl w-full flex-col overflow-hidden rounded-[32px] border border-border bg-surface shadow-[0_24px_70px_-34px_rgba(93,56,145,0.22)] lg:flex-row">
        <div className="flex-1 bg-primary p-8 text-white sm:p-10 lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90">
            <Sparkles className="h-4 w-4 text-accent" />
            Secure attendee and organizer access
          </div>
          <h1 className="mt-8 text-3xl font-semibold leading-tight sm:text-4xl">Welcome back to a more polished event experience.</h1>
          <p className="mt-4 max-w-md text-base text-white/80 sm:text-lg">Manage tickets, scan check-ins, and track every detail from one streamlined dashboard.</p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-white/90">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-accent" />
              <p>Protected sessions, clear activity feedback, and a consistent experience across every page.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-md">
            <div className="mb-8 text-center animate-soft-pop">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_16px_32px_-18px_rgba(93,56,145,0.72)] transition-transform duration-300 hover:rotate-6">
                <LogIn className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-semibold text-ink">Sign in</h2>
              <p className="mt-2 text-sm text-muted">Continue with your existing account.</p>
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

            <div className="mt-6 text-center text-sm text-muted">
              New here? <Link to="/signup" className="font-semibold text-primary transition-all duration-300 hover:text-primary/80">Create an account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
