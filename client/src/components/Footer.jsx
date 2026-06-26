import React from 'react';
import { CalendarDays, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white/80 backdrop-blur">
      <div className="page-shell flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">EventSphere</p>
            <p className="text-sm text-slate-500">Professional event operations for modern teams.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            Designed for elegant, reliable experiences
          </span>
        </div>
      </div>
    </footer>
  );
}
