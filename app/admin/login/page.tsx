'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ADMIN_PASSWORD = 'admin123'; // Change this to your desired password

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      // Store authentication in sessionStorage
      sessionStorage.setItem('adminAuthenticated', 'true');
      router.push('/admin');
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 sm:p-8">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl sm:text-3xl font-bold text-black">
            Booking Site
          </Link>
          <h2 className="text-xl sm:text-2xl font-bold text-black mt-4">Admin Login</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Enter password to access admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="w-full border border-gray-300 rounded-md px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter admin password"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full px-4 py-2 bg-sky-400 text-white rounded-md hover:bg-indigo-700 font-medium"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-sky-400 hover:text-indigo-800"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}



