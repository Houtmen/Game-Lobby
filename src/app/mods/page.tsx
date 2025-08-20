"use client";
import { useEffect, useState } from 'react';
import type { GameMod } from '@/types/phase4c';
import Link from 'next/link';
import { Button, buttonClasses } from '@/components/ui';

export default function ModsPage() {
  const [mods, setMods] = useState<GameMod[]>([]);
  const [filterGameId, setFilterGameId] = useState('');
  const [gameId, setGameId] = useState('');
  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
  const url = new URL('/api/mods', window.location.origin);
  if (filterGameId) url.searchParams.set('gameId', filterGameId);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMods(data.mods || []);
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
      const res = await fetch('/api/mods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameId, name, enabled }),
      });
      if (!res.ok) throw new Error('Create failed');
      setGameId('');
      setName('');
      setEnabled(true);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!token) return;
    await fetch(`/api/mods?id=${encodeURIComponent(id)}`, {
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
          <p className="text-gray-300 mb-6">Please log in to manage mods.</p>
          <Link href="/login" className={buttonClasses('blue')}>Go to Login</Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-400">Mods</h1>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-600">
          <h2 className="text-xl font-semibold mb-4">Create Mod</h2>
          <form onSubmit={create} className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-sm text-gray-300">Game ID</label>
              <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1" value={gameId} onChange={(e) => setGameId(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-300">Name</label>
              <input className="bg-gray-900 border border-gray-700 rounded px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 text-gray-200">
              <input id="enabled" type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              <label htmlFor="enabled">Enabled</label>
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
          {mods.map((m) => (
            <li key={m.id} className="bg-gray-800 border border-gray-600 rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium flex items-center gap-2 text-white">
                  {m.name}
                  <span className={"text-xs px-1 rounded border " + (m.enabled ? 'border-green-600 text-green-300' : 'border-gray-500 text-gray-300')}>
                    {m.enabled ? 'enabled' : 'disabled'}
                  </span>
                </div>
                <div className="text-xs text-gray-400">gameId: {m.gameId}</div>
              </div>
              <div className="flex gap-2 items-center">
                <Button
                  variant="amber"
                  onClick={async () => {
                    if (!token) return;
                    await fetch(`/api/mods?id=${encodeURIComponent(m.id)}&toggle=enabled`, {
                      method: 'PATCH',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    await load();
                  }}
                >
                  Toggle
                </Button>
                <Button variant="rose" onClick={() => remove(m.id)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
