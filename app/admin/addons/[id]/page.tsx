'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { AddOn } from '@/types';
import { minutesToHoursMinutes, hoursMinutesToMinutes } from '@/lib/utils';

export default function EditAddOnPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [formData, setFormData] = useState<AddOn | null>(null);
  const [loading, setLoading] = useState(true);
  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);

  useEffect(() => {
    fetch(`/api/addons/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setFormData(data);
        if (data.duration) {
          const { hours, minutes } = minutesToHoursMinutes(data.duration);
          setDurationHours(hours);
          setDurationMinutes(minutes);
        }
        setLoading(false);
      });
  }, [id]);

  const handleDurationChange = (hours: number, minutes: number) => {
    setDurationHours(hours);
    setDurationMinutes(minutes);
    if (formData) {
      const totalMinutes = hoursMinutesToMinutes(hours, minutes);
      setFormData({ ...formData, duration: totalMinutes > 0 ? totalMinutes : undefined });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    await fetch(`/api/addons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    router.push('/admin');
  };

  if (loading || !formData) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-black/90 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-white">
                Booking Site
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="px-4 py-2 text-black hover:text-black font-medium"
              >
                Back to Admin
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-black mb-8">Edit Add-on</h1>
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Description</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Price ($)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Additional Duration (optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    min="0"
                    value={durationHours}
                    onChange={(e) => {
                      const hours = Math.max(0, parseInt(e.target.value) || 0);
                      handleDurationChange(hours, durationMinutes);
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Hours"
                  />
                  <span className="text-xs text-gray-600">Hours</span>
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={durationMinutes}
                    onChange={(e) => {
                      const minutes = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                      handleDurationChange(durationHours, minutes);
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Minutes"
                  />
                  <span className="text-xs text-gray-600">Minutes</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              type="submit"
              className="px-4 py-2 bg-sky-400 text-black rounded-md hover:bg-indigo-700"
            >
              Save Changes
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 bg-gray-200 text-black rounded-md hover:bg-gray-300"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

