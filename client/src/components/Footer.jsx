import React from 'react';
import { CalendarDays, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border/70 bg-bg-soft/85 backdrop-blur">
      <div className="page-shell flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 transition-transform duration-300 hover:scale-[1.01]">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_16px_32px_-18px_rgba(93,56,145,0.72)] transition-transform duration-300 hover:-translate-y-0.5">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-ink">EventSphere</p>
            <p className="text-sm text-muted">Professional event operations for modern teams.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:bg-accent/10 hover:text-ink">
            <Sparkles className="h-4 w-4 text-accent" />
            Designed for elegant, reliable experiences
          </span>
        </div>
      </div>
    </footer>
  );
}
