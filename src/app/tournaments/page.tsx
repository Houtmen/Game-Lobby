"use client";
import { useEffect, useState } from 'react';
import type { Tournament } from '@/types/phase4c';
import Link from 'next/link';
import { Button, buttonClasses } from '@/components/ui';

export default function TournamentsPage() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [name, setName] = useState('');
  const [gameId, setGameId] = useState('');
  const [status, setStatus] = useState<'upcoming' | 'active' | 'completed'>('upcoming');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/tournaments', window.location.origin);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setItems(data.tournaments || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, gameId, status }),
      });
      if (!res.ok) throw new Error('Create failed');
      setName('');
      setGameId('');
      setStatus('upcoming');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!token) return;
    await fetch(`/api/tournaments?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  };

  if (!token)
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-300 mb-6">Please log in to manage tournaments.</p>
          <Link href="/login" className={buttonClasses('blue')}>Go to Login</Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-400">Tournaments</h1>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-600">
          <h2 className="text-xl font-semibold mb-4">Create Tournament</h2>
          <form onSubmit={create} className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-sm text-gray-300">Name</label>
              <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-300">Game ID</label>
              <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1" value={gameId} onChange={(e) => setGameId(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-300">Status</label>
              <select className="bg-gray-900 border border-gray-700 rounded px-2 py-1" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="upcoming">upcoming</option>
                <option value="active">active</option>
                <option value="completed">completed</option>
              </select>
            </div>
            <Button disabled={loading} type="submit" variant="green">Create</Button>
          </form>
        </div>

        {error && <div className="bg-red-800 border border-red-600 text-red-200 px-4 py-3 rounded mb-4">{error}</div>}
        {loading && <div className="text-gray-300 mb-2">Loading…</div>}

        <ul className="space-y-3">
          {items.map((t) => (
            <li key={t.id} className="bg-gray-800 border border-gray-600 rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">{t.name}</div>
                <div className="text-xs text-gray-400">gameId: {t.gameId} • status: {t.status}</div>
              </div>
              <Button variant="rose" onClick={() => remove(t.id)}>Delete</Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
