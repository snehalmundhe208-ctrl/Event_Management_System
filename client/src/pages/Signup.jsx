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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(93,56,145,0.14),_transparent_32%),radial-gradient(circle_at_top_left,_rgba(247,148,29,0.16),_transparent_28%),linear-gradient(180deg,_#EDE3E3_0%,_#F5F4F4_100%)] px-4 py-10 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="mx-auto flex max-w-6xl w-full flex-col overflow-hidden rounded-[32px] border border-border bg-surface shadow-[0_24px_70px_-34px_rgba(93,56,145,0.22)] lg:flex-row">
        <div className="flex-1 bg-primary p-8 text-white sm:p-10 lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90">
            <Sparkles className="h-4 w-4 text-accent" />
            Start with a strong foundation
          </div>
          <h1 className="mt-8 text-3xl font-semibold leading-tight sm:text-4xl">Create your account and unlock the full event workflow.</h1>
          <p className="mt-4 max-w-md text-base text-white/80 sm:text-lg">Join as an attendee or organizer and move seamlessly from discovery to registration and check-in.</p>
        </div>

        <div className="flex-1 p-8 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-md">
            <div className="mb-8 text-center animate-soft-pop">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_16px_32px_-18px_rgba(93,56,145,0.72)] transition-transform duration-300 hover:rotate-6">
                <UserPlus className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-semibold text-ink">Create an account</h2>
              <p className="mt-2 text-sm text-muted">A thoughtful sign-up experience for every role.</p>
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
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-bg-soft px-4 py-3 text-sm text-muted transition-all duration-300 hover:border-primary/25 cursor-pointer">
                <input id="roles" name="roles" type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40 focus:ring-offset-0 cursor-pointer" checked={isOrganizer} onChange={(e) => setIsOrganizer(e.target.checked)} />
                I want to organize events as well
              </label>
              <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-muted">
              Already have an account? <Link to="/login" className="font-semibold text-primary transition-all duration-300 hover:text-primary/80">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
