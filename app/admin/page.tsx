'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Service, AddOn, Booking, Availability, Customer, Feedback } from '@/types';
import Calendar from '@/components/Calendar';
import { formatTimeToAMPM, formatDuration } from '@/lib/utils';
import RouteMap from '@/components/RouteMap';

// Zip code coordinates shared with AI booking logic (El Paso area)
const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  // West side (Mondays only)
  '79835': { lat: 31.8084, lng: -106.5811 }, // Sunland Park
  '79912': { lat: 31.8406, lng: -106.5678 }, // West El Paso
  '79922': { lat: 31.8989, lng: -106.5700 }, // Canutillo area
  '79932': { lat: 31.8639, lng: -106.6228 }, // Westway
  '88063': { lat: 31.8300, lng: -106.6000 }, // Sunland Park NM
  // East/Central (any day)
  '79821': { lat: 31.3275, lng: -105.9367 }, // Anthony
  '79836': { lat: 31.5264, lng: -106.0828 }, // Clint
  '79838': { lat: 31.4869, lng: -106.1697 }, // Fabens
  '79849': { lat: 31.2097, lng: -105.7575 }, // San Elizario
  '79901': { lat: 31.7587, lng: -106.4869 }, // Downtown
  '79902': { lat: 31.7700, lng: -106.5050 }, // Kern Place
  '79903': { lat: 31.7850, lng: -106.4400 }, // Government Hill
  '79904': { lat: 31.8100, lng: -106.4450 }, // Fort Bliss
  '79905': { lat: 31.7550, lng: -106.4350 }, // South Central
  '79906': { lat: 31.8150, lng: -106.4250 }, // Fort Bliss
  '79907': { lat: 31.7000, lng: -106.3550 }, // Ysleta
  '79908': { lat: 31.8450, lng: -106.3800 }, // Fort Bliss
  '79911': { lat: 31.8800, lng: -106.5350 }, // West El Paso
  '79915': { lat: 31.7200, lng: -106.3200 }, // Ysleta
  '79924': { lat: 31.8800, lng: -106.4250 }, // Northeast
  '79925': { lat: 31.7850, lng: -106.3650 }, // East Central
  '79927': { lat: 31.6600, lng: -106.2700 }, // Socorro
  '79928': { lat: 31.6700, lng: -106.1850 }, // Horizon City (HOME BASE)
  '79930': { lat: 31.8150, lng: -106.4650 }, // Central
  '79934': { lat: 31.9150, lng: -106.4050 }, // Northeast
  '79935': { lat: 31.7700, lng: -106.3350 }, // East
  '79936': { lat: 31.7650, lng: -106.3000 }, // East
  '79938': { lat: 31.8000, lng: -106.2300 }, // Far East/Horizon
};

const HOME_ZIP = '79928';
const HOME_ADDRESS = '12748 Giuseppe Pl, El Paso, TX 79928';
const HOME_COORDS = { lat: 31.6585, lng: -106.1790 }; // Approximate coordinates for Giuseppe Pl
const AVERAGE_SPEED_MPH = 30; // Simple estimate for ETA calculations

// Generate Google Maps directions URL
function getGoogleMapsDirectionsUrl(fromAddress: string, toAddress: string): string {
  const from = encodeURIComponent(fromAddress);
  const to = encodeURIComponent(toAddress);
  return `https://www.google.com/maps/dir/?api=1&origin=${from}&destination=${to}&travelmode=driving`;
}

// Generate Google Maps URL for full route with multiple stops
function getFullRouteUrl(stops: string[]): string {
  if (stops.length < 2) return '';
  const origin = encodeURIComponent(stops[0]);
  const destination = encodeURIComponent(stops[stops.length - 1]);
  const waypoints = stops.slice(1, -1).map(s => encodeURIComponent(s)).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (waypoints) {
    url += `&waypoints=${waypoints}`;
  }
  return url;
}

function getDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function estimateDriveMinutes(distanceMiles: number): number {
  if (!distanceMiles || !Number.isFinite(distanceMiles)) return 0;
  return Math.max(1, Math.round((distanceMiles / AVERAGE_SPEED_MPH) * 60));
}

function getZipForBooking(booking: Booking): string | undefined {
  // Prefer explicit zipCode on the booking if it's in our map
  if (booking.zipCode && ZIP_COORDS[booking.zipCode]) {
    return booking.zipCode;
  }

  // Fallback: try to extract a 5-digit ZIP from the location/address string
  if (booking.location) {
    const match = booking.location.match(/\b(\d{5})\b/);
    if (match && ZIP_COORDS[match[1]]) {
      return match[1];
    }
  }

  return undefined;
}

export default function AdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [selectedRouteDate, setSelectedRouteDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedRouteBookings, setSelectedRouteBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<
    'services' | 'addons' | 'bookings' | 'availability' | 'calendar' | 'customers' | 'emergency' | 'feedback' | 'sms'
  >('services');
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
    const [servicesRes, addOnsRes, bookingsRes, customersRes, feedbacksRes] = await Promise.all([
      fetch('/api/services'),
      fetch('/api/addons'),
      fetch('/api/bookings'),
      fetch('/api/customers'),
      fetch('/api/feedback'),
    ]);
    setServices(await servicesRes.json());
    setAddOns(await addOnsRes.json());
    setBookings(await bookingsRes.json());
    setCustomers(await customersRes.json());
    setFeedbacks(await feedbacksRes.json());
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

  const handleResendConfirmation = async (id: string) => {
    try {
      const response = await fetch(`/api/bookings/${id}/resend`, { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        alert('Confirmation email sent successfully!');
      } else {
        alert(`Failed to send email: ${result.message || result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('adminAuthenticated');
      window.location.href = '/admin/login';
    }
  };

  const handleCalendarDateClick = (date: string, dateBookings: Booking[]) => {
    setSelectedRouteDate(date);
    setSelectedRouteBookings(dateBookings);
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
            {(['services', 'addons', 'bookings', 'calendar', 'availability', 'customers', 'emergency', 'feedback', 'sms'] as const).map((tab) => (
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
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleResendConfirmation(booking.id)}
                          className="px-3 py-1 text-xs sm:text-sm bg-blue-100 text-black rounded hover:bg-blue-200 w-full sm:w-auto"
                        >
                          Resend Email
                        </button>
                        <button
                          onClick={() => handleDeleteBooking(booking.id)}
                          className="px-3 py-1 text-xs sm:text-sm bg-red-100 text-black rounded hover:bg-red-200 w-full sm:w-auto"
                        >
                          Delete
                        </button>
                      </div>
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
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-black mb-4">Bookings Calendar</h2>
              <div className="min-w-full">
                <Calendar bookings={bookings} onDateClick={handleCalendarDateClick} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-black mb-3">
                  Daily Route –{' '}
                  {selectedRouteDate
                    ? new Date(selectedRouteDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Select a date'}
                </h3>
                {selectedRouteBookings.length === 0 ? (
                  <p className="text-sm text-black">
                    Click a day on the calendar to see that day&apos;s route and drive times between appointments.
                  </p>
                ) : (
                  (() => {
                    const ordered = selectedRouteBookings.slice().sort((a, b) => a.time.localeCompare(b.time));

                    type RouteLeg = {
                      booking: Booking;
                      index: number;
                      fromLabel: string;
                      fromAddress: string;
                      toAddress: string;
                      distanceMiles: number | null;
                      driveMinutes: number | null;
                    };

                    const legs: RouteLeg[] = [];

                    ordered.forEach((booking, index) => {
                      const prev = index === 0 ? null : ordered[index - 1];
                      const fromZip = index === 0 ? HOME_ZIP : (prev && getZipForBooking(prev)) || undefined;
                      const fromLabel = index === 0 ? 'Home' : prev?.customerName || 'Previous stop';
                      const fromAddress = index === 0 ? HOME_ADDRESS : (prev?.location || '');
                      const toAddress = booking.location || '';
                      const toZip = getZipForBooking(booking);

                      let distanceMiles: number | null = null;
                      let driveMinutes: number | null = null;

                      if (index === 0) {
                        // From home to first stop
                        const toCoords = toZip ? ZIP_COORDS[toZip] : null;
                        if (toCoords) {
                          distanceMiles = getDistanceMiles(HOME_COORDS.lat, HOME_COORDS.lng, toCoords.lat, toCoords.lng);
                          driveMinutes = estimateDriveMinutes(distanceMiles);
                        }
                      } else if (fromZip && toZip && ZIP_COORDS[fromZip] && ZIP_COORDS[toZip]) {
                        const fromCoords = ZIP_COORDS[fromZip];
                        const toCoords = ZIP_COORDS[toZip];
                        distanceMiles = getDistanceMiles(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);
                        driveMinutes = estimateDriveMinutes(distanceMiles);
                      }

                      legs.push({
                        booking,
                        index,
                        fromLabel,
                        fromAddress,
                        toAddress,
                        distanceMiles,
                        driveMinutes,
                      });
                    });

                    // Build full route addresses for Google Maps link
                    const allStops = [HOME_ADDRESS, ...ordered.map(b => b.location).filter(Boolean)];

                    return (
                      <div className="space-y-4">
                        {/* Full Route Button */}
                        {allStops.length >= 2 && (
                          <a
                            href={getFullRouteUrl(allStops)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            Open Full Route in Google Maps
                          </a>
                        )}

                        {/* Starting Point */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">H</div>
                            <span className="font-semibold text-green-800">Starting Point - Home</span>
                          </div>
                          <p className="text-sm text-green-700 ml-8">{HOME_ADDRESS}</p>
                        </div>

                        {/* Route Legs */}
                        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
                          {legs.map((leg) => (
                            <div key={leg.booking.id} className="p-4 sm:p-5">
                              {/* Drive info banner */}
                              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <div className="text-sm">
                                    <span className="text-blue-800">
                                      <strong>{leg.fromLabel}</strong> → <strong>{leg.booking.customerName}</strong>
                                    </span>
                                    {leg.distanceMiles !== null && leg.driveMinutes !== null ? (
                                      <span className="text-blue-600 ml-2">
                                        ({leg.distanceMiles.toFixed(1)} mi • ~{formatDuration(leg.driveMinutes)} drive)
                                      </span>
                                    ) : null}
                                  </div>
                                  {leg.fromAddress && leg.toAddress && (
                                    <a
                                      href={getGoogleMapsDirectionsUrl(leg.fromAddress, leg.toAddress)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      Get Directions
                                    </a>
                                  )}
                                </div>
                              </div>

                              {/* Stop details */}
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                      {leg.index + 1}
                                    </div>
                                    <h4 className="text-base sm:text-lg font-semibold text-black break-words">
                                      {leg.booking.customerName}
                                    </h4>
                                  </div>
                                  <div className="ml-8">
                                    <p className="text-xs sm:text-sm text-black">
                                      <strong>Time:</strong> {formatTimeToAMPM(leg.booking.time)} ({formatDuration(leg.booking.duration)})
                                    </p>
                                    <p className="text-xs sm:text-sm text-black break-words">
                                      <strong>Service:</strong> {leg.booking.serviceName}
                                    </p>
                                    <p className="text-xs sm:text-sm text-black break-words">
                                      <strong>Location:</strong> {leg.booking.location || 'Not provided'}
                                    </p>
                                    {leg.booking.customerPhone && (
                                      <p className="text-xs sm:text-sm text-black">
                                        <strong>Phone:</strong> <a href={`tel:${leg.booking.customerPhone}`} className="text-blue-600 hover:underline">{leg.booking.customerPhone}</a>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-black mb-3">Map Route</h3>
                {(() => {
                  if (!selectedRouteDate || selectedRouteBookings.length === 0) {
                    return (
                      <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-inner">
                        <div className="text-black font-medium text-sm">
                          Select a day with bookings on the calendar to see the route map.
                        </div>
                      </div>
                    );
                  }

                  const ordered = selectedRouteBookings.slice().sort((a, b) => a.time.localeCompare(b.time));

                  type RoutePoint = { label: string; coordinates: [number, number] };
                  const points: RoutePoint[] = [];

                  // Start at home
                  points.push({ label: 'Home', coordinates: [HOME_COORDS.lat, HOME_COORDS.lng] });

                  ordered.forEach((booking) => {
                    const zip = getZipForBooking(booking);
                    if (!zip) return;
                    const coords = ZIP_COORDS[zip];
                    if (!coords) return;
                    points.push({
                      label: `${booking.customerName} (${zip})`,
                      coordinates: [coords.lat, coords.lng],
                    });
                  });

                  if (points.length < 2) {
                    return (
                      <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-inner">
                        <div className="text-black font-medium text-sm text-center px-4">
                          Not enough ZIP data to draw a route map. Make sure bookings for this date have valid ZIP codes.
                        </div>
                      </div>
                    );
                  }

                  return <RouteMap points={points} />;
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Route tab removed – route information is now shown in the Calendar tab */}

        {activeTab === 'availability' && (
          <div>
            <AvailabilitySettings />
          </div>
        )}

        {activeTab === 'emergency' && (
          <div>
            <EmergencyBookingForm services={services} addOns={addOns} onBookingCreated={fetchData} />
          </div>
        )}

        {activeTab === 'feedback' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-black mb-4">Customer Feedback</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {feedbacks.length > 0 ? (
                  feedbacks.map((feedback) => (
                    <li key={feedback.id} className="px-4 sm:px-6 py-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-medium text-black break-words">{feedback.customerName}</h3>
                            <p className="text-xs sm:text-sm text-gray-600 break-words">{feedback.customerEmail}</p>
                            {feedback.rating && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="text-xs text-gray-600">Rating:</span>
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span
                                      key={star}
                                      className={`text-sm ${feedback.rating && feedback.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                                <span className="text-xs text-gray-600 ml-1">({feedback.rating}/5)</span>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            {new Date(feedback.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-black break-words whitespace-pre-wrap">{feedback.comment}</p>
                        </div>
                        {feedback.bookingId && (
                          <div className="mt-1">
                            <span className="text-xs text-gray-600">Booking ID: {feedback.bookingId}</span>
                          </div>
                        )}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="px-4 sm:px-6 py-4 text-center text-black text-sm sm:text-base">
                    No feedback yet. Customer feedback will appear here.
                  </li>
                )}
              </ul>
            </div>
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

        {activeTab === 'sms' && (
          <div>
            <SMSManagement />
          </div>
        )}
      </main>
    </div>
  );
}

function SMSManagement() {
  const [smsStatus, setSmsStatus] = useState<any>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRunningReminders, setIsRunningReminders] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  useEffect(() => {
    // Check SMS configuration status
    fetch('/api/reminders')
      .then((res) => res.json())
      .then(setSmsStatus)
      .catch(console.error);
  }, []);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone || !testMessage) {
      alert('Please enter phone number and message');
      return;
    }
    setIsSending(true);
    try {
      const response = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testPhone, message: testMessage }),
      });
      const result = await response.json();
      if (result.success) {
        alert('Test SMS sent successfully!');
        setTestPhone('');
        setTestMessage('');
      } else {
        alert(`Failed to send SMS: ${result.error || result.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleRunReminders = async () => {
    setIsRunningReminders(true);
    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer detail-labs-reminders-2026',
        },
      });
      const result = await response.json();
      setLastResult(result);
      if (result.success) {
        alert(`Reminders processed!\n24h: ${result.results.reminders24hSent}\n1h: ${result.results.reminders1hSent}\nRe-engagement: ${result.results.reengagementSent}`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsRunningReminders(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-black">SMS & AI Messaging</h2>

      {/* Status Card */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Configuration Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg ${smsStatus?.config?.twilioConfigured ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${smsStatus?.config?.twilioConfigured ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="font-medium">Twilio SMS</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {smsStatus?.config?.twilioConfigured ? 'Connected & ready' : 'Not configured - add Twilio credentials'}
            </p>
          </div>
          <div className={`p-4 rounded-lg ${smsStatus?.config?.aiConfigured ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${smsStatus?.config?.aiConfigured ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span className="font-medium">AI Personalization</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {smsStatus?.config?.aiConfigured ? 'Claude AI active' : 'Using fallback messages'}
            </p>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Automated Messaging Features</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">1</div>
            <div>
              <h4 className="font-medium text-black">Booking Confirmation</h4>
              <p className="text-sm text-gray-600">AI-generated SMS sent immediately when customer books</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">2</div>
            <div>
              <h4 className="font-medium text-black">24-Hour Reminder</h4>
              <p className="text-sm text-gray-600">Friendly reminder sent day before appointment</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm">3</div>
            <div>
              <h4 className="font-medium text-black">1-Hour Reminder</h4>
              <p className="text-sm text-gray-600">Quick heads-up 1 hour before service</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">4</div>
            <div>
              <h4 className="font-medium text-black">Re-engagement Campaign</h4>
              <p className="text-sm text-gray-600">AI reaches out to customers who haven't booked in 30+ days</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Reminders run automatically every 30 minutes via Netlify scheduled functions.
        </p>
      </div>

      {/* Manual Trigger */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Manual Actions</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleRunReminders}
            disabled={isRunningReminders}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
          >
            {isRunningReminders ? 'Processing...' : 'Run Reminders Now'}
          </button>
        </div>
        {lastResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-black mb-2">Last Run Results:</h4>
            <div className="text-sm space-y-1">
              <p>24h Reminders Sent: <span className="font-semibold">{lastResult.results?.reminders24hSent || 0}</span></p>
              <p>1h Reminders Sent: <span className="font-semibold">{lastResult.results?.reminders1hSent || 0}</span></p>
              <p>Re-engagement Sent: <span className="font-semibold">{lastResult.results?.reengagementSent || 0}</span></p>
              {lastResult.results?.errors?.length > 0 && (
                <div className="mt-2 text-red-600">
                  <p className="font-medium">Errors:</p>
                  {lastResult.results.errors.map((err: string, i: number) => (
                    <p key={i} className="text-xs">{err}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Test SMS */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Send Test SMS</h3>
        <form onSubmit={handleSendTest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Phone Number</label>
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="(915) 555-1234"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Message</label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Test message..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={isSending || !smsStatus?.config?.twilioConfigured}
            className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 disabled:bg-gray-400"
          >
            {isSending ? 'Sending...' : 'Send Test SMS'}
          </button>
          {!smsStatus?.config?.twilioConfigured && (
            <p className="text-sm text-red-600">Configure Twilio credentials to send SMS</p>
          )}
        </form>
      </div>

      {/* Setup Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-black mb-3">Twilio Setup Instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Go to <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">twilio.com/try-twilio</a> and create a free account</li>
          <li>From the Console Dashboard, copy your <strong>Account SID</strong> and <strong>Auth Token</strong></li>
          <li>Go to Phone Numbers → Buy a Number (free with trial)</li>
          <li>Add these to your Netlify environment variables:
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>TWILIO_ACCOUNT_SID</li>
              <li>TWILIO_AUTH_TOKEN</li>
              <li>TWILIO_PHONE_NUMBER (with +1 prefix)</li>
              <li>CRON_SECRET (any secret string)</li>
            </ul>
          </li>
          <li>Redeploy your site</li>
        </ol>
      </div>
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

function EmergencyBookingForm({ services, addOns, onBookingCreated }: { services: Service[]; addOns: AddOn[]; onBookingCreated: () => void }) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerLocation, setCustomerLocation] = useState('');
  const [selectedVehicleSize, setSelectedVehicleSize] = useState<string>('');
  const [selectedSeatRows, setSelectedSeatRows] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedDate && selectedService) {
      let totalDuration = selectedService.duration;
      const selected = addOns.filter((a) => selectedAddOns.includes(a.id));
      selected.forEach((addOn) => {
        if (addOn.duration) totalDuration += addOn.duration;
      });
      
      // For emergency bookings, get all available slots without 24-hour restriction
      fetch(`/api/timeslots?date=${selectedDate}&duration=${totalDuration}&emergency=true`)
        .then((res) => res.json())
        .then((slots) => {
          setAvailableSlots(slots);
        })
        .catch((err) => {
          console.error('Error fetching time slots:', err);
          setAvailableSlots([]);
        });
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDate, selectedService, selectedAddOns, addOns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime || !customerName || !customerLocation) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (selectedService.useVehiclePricing && !selectedVehicleSize) {
      alert('Please select a vehicle size');
      return;
    }

    if (selectedService.useSeatRowPricing && !selectedSeatRows) {
      alert('Please select seat rows');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.id,
          addOnIds: selectedAddOns,
          date: selectedDate,
          time: selectedTime,
          customerName,
          customerPhone,
          location: customerLocation,
          vehicleSize: selectedVehicleSize || undefined,
          seatRows: selectedSeatRows || undefined,
          isEmergency: true, // Flag to bypass 24-hour restriction
        }),
      });

      if (response.ok) {
        alert('Emergency booking created successfully!');
        // Reset form
        setSelectedService(null);
        setSelectedAddOns([]);
        setSelectedDate('');
        setSelectedTime('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerLocation('');
        setSelectedVehicleSize('');
        setSelectedSeatRows('');
        onBookingCreated();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Error creating booking: ${errorData.error || 'Please try again'}`);
      }
    } catch (error) {
      alert('Error creating booking. Please try again.');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-black mb-4">Emergency Booking</h2>
      <p className="text-sm text-gray-600 mb-4">
        Create bookings without the 24-hour advance requirement. Use this for urgent appointments.
      </p>
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">Service *</label>
            <select
              value={selectedService?.id || ''}
              onChange={(e) => {
                const service = services.find(s => s.id === e.target.value);
                setSelectedService(service || null);
                setSelectedVehicleSize('');
                setSelectedSeatRows('');
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - ${service.price.toFixed(2)} ({formatDuration(service.duration)})
                </option>
              ))}
            </select>
          </div>

          {selectedService?.useVehiclePricing && selectedService.vehiclePricing && (
            <div>
              <label className="block text-sm font-medium text-black mb-2">Vehicle Size *</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {selectedService.vehiclePricing.sedan !== undefined && (
                  <label className="flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="vehicleSize"
                        value="sedan"
                        checked={selectedVehicleSize === 'sedan'}
                        onChange={(e) => setSelectedVehicleSize(e.target.value)}
                        className="mr-2"
                        required
                      />
                      <span className="font-medium text-black">Sedan</span>
                    </div>
                    <span className="text-black font-semibold">${selectedService.vehiclePricing.sedan.toFixed(2)}</span>
                  </label>
                )}
                {(selectedService.vehiclePricing.suv !== undefined || selectedService.vehiclePricing.truck !== undefined) && (
                  <label className="flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="vehicleSize"
                        value="suv"
                        checked={selectedVehicleSize === 'suv' || selectedVehicleSize === 'truck'}
                        onChange={(e) => setSelectedVehicleSize(e.target.value)}
                        className="mr-2"
                        required
                      />
                      <span className="font-medium text-black">SUV/Truck</span>
                    </div>
                    <span className="text-black font-semibold">
                      ${((selectedService.vehiclePricing.suv || selectedService.vehiclePricing.truck) as number).toFixed(2)}
                    </span>
                  </label>
                )}
                {(selectedService.vehiclePricing.largeSuv !== undefined || selectedService.vehiclePricing.largeTruck !== undefined) && (
                  <label className="flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="vehicleSize"
                        value="largeSuv"
                        checked={selectedVehicleSize === 'largeSuv' || selectedVehicleSize === 'largeTruck'}
                        onChange={(e) => setSelectedVehicleSize(e.target.value)}
                        className="mr-2"
                        required
                      />
                      <span className="font-medium text-black">Large SUV/Lifted Truck</span>
                    </div>
                    <span className="text-black font-semibold">
                      ${((selectedService.vehiclePricing.largeSuv || selectedService.vehiclePricing.largeTruck) as number).toFixed(2)}
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}

          {selectedService?.useSeatRowPricing && selectedService.seatRowPricing && (
            <div>
              <label className="block text-sm font-medium text-black mb-2">Seat Rows *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="seatRows"
                      value="twoRows"
                      checked={selectedSeatRows === 'twoRows'}
                      onChange={(e) => setSelectedSeatRows(e.target.value)}
                      className="mr-2"
                      required
                    />
                    <span className="font-medium text-black">2 Rows</span>
                  </div>
                  <span className="text-black font-semibold">${selectedService.seatRowPricing.twoRows.toFixed(2)}</span>
                </label>
                <label className="flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="seatRows"
                      value="threeRows"
                      checked={selectedSeatRows === 'threeRows'}
                      onChange={(e) => setSelectedSeatRows(e.target.value)}
                      className="mr-2"
                      required
                    />
                    <span className="font-medium text-black">3 Rows</span>
                  </div>
                  <span className="text-black font-semibold">${selectedService.seatRowPricing.threeRows.toFixed(2)}</span>
                </label>
              </div>
            </div>
          )}

          {selectedService && (
            <div>
              <label className="block text-sm font-medium text-black mb-2">Add-ons</label>
              <div className="space-y-2">
                {addOns.filter(a => !selectedService.addOnIds || selectedService.addOnIds.includes(a.id)).map((addOn) => (
                  <label key={addOn.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedAddOns.includes(addOn.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAddOns([...selectedAddOns, addOn.id]);
                        } else {
                          setSelectedAddOns(selectedAddOns.filter(id => id !== addOn.id));
                        }
                      }}
                    />
                    <span className="text-black">{addOn.name} (+${addOn.price.toFixed(2)})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-2">Date *</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime('');
              }}
              min={getTodayDate()}
              max={getMaxDate()}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>

          {selectedDate && (
            <div>
              <label className="block text-sm font-medium text-black mb-2">Time *</label>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={`px-4 py-2 rounded-md border ${
                        selectedTime === slot
                          ? 'bg-sky-400 text-black border-sky-400'
                          : 'bg-white text-black border-gray-300 hover:border-indigo-500'
                      }`}
                    >
                      {formatTimeToAMPM(slot)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-black">No available time slots for this date.</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-2">Customer Name *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">Customer Phone</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">Location *</label>
            <input
              type="text"
              value={customerLocation}
              onChange={(e) => setCustomerLocation(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedService || !selectedDate || !selectedTime}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Emergency Booking'}
          </button>
        </form>
      </div>
    </div>
  );
}


