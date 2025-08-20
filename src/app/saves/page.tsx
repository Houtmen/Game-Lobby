"use client";
import { useEffect, useState } from 'react';
import type { SaveState } from '@/types/phase4c';
import Link from 'next/link';
import { Button, buttonClasses } from '@/components/ui';

export default function SavesPage() {
  const [items, setItems] = useState<SaveState[]>([]);
  const [filterGameId, setFilterGameId] = useState('');
  const [gameId, setGameId] = useState('');
  const [storageKey, setStorageKey] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
  const url = new URL('/api/saves', window.location.origin);
  if (filterGameId) url.searchParams.set('gameId', filterGameId);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setItems(data.saves || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token, filterGameId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameId, storageKey, notes }),
      });
      if (!res.ok) throw new Error('Create failed');
      setGameId('');
      setStorageKey('');
      setNotes('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!token) return;
    await fetch(`/api/saves?id=${encodeURIComponent(id)}`, {
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
          <p className="text-gray-300 mb-6">Please log in to manage saves.</p>
          <Link href="/login" className={buttonClasses('blue')}>Go to Login</Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-400">Saves</h1>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-600">
          <h2 className="text-xl font-semibold mb-4">Create Save</h2>
          <form onSubmit={create} className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-sm text-gray-300">Game ID</label>
              <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1" value={gameId} onChange={(e) => setGameId(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-300">Storage Key</label>
              <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1" value={storageKey} onChange={(e) => setStorageKey(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-300">Notes</label>
              <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button disabled={loading} type="submit" variant="green">Create</Button>
          </form>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-600">
          <h2 className="text-xl font-semibold mb-3">Filters</h2>
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-sm text-gray-300">Filter by Game ID</label>
              <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1" value={filterGameId} onChange={(e) => setFilterGameId(e.target.value)} />
            </div>
            <Button onClick={load} disabled={loading} variant="blue">{loading ? 'Refreshing…' : 'Refresh'}</Button>
          </div>
        </div>

        {error && <div className="bg-red-800 border border-red-600 text-red-200 px-4 py-3 rounded mb-4">{error}</div>}
        {loading && <div className="text-gray-300 mb-2">Loading…</div>}

        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id} className="bg-gray-800 border border-gray-600 rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">{s.storageKey}</div>
                <div className="text-xs text-gray-400">gameId: {s.gameId}</div>
              </div>
              <Button variant="rose" onClick={() => remove(s.id)}>Delete</Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
