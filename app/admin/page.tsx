'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Service, AddOn, Booking, Availability, Customer } from '@/types';
import Calendar from '@/components/Calendar';
import { formatTimeToAMPM, formatDuration } from '@/lib/utils';

export default function AdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeTab, setActiveTab] = useState<'services' | 'addons' | 'bookings' | 'availability' | 'calendar' | 'customers'>('services');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    if (typeof window !== 'undefined') {
      const authenticated = sessionStorage.getItem('adminAuthenticated') === 'true';
      if (!authenticated) {
        window.location.href = '/admin/login';
        return;
      }
      setIsAuthenticated(true);
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    const [servicesRes, addOnsRes, bookingsRes, customersRes] = await Promise.all([
      fetch('/api/services'),
      fetch('/api/addons'),
      fetch('/api/bookings'),
      fetch('/api/customers'),
    ]);
    setServices(await servicesRes.json());
    setAddOns(await addOnsRes.json());
    setBookings(await bookingsRes.json());
    setCustomers(await customersRes.json());
  };

  const handleDeleteService = async (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      await fetch(`/api/services/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleDeleteAddOn = async (id: string) => {
    if (confirm('Are you sure you want to delete this add-on?')) {
      await fetch(`/api/addons/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (confirm('Are you sure you want to delete this booking?')) {
      await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('adminAuthenticated');
      window.location.href = '/admin/login';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-black">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-sky-300 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center h-auto sm:h-16 py-3 sm:py-0">
            <div className="flex items-center mb-2 sm:mb-0">
              <Link href="/" className="text-xl sm:text-2xl font-bold text-black">
                Booking Site
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Link
                href="/book"
                className="px-3 sm:px-4 py-2 text-sm sm:text-base text-black hover:text-gray-800 font-medium text-center sm:text-left"
              >
                View Booking Page
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-black mb-4 sm:mb-8">Admin Panel</h1>

        <div className="border-b border-gray-200 mb-4 sm:mb-6">
          <nav className="-mb-px grid grid-cols-3 sm:flex sm:space-x-8 gap-0 sm:gap-0">
            {(['services', 'addons', 'bookings', 'calendar', 'availability', 'customers'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap text-center sm:text-left ${
                  activeTab === tab
                    ? 'border-indigo-500 text-black bg-indigo-50 sm:bg-transparent'
                    : 'border-transparent text-black hover:text-black hover:border-gray-300 hover:bg-gray-50 sm:hover:bg-transparent'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'services' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-black">Services</h2>
              <Link
                href="/admin/services/new"
                className="w-full sm:w-auto px-4 py-2 bg-sky-400 text-black rounded-md hover:bg-indigo-700 text-center text-sm sm:text-base"
              >
                Add Service
              </Link>
            </div>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {services.map((service) => (
                  <li key={service.id} className="px-4 sm:px-6 py-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full sm:w-auto">
                        {service.image && (
                          <img
                            src={service.image}
                            alt={service.name}
                            className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-md border border-gray-300 flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-medium text-black break-words">{service.name}</h3>
                          <p className="text-xs sm:text-sm text-black break-words">{service.description}</p>
                          <p className="text-xs sm:text-sm text-black mt-1">
                            ${service.price} • {formatDuration(service.duration)}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2 w-full sm:w-auto justify-end sm:justify-start">
                        <Link
                          href={`/admin/services/${service.id}`}
                          className="px-3 py-1 text-xs sm:text-sm bg-gray-100 text-black rounded hover:bg-gray-200"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="px-3 py-1 text-xs sm:text-sm bg-red-100 text-black rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
                {services.length === 0 && (
                  <li className="px-4 sm:px-6 py-4 text-center text-black text-sm sm:text-base">
                    No services yet. Add your first service to get started.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'addons' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-black">Add-ons</h2>
              <Link
                href="/admin/addons/new"
                className="w-full sm:w-auto px-4 py-2 bg-sky-400 text-black rounded-md hover:bg-indigo-700 text-center text-sm sm:text-base"
              >
                Add Add-on
              </Link>
            </div>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {addOns.map((addOn) => (
                  <li key={addOn.id} className="px-4 sm:px-6 py-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-medium text-black break-words">{addOn.name}</h3>
                        <p className="text-xs sm:text-sm text-black break-words">{addOn.description}</p>
                        <p className="text-xs sm:text-sm text-black mt-1">
                          ${addOn.price}
                          {addOn.duration && ` • +${formatDuration(addOn.duration)}`}
                        </p>
                      </div>
                      <div className="flex space-x-2 w-full sm:w-auto justify-end sm:justify-start">
                        <Link
                          href={`/admin/addons/${addOn.id}`}
                          className="px-3 py-1 text-xs sm:text-sm bg-gray-100 text-black rounded hover:bg-gray-200"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteAddOn(addOn.id)}
                          className="px-3 py-1 text-xs sm:text-sm bg-red-100 text-black rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
                {addOns.length === 0 && (
                  <li className="px-4 sm:px-6 py-4 text-center text-black text-sm sm:text-base">
                    No add-ons yet. Add your first add-on to get started.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-black mb-4">Bookings</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <li key={booking.id} className="px-4 sm:px-6 py-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        <h3 className="text-base sm:text-lg font-medium text-black break-words">{booking.customerName}</h3>
                        <p className="text-xs sm:text-sm text-black break-words">{booking.customerEmail}</p>
                        <p className="text-xs sm:text-sm text-black mt-1 break-words">
                          <strong>Location:</strong> {booking.location || 'Not provided'}
                        </p>
                        <p className="text-xs sm:text-sm text-black mt-1 break-words">
                          <strong>Service:</strong> {booking.serviceName}
                        </p>
                        {booking.addOnNames.length > 0 && (
                          <p className="text-xs sm:text-sm text-black break-words">
                            <strong>Add-ons:</strong> {booking.addOnNames.join(', ')}
                          </p>
                        )}
                        <p className="text-xs sm:text-sm text-black break-words">
                          <strong>Date:</strong> {booking.date} at {formatTimeToAMPM(booking.time)}
                        </p>
                        <p className="text-xs sm:text-sm text-black break-words">
                          <strong>Duration:</strong> {formatDuration(booking.duration)} • <strong>Total:</strong> ${booking.totalPrice}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteBooking(booking.id)}
                        className="px-3 py-1 text-xs sm:text-sm bg-red-100 text-black rounded hover:bg-red-200 w-full sm:w-auto"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
                {bookings.length === 0 && (
                  <li className="px-4 sm:px-6 py-4 text-center text-black text-sm sm:text-base">
                    No bookings yet.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="overflow-x-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-black mb-4">Bookings Calendar</h2>
            <div className="min-w-full">
              <Calendar bookings={bookings} />
            </div>
          </div>
        )}

        {activeTab === 'availability' && (
          <div>
            <AvailabilitySettings />
          </div>
        )}

        {activeTab === 'customers' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-black mb-4">Customer Loyalty Program</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200">
                <p className="text-xs sm:text-sm text-gray-600">
                  Customers earn 1 point for every $1 spent. 200 points = $10 discount.
                </p>
              </div>
              <ul className="divide-y divide-gray-200">
                {customers.length > 0 ? (
                  customers.map((customer) => {
                    const availableDiscount = Math.floor(customer.points / 200) * 10;
                    return (
                      <li key={customer.id} className="px-4 sm:px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-medium text-black break-words">{customer.name}</h3>
                            <p className="text-xs sm:text-sm text-gray-600 break-words">{customer.email}</p>
                            {customer.phone && (
                              <p className="text-xs sm:text-sm text-gray-600 break-words">{customer.phone}</p>
                            )}
                            <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:gap-6">
                              <div>
                                <span className="text-xs sm:text-sm text-gray-600">Total Spent: </span>
                                <span className="text-xs sm:text-sm font-semibold text-black">${customer.totalSpent.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-xs sm:text-sm text-gray-600">Points: </span>
                                <span className="text-xs sm:text-sm font-semibold text-sky-600">{customer.points}</span>
                              </div>
                              {availableDiscount > 0 && (
                                <div>
                                  <span className="text-xs sm:text-sm text-gray-600">Available Discount: </span>
                                  <span className="text-xs sm:text-sm font-semibold text-green-600">${availableDiscount.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <li className="px-4 sm:px-6 py-4 text-center text-black text-sm sm:text-base">
                    No customers yet. Customer data will appear here after bookings are made.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function AvailabilitySettings() {
  const [availability, setAvailability] = useState<Availability | null>(null);

  useEffect(() => {
    fetch('/api/availability')
      .then((res) => res.json())
      .then(setAvailability);
  }, []);

  const handleUpdate = async () => {
    if (!availability) return;
    try {
      // Try PUT first, fallback to POST for Netlify compatibility
      let response = await fetch('/api/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(availability),
      });
      
      // If PUT fails with 405, try POST instead
      if (response.status === 405) {
        response = await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(availability),
        });
      }
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Failed to update availability';
        throw new Error(errorMessage);
      }
      
      // Refresh the availability data to show the updated values
      const updated = await fetch('/api/availability').then(res => res.json());
      setAvailability(updated);
      
      alert('Availability updated successfully!');
    } catch (error: any) {
      console.error('Error updating availability:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      alert(`Failed to update availability: ${errorMessage}\n\nPlease check:\n1. You are logged in as admin\n2. Supabase is configured correctly\n3. Check browser console for details`);
    }
  };

  if (!availability) return <div>Loading...</div>;

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-black mb-4">Working Hours</h2>
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-full sm:w-24">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={availability.workingHours[day].enabled}
                    onChange={(e) => {
                      setAvailability({
                        ...availability,
                        workingHours: {
                          ...availability.workingHours,
                          [day]: {
                            ...availability.workingHours[day],
                            enabled: e.target.checked,
                          },
                        },
                      });
                    }}
                    className="mr-2"
                  />
                  <span className="capitalize text-sm sm:text-base">{day}</span>
                </label>
              </div>
              {availability.workingHours[day].enabled && (
                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  <input
                    type="time"
                    value={availability.workingHours[day].start}
                    onChange={(e) => {
                      setAvailability({
                        ...availability,
                        workingHours: {
                          ...availability.workingHours,
                          [day]: {
                            ...availability.workingHours[day],
                            start: e.target.value,
                          },
                        },
                      });
                    }}
                    className="border border-gray-300 rounded px-2 sm:px-3 py-2 text-sm sm:text-base flex-1 sm:flex-none"
                  />
                  <span className="text-sm sm:text-base">to</span>
                  <input
                    type="time"
                    value={availability.workingHours[day].end}
                    onChange={(e) => {
                      setAvailability({
                        ...availability,
                        workingHours: {
                          ...availability.workingHours,
                          [day]: {
                            ...availability.workingHours[day],
                            end: e.target.value,
                          },
                        },
                      });
                    }}
                    className="border border-gray-300 rounded px-2 sm:px-3 py-2 text-sm sm:text-base flex-1 sm:flex-none"
                  />
                </div>
              )}
            </div>
          ))}
          <div className="mt-4">
            <label className="block text-sm font-medium text-black mb-2">
              Slot Duration (minutes)
            </label>
            <input
              type="number"
              value={availability.slotDuration}
              onChange={(e) => {
                setAvailability({
                  ...availability,
                  slotDuration: parseInt(e.target.value),
                });
              }}
              className="border border-gray-300 rounded px-3 py-2 w-full sm:w-auto"
              min="15"
              step="15"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-black mb-2">
              Time Padding Between Appointments (minutes)
            </label>
            <input
              type="number"
              value={availability.paddingTime || 0}
              onChange={(e) => {
                setAvailability({
                  ...availability,
                  paddingTime: parseInt(e.target.value) || 0,
                });
              }}
              className="border border-gray-300 rounded px-3 py-2 w-full sm:w-auto"
              min="0"
              step="5"
            />
            <p className="text-xs text-gray-600 mt-1">
              This adds buffer time before and after each appointment to allow for travel, setup, or cleanup time.
            </p>
          </div>
          <button
            onClick={handleUpdate}
            className="mt-4 w-full sm:w-auto px-4 py-2 bg-sky-400 text-black rounded-md hover:bg-indigo-700 text-sm sm:text-base"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}


