import React, { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { submitContactMessage } from '../services/api';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitContactMessage(formData);
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message || 'Unable to send message right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-extrabold text-slate-950 dark:text-white">
            Contact Us
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Questions, feedback, or data source inquiries for SportsNetwork.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-2">
            <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Message Received
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Thanks for reaching out. Your note has been logged.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0D111A] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0D111A] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Message
              </label>
              <textarea
                rows={4}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0D111A] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
            >
              <Send size={14} />
              <span>{loading ? 'Sending...' : 'Send Message'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
