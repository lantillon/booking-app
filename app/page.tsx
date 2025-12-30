'use client'

import { useState, useEffect } from 'react'
import { format, addDays, startOfToday, parseISO } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'

interface Service {
  id: number
  name: string
  durationMinutes: number
  price: number
}

interface TimeSlot {
  start: string
  end: string
}

interface AvailabilityResponse {
  service_id: number
  date: string
  slots: TimeSlot[]
  choices: Array<{ title: string; value: string }>
}

const API_KEY = ''

export default function BookingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(format(startOfToday(), 'yyyy-MM-dd'))
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [holdId, setHoldId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchServices()
  }, [])

  useEffect(() => {
    if (selectedService && step >= 2) {
      fetchAvailability()
    }
  }, [selectedService, selectedDate, step])

  async function fetchServices() {
    try {
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (err) {
      console.error('Failed to fetch services:', err)
    }
  }

  async function fetchAvailability() {
    if (!selectedService) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/public/availability?service_id=${selectedService}&date=${selectedDate}`
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch availability')
      }

      const data: AvailabilityResponse = await response.json()
      setAvailability(data)
    } catch (err: any) {
      setError(err.message)
      setAvailability(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleServiceSelect(serviceId: number) {
    setSelectedService(serviceId)
    setStep(2)
  }

  async function handleTimeSlotClick(choice: { title: string; value: string }) {
    if (!selectedService) return

    setLoading(true)
    setError(null)

    try {
      const [start, end] = choice.value.split('|')

      const holdResponse = await fetch('/api/public/hold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: selectedService,
          start,
          end,
          session_id: `web_${Date.now()}`,
        }),
      })

      if (!holdResponse.ok) {
        const data = await holdResponse.json()
        if (data.error === 'slot_taken') {
          setError('This time slot was just taken. Please select another time.')
          fetchAvailability()
        } else {
          throw new Error(data.error || 'Failed to hold slot')
        }
        return
      }

      const holdData = await holdResponse.json()
      setHoldId(holdData.hold_id)
      setSelectedSlot(choice.value)
      setStep(3)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleBook() {
    if (!holdId || !customerName || !customerPhone) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/public/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hold_id: holdId,
          customer_name: customerName,
          customer_phone: customerPhone,
          notes,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.error === 'hold_expired') {
          setError('Your hold expired. Please select a time again.')
          setHoldId(null)
          setSelectedSlot(null)
          setStep(2)
          fetchAvailability()
        } else if (data.error === 'slot_taken') {
          setError('This slot was taken. Please select another time.')
          setHoldId(null)
          setSelectedSlot(null)
          setStep(2)
          fetchAvailability()
        } else {
          throw new Error(data.error || 'Failed to book')
        }
        return
      }

      const data = await response.json()
      setBookingId(data.booking_id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function resetBooking() {
    setStep(1)
    setSelectedService(null)
    setSelectedDate(format(startOfToday(), 'yyyy-MM-dd'))
    setSelectedSlot(null)
    setHoldId(null)
    setCustomerName('')
    setCustomerPhone('')
    setNotes('')
    setBookingId(null)
    setError(null)
  }

  const dateOptions = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(startOfToday(), i)
    return format(date, 'yyyy-MM-dd')
  })

  if (bookingId) {
    const [start, end] = selectedSlot?.split('|') || []
    const startTime = start ? utcToZonedTime(parseISO(start), 'America/Denver') : null

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900/90 backdrop-blur-lg rounded-2xl p-8 border border-gray-800">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-4">
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
            <p className="text-gray-400 mb-6">Your appointment has been successfully booked.</p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <div className="text-sm text-gray-400">Booking ID</div>
              <div className="text-white font-mono text-sm">{bookingId}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Service</div>
              <div className="text-white">{services.find(s => s.id === selectedService)?.name}</div>
            </div>
            {startTime && (
              <div>
                <div className="text-sm text-gray-400">Date & Time</div>
                <div className="text-white">
                  {format(startTime, 'EEEE, MMMM d, yyyy')} at {format(startTime, 'h:mm a')}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-400">Name</div>
              <div className="text-white">{customerName}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Phone</div>
              <div className="text-white">{customerPhone}</div>
            </div>
          </div>

          <button
            onClick={resetBooking}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="pt-8 pb-4 px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Detail Lab</h1>
          </div>
          <h2 className="text-3xl font-bold mb-6">Book an Appointment</h2>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-500' : 'text-gray-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step >= 1 ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
              }`}>
                {step > 1 ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-bold">1</span>
                )}
              </div>
              <span className="font-medium">Service</span>
            </div>
            <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-500' : 'text-gray-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step >= 2 ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
              }`}>
                {step > 2 ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-bold">2</span>
                )}
              </div>
              <span className="font-medium">Time</span>
            </div>
            <div className={`w-12 h-0.5 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-500' : 'text-gray-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step >= 3 ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
              }`}>
                <span className="text-sm font-bold">3</span>
              </div>
              <span className="font-medium">Details</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 pb-8">
          <div className="w-full max-w-4xl">
            {/* Step 1: Select Service */}
            {step === 1 && (
              <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-800 shadow-2xl">
                <h3 className="text-2xl font-bold mb-6">Select a Service</h3>
                {error && (
                  <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceSelect(service.id)}
                      className="bg-gray-800/50 hover:bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-blue-500 transition-all group"
                    >
                      <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-600 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-lg mb-1">{service.name}</h4>
                        <p className="text-gray-400 text-sm mb-3">{service.name.toLowerCase()}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-400 font-semibold">${service.price}</span>
                          <span className="text-gray-500 text-sm">{service.durationMinutes} min</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select Time */}
            {step === 2 && selectedService && (
              <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-800 shadow-2xl">
                <h3 className="text-2xl font-bold mb-6">Select Date & Time</h3>
                {error && (
                  <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Select Date</label>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {dateOptions.map((date) => (
                      <option key={date} value={date}>
                        {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                      </option>
                    ))}
                  </select>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-gray-400">Loading available times...</div>
                ) : availability && availability.choices.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-4">Available Times</label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {availability.choices.map((choice, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleTimeSlotClick(choice)}
                          disabled={loading}
                          className="px-4 py-3 bg-gray-800 hover:bg-blue-600 border border-gray-700 hover:border-blue-500 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {choice.title}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">No available times for this date</div>
                )}
              </div>
            )}

            {/* Step 3: Customer Details */}
            {step === 3 && holdId && (
              <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-800 shadow-2xl max-w-md mx-auto">
                <h3 className="text-2xl font-bold mb-6">Your Information</h3>
                {error && (
                  <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleBook}
                    disabled={loading || !customerName || !customerPhone}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : 'Confirm Booking'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
