'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'

interface Service {
  id: number
  name: string
  durationMinutes: number
  price: number
  isActive: boolean
}

interface Booking {
  id: string
  serviceId: number
  startTime: string
  endTime: string
  customerName: string
  customerPhone: string
  notes: string | null
  createdAt: string
  service: Service
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'services' | 'bookings'>('bookings')
  const [services, setServices] = useState<Service[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')

  // Service form state
  const [serviceForm, setServiceForm] = useState({
    name: '',
    durationMinutes: 30,
    price: 0,
    isActive: true,
  })
  const [editingService, setEditingService] = useState<Service | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchServices() // Always fetch services for the filter dropdown
      if (activeTab === 'bookings') {
        fetchBookings()
      }
    }
  }, [session, activeTab, selectedDate, selectedServiceId])

  async function fetchServices() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (err) {
      setError('Failed to fetch services')
    } finally {
      setLoading(false)
    }
  }

  async function fetchBookings() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedDate) params.append('date', selectedDate)
      if (selectedServiceId) params.append('service_id', selectedServiceId)

      const response = await fetch(`/api/admin/bookings?${params}`)
      if (response.ok) {
        const data = await response.json()
        setBookings(data)
      }
    } catch (err) {
      setError('Failed to fetch bookings')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceForm),
      })

      if (response.ok) {
        setServiceForm({ name: '', durationMinutes: 30, price: 0, isActive: true })
        fetchServices()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create service')
      }
    } catch (err) {
      setError('Failed to create service')
    }
  }

  async function handleUpdateService(e: React.FormEvent) {
    e.preventDefault()
    if (!editingService) return

    setError('')

    try {
      const response = await fetch(`/api/admin/services/${editingService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceForm),
      })

      if (response.ok) {
        setEditingService(null)
        setServiceForm({ name: '', durationMinutes: 30, price: 0, isActive: true })
        fetchServices()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update service')
      }
    } catch (err) {
      setError('Failed to update service')
    }
  }

  async function handleDeleteService(id: number) {
    if (!confirm('Are you sure you want to delete this service?')) return

    try {
      const response = await fetch(`/api/admin/services/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchServices()
      }
    } catch (err) {
      setError('Failed to delete service')
    }
  }

  async function handleCancelBooking(id: string) {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    try {
      // Admin cancel - use server-side proxy
      const response = await fetch('/api/admin/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ booking_id: id }),
      })

      if (response.ok) {
        fetchBookings()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to cancel booking')
      }
    } catch (err) {
      setError('Failed to cancel booking')
    }
  }

  function startEditService(service: Service) {
    setEditingService(service)
    setServiceForm({
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: Number(service.price),
      isActive: service.isActive,
    })
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              View Public Site
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'bookings'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Bookings
              </button>
              <button
                onClick={() => setActiveTab('services')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'services'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Services
              </button>
            </nav>
          </div>

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div>
              <div className="mb-4 flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Service
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Services</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading bookings...</div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No bookings found</div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {bookings.map((booking) => {
                      const startTime = utcToZonedTime(parseISO(booking.startTime), 'America/Denver')
                      const endTime = utcToZonedTime(parseISO(booking.endTime), 'America/Denver')

                      return (
                        <li key={booking.id} className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {booking.service.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {format(startTime, 'MMM d, yyyy')} at {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                              </p>
                              <p className="text-sm text-gray-500">
                                {booking.customerName} - {booking.customerPhone}
                              </p>
                              {booking.notes && (
                                <p className="text-sm text-gray-400 mt-1">Notes: {booking.notes}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">
                  {editingService ? 'Edit Service' : 'Create New Service'}
                </h2>
                <form
                  onSubmit={editingService ? handleUpdateService : handleCreateService}
                  className="bg-white p-4 rounded-lg shadow space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={serviceForm.durationMinutes}
                        onChange={(e) =>
                          setServiceForm({ ...serviceForm, durationMinutes: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={serviceForm.price}
                        onChange={(e) =>
                          setServiceForm({ ...serviceForm, price: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={serviceForm.isActive}
                      onChange={(e) =>
                        setServiceForm({ ...serviceForm, isActive: e.target.checked })
                      }
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                      Active
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      {editingService ? 'Update' : 'Create'} Service
                    </button>
                    {editingService && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingService(null)
                          setServiceForm({ name: '', durationMinutes: 30, price: 0, isActive: true })
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">All Services</h2>
                {loading ? (
                  <div className="text-center py-8">Loading services...</div>
                ) : (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {services.map((service) => (
                        <li key={service.id} className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {service.name}
                                {!service.isActive && (
                                  <span className="ml-2 text-xs text-gray-500">(Inactive)</span>
                                )}
                              </p>
                              <p className="text-sm text-gray-500">
                                ${Number(service.price)} • {service.durationMinutes} minutes
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditService(service)}
                                className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteService(service.id)}
                                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

