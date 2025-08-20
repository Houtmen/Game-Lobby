"use client";
import { useEffect, useState } from 'react';
import type { SessionRecording } from '@/types/phase4c';
import Link from 'next/link';
import { Button, buttonClasses } from '@/components/ui';

export default function RecordingsPage() {
  const [items, setItems] = useState<SessionRecording[]>([]);
  const [filterSessionId, setFilterSessionId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [gameId, setGameId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
  const url = new URL('/api/recordings', window.location.origin);
  if (filterSessionId) url.searchParams.set('sessionId', filterSessionId);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setItems(data.recordings || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token, filterSessionId]);

  const startRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId, gameId }),
      });
      if (!res.ok) throw new Error('Create failed');
      setSessionId('');
      setGameId('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const complete = async (id: string) => {
    if (!token) return;
    await fetch(`/api/recordings?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    await load();
  };

  const remove = async (id: string) => {
    if (!token) return;
    await fetch(`/api/recordings?id=${encodeURIComponent(id)}`, {
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
          <p className="text-gray-300 mb-6">Please log in to manage recordings.</p>
          <Link href="/login" className={buttonClasses('blue')}>Go to Login</Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-400">Recordings</h1>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-600">
          <h2 className="text-xl font-semibold mb-4">Start Recording</h2>
          <form onSubmit={startRecording} className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-sm text-gray-300">Session ID</label>
              <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-300">Game ID</label>
              <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1" value={gameId} onChange={(e) => setGameId(e.target.value)} />
            </div>
            <Button disabled={loading} type="submit" variant="green">Start</Button>
          </form>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-600">
          <h2 className="text-xl font-semibold mb-3">Filters</h2>
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-sm text-gray-300">Filter by Session ID</label>
              <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1" value={filterSessionId} onChange={(e) => setFilterSessionId(e.target.value)} />
            </div>
            <Button onClick={load} disabled={loading} variant="blue">{loading ? 'Refreshing…' : 'Refresh'}</Button>
          </div>
        </div>

        {error && <div className="bg-red-800 border border-red-600 text-red-200 px-4 py-3 rounded mb-4">{error}</div>}
        {loading && <div className="text-gray-300 mb-2">Loading…</div>}

        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="bg-gray-800 border border-gray-600 rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">{r.status}</div>
                <div className="text-xs text-gray-400">session: {r.sessionId} • game: {r.gameId}</div>
              </div>
              <div className="flex gap-2">
                {r.status !== 'completed' && (
                  <Button variant="amber" onClick={() => complete(r.id)}>Complete</Button>
                )}
                <Button variant="rose" onClick={() => remove(r.id)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
