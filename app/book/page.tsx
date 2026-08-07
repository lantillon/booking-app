'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Service, AddOn } from '@/types';
import LocationMap from '@/components/LocationMap';
import DatePicker from '@/components/DatePicker';
import { formatTimeToAMPM, formatDuration, parseLocalDateFromISO } from '@/lib/utils';

export default function BookPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerLocation, setCustomerLocation] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [customerPoints, setCustomerPoints] = useState(0);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [selectedVehicleSize, setSelectedVehicleSize] = useState<string>('');
  const [selectedSeatRows, setSelectedSeatRows] = useState<string>('');
  const [showAddOnsModal, setShowAddOnsModal] = useState(false);
  const [tempSelectedAddOns, setTempSelectedAddOns] = useState<string[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);

  // Compute available add-ons for the selected service (if any)
  const availableAddOns = useMemo(() => {
    if (!selectedService) return [] as AddOn[];
    if (!selectedService.addOnIds || selectedService.addOnIds.length === 0) return [];
    return addOns.filter((a) => selectedService.addOnIds?.includes(a.id));
  }, [addOns, selectedService]);

  useEffect(() => {
    setIsLoadingServices(true);
    fetch('/api/services')
      .then((res) => res.json())
      .then((data) => {
        setServices(data);
        setIsLoadingServices(false);
      })
      .catch((error) => {
        console.error('Error fetching services:', error);
        setIsLoadingServices(false);
      });
    fetch('/api/addons')
      .then((res) => res.json())
      .then(setAddOns)
      .catch((error) => {
        console.error('Error fetching add-ons:', error);
      });
  }, []);

  useEffect(() => {
    if (selectedDate && selectedService) {
      // Calculate total duration (service + selected add-ons)
      let totalDuration = selectedService.duration;
      const selected = addOns.filter((a) => selectedAddOns.includes(a.id));
      selected.forEach((addOn) => {
        if (addOn.duration) totalDuration += addOn.duration;
      });
      
      fetch(`/api/timeslots?date=${selectedDate}&duration=${totalDuration}`)
        .then((res) => res.json())
        .then((slots) => {
          // Filter out slots that are less than 24 hours away
          const now = new Date();
          const minBookingTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
          const selectedDateObj = parseLocalDateFromISO(selectedDate);
          const isToday = selectedDateObj.toDateString() === now.toDateString();
          
          const filteredSlots = slots.filter((slot: string) => {
            if (!isToday) {
              // If not today, all slots are valid (date is already 24+ hours away)
              return true;
            }
            
            // If today, check if the slot time is at least 24 hours away
            const [slotHour, slotMin] = slot.split(':').map(Number);
            const slotDateTime = new Date(selectedDateObj);
            slotDateTime.setHours(slotHour, slotMin, 0, 0);
            
            return slotDateTime >= minBookingTime;
          });
          
          setAvailableSlots(filteredSlots);
        })
        .catch((err) => {
          console.error('Error fetching time slots:', err);
          setAvailableSlots([]);
        });
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDate, selectedService, selectedAddOns, addOns]);

  // Fetch customer points when email is entered
  useEffect(() => {
    if (customerEmail && customerEmail.includes('@')) {
      fetch(`/api/customers?email=${encodeURIComponent(customerEmail)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.points !== undefined) {
            setCustomerPoints(data.points);
          } else {
            setCustomerPoints(0);
          }
        })
        .catch(() => {
          setCustomerPoints(0);
        });
    } else {
      setCustomerPoints(0);
    }
  }, [customerEmail]);

  // Keep manual input in sync when an address is selected elsewhere (e.g., map click)
  useEffect(() => {
    setAddressQuery(customerLocation || '');
  }, [customerLocation]);

  // Fetch address suggestions (dropdown) instead of auto-completing
  useEffect(() => {
    // Clear if query too short
    if (!addressQuery || addressQuery.trim().length < 3) {
      setAddressSuggestions([]);
      if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
      return;
    }
    // Debounce lookups
    if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
    suggestionsTimeoutRef.current = setTimeout(async () => {
      try {
        const searchQuery = addressQuery.includes('El Paso')
          ? addressQuery
          : `${addressQuery}, El Paso, Texas`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}&limit=5&addressdetails=1&extratags=1&namedetails=1`,
          {
            headers: {
              'User-Agent': 'BookingSite/1.0',
            },
          }
        );
        const data = await res.json();
        setAddressSuggestions(Array.isArray(data) ? data : []);
      } catch (_e) {
        setAddressSuggestions([]);
      }
    }, 350);
    return () => {
      if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
    };
  }, [addressQuery]);

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedVehicleSize(''); // Reset vehicle size when service changes
    setSelectedSeatRows(''); // Reset seat rows when service changes
    setStep(2);
  };

  const handleAddOnToggle = (addOnId: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(addOnId)
        ? prev.filter((id) => id !== addOnId)
        : [...prev, addOnId]
    );
  };
  const handleTempAddOnToggle = (addOnId: string) => {
    setTempSelectedAddOns((prev) =>
      prev.includes(addOnId) ? prev.filter((id) => id !== addOnId) : [...prev, addOnId]
    );
  };

  const openAddOnsModal = () => {
    setTempSelectedAddOns(selectedAddOns);
    setShowAddOnsModal(true);
  };

  const confirmAddOns = () => {
    setSelectedAddOns(tempSelectedAddOns);
    setShowAddOnsModal(false);
    // Don't automatically go to step 3 - let user click Continue button
  };

  const handleSelectTime = (t: string) => {
    setSelectedTime(t);
    // Open add-ons modal immediately after selecting time (if service has add-ons)
    if (availableAddOns.length > 0) {
      setTempSelectedAddOns(selectedAddOns);
      setShowAddOnsModal(true);
    }
  };

  const calculateTotal = () => {
    if (!selectedService) return 0;

    let servicePrice = selectedService.price;

    // Use seat row pricing if enabled and seat rows is selected
    if (selectedService.useSeatRowPricing && selectedService.seatRowPricing && selectedSeatRows) {
      servicePrice = selectedService.seatRowPricing[selectedSeatRows as keyof typeof selectedService.seatRowPricing] || selectedService.price;
    }
    // Use vehicle pricing if enabled and vehicle size is selected
    else if (selectedService.useVehiclePricing && selectedService.vehiclePricing && selectedVehicleSize) {
      // Handle combined categories
      if (selectedVehicleSize === 'suv' || selectedVehicleSize === 'truck') {
        servicePrice = selectedService.vehiclePricing.suv || selectedService.vehiclePricing.truck || selectedService.price;
      } else if (selectedVehicleSize === 'largeSuv' || selectedVehicleSize === 'largeTruck') {
        servicePrice = selectedService.vehiclePricing.largeSuv || selectedService.vehiclePricing.largeTruck || selectedService.price;
      } else {
        servicePrice = selectedService.vehiclePricing[selectedVehicleSize as keyof typeof selectedService.vehiclePricing] || selectedService.price;
      }
    }

    let total = servicePrice;
    const selected = addOns.filter((a) => selectedAddOns.includes(a.id));
    selected.forEach((addOn) => {
      total += addOn.price;
    });
    return total;
  };

  const calculateFinalTotal = () => {
    const total = calculateTotal();
    return Math.max(0, total - appliedDiscount);
  };

  const getAvailableDiscount = () => {
    // 200 points = $10 discount
    const discountAmount = Math.floor(customerPoints / 200) * 10;
    return discountAmount;
  };

  const handleApplyDiscount = () => {
    const availableDiscount = getAvailableDiscount();
    if (availableDiscount > 0) {
      setAppliedDiscount(availableDiscount);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(0);
  };

  const calculateDuration = () => {
    if (!selectedService) return 0;
    let duration = selectedService.duration;
    const selected = addOns.filter((a) => selectedAddOns.includes(a.id));
    selected.forEach((addOn) => {
      if (addOn.duration) duration += addOn.duration;
    });
    return duration;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime || !customerName || !customerPhone || !customerLocation) {
      alert('Please fill in all required fields including your phone number and location');
      return;
    }
    
    // Validate seat row selection if seat row pricing is enabled
    if (selectedService.useSeatRowPricing && !selectedSeatRows) {
      alert('Please select the number of seat rows');
      return;
    }

    // Validate vehicle size selection if vehicle pricing is enabled
    if (selectedService.useVehiclePricing && !selectedVehicleSize) {
      alert('Please select a vehicle size');
      return;
    }

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: selectedService.id,
        addOnIds: selectedAddOns,
        date: selectedDate,
        time: selectedTime,
        customerName,
        customerEmail,
        customerPhone,
        location: customerLocation,
        discountAmount: appliedDiscount,
        vehicleSize: selectedVehicleSize || undefined,
        seatRows: selectedSeatRows || undefined,
        smsOptIn,
      }),
    });

    if (response.ok) {
      const bookingData = await response.json();
      // Store booking data for confirmation page
      setConfirmedBooking({
        ...bookingData,
        customerName,
        customerEmail,
        customerPhone,
        customerLocation,
        selectedAddOns: addOns.filter((a) => selectedAddOns.includes(a.id)),
      });
      // Move to confirmation step
      setStep(4);
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      alert(`Error creating booking: ${errorData.error || 'Please try again'}`);
    }
  };

  const getMinDate = () => {
    // Require bookings to be at least 24 hours in advance
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
    return minBookingTime.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60); // 60 days in advance
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <div className="min-h-screen">
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
                href="/"
                className="px-4 py-2 text-white hover:text-gray-200 font-medium"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Logo Section */}
      <div className="flex justify-center items-center py-6">
        <img 
          src="/logo.png" 
          alt="Logo" 
          className="h-20 w-auto object-contain"
          onError={(e) => {
            // Hide logo if image doesn't exist
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-400 mb-8">Book an Appointment</h1>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm ${step >= 1 ? 'bg-sky-400/80 text-black' : 'bg-white/30 text-black'}`}>
                1
              </div>
              <span className="ml-2 font-medium !text-white">Service</span>
            </div>
            <div className={`w-16 h-1 backdrop-blur-sm ${step >= 2 ? 'bg-sky-400/80' : 'bg-white/30'}`} />
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm ${step >= 2 ? 'bg-sky-400/80 text-black' : 'bg-white/30 text-black'}`}>
                2
              </div>
              <span className="ml-2 font-medium !text-white">Time</span>
            </div>
            <div className={`w-16 h-1 backdrop-blur-sm ${step >= 3 ? 'bg-sky-400/80' : 'bg-white/30'}`} />
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm ${step >= 3 ? 'bg-sky-400/80 text-black' : 'bg-white/30 text-black'}`}>
                3
              </div>
              <span className="ml-2 font-medium !text-white">Details</span>
            </div>
            {step >= 4 && (
              <>
                <div className={`w-16 h-1 backdrop-blur-sm ${step >= 4 ? 'bg-sky-400/80' : 'bg-white/30'}`} />
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm ${step >= 4 ? 'bg-sky-400/80 text-black' : 'bg-white/30 text-black'}`}>
                    ✓
                  </div>
                  <span className="ml-2 font-medium !text-white">Confirmed</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div className="bg-white/20 backdrop-blur-md shadow rounded-lg p-6 border border-white/30">
            <h2 className="text-2xl font-bold text-black mb-4">Select a Service</h2>
            <div className={`grid gap-4 ${
              services.length <= 2 
                ? 'grid-cols-1 md:grid-cols-2' 
                : services.length <= 4 
                ? 'grid-cols-1 sm:grid-cols-2' 
                : services.length <= 6
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}>
              {services.map((service) => (
                <div
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className={`border border-white/30 rounded-lg cursor-pointer hover:border-sky-400/50 hover:shadow-md transition overflow-hidden bg-white/20 backdrop-blur-sm flex flex-col ${
                    services.length <= 2 ? 'p-6' : services.length <= 4 ? 'p-5' : 'p-4'
                  }`}
                >
                  {service.image && (
                    <img
                      src={service.image}
                      alt={service.name}
                      className={`w-full object-cover rounded-md mb-3 ${
                        services.length <= 2 ? 'h-56' : services.length <= 4 ? 'h-44' : 'h-36'
                      }`}
                    />
                  )}
                  <h3 className={`font-semibold text-black mb-2 ${
                    services.length <= 2 ? 'text-xl' : services.length <= 4 ? 'text-lg' : 'text-base'
                  }`}>{service.name}</h3>
                  
                  {/* Description Preview */}
                  {service.description && (
                    <p className={`text-black mb-3 line-clamp-2 ${
                      services.length <= 2 ? 'text-sm' : 'text-xs'
                    }`}>
                      {service.description}
                    </p>
                  )}
                  
                  <div className="mt-auto">
                    <div className="flex justify-end">
                      <span className={`text-black ${
                        services.length <= 2 ? 'text-base' : 'text-sm'
                      }`}>{formatDuration(service.duration)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {isLoadingServices ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-400 border-t-transparent mb-3"></div>
                <p className="text-black">Services loading...</p>
              </div>
            ) : services.length === 0 ? (
              <p className="text-center text-black py-8">No services available. Please check back later.</p>
            ) : null}
          </div>
        )}

        {/* Step 2: Select Date/Time and Add-ons */}
        {step === 2 && selectedService && (
          <div className="bg-white shadow rounded-lg p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-black">Select Date & Time</h2>
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedService(null);
                  setSelectedVehicleSize('');
                  setSelectedSeatRows('');
                }}
                className="text-black hover:text-black"
              >
                Change Service
              </button>
            </div>

            <div>
              {selectedService.image && (
                <img
                  src={selectedService.image}
                  alt={selectedService.name}
                  className="w-full max-w-md h-64 object-cover rounded-lg mb-4 border border-gray-200"
                />
              )}
              <h3 className="text-lg font-semibold text-black mb-2">{selectedService.name}</h3>
              <p className="text-black">{selectedService.description}</p>
              {selectedService.useSeatRowPricing && selectedService.seatRowPricing ? (
                <div className="text-black mt-1">
                  {selectedSeatRows ? (
                    <p>${(selectedService.seatRowPricing[selectedSeatRows as keyof typeof selectedService.seatRowPricing] || 0).toFixed(2)} • {formatDuration(selectedService.duration)}</p>
                  ) : (
                    <p>Select seat rows for pricing • {formatDuration(selectedService.duration)}</p>
                  )}
                </div>
              ) : selectedService.useVehiclePricing && selectedService.vehiclePricing ? (
                <div className="text-black mt-1">
                  {selectedVehicleSize ? (
                    <p>${
                      (() => {
                        if (selectedVehicleSize === 'suv' || selectedVehicleSize === 'truck') {
                          return (selectedService.vehiclePricing.suv || selectedService.vehiclePricing.truck || 0).toFixed(2);
                        } else if (selectedVehicleSize === 'largeSuv' || selectedVehicleSize === 'largeTruck') {
                          return (selectedService.vehiclePricing.largeSuv || selectedService.vehiclePricing.largeTruck || 0).toFixed(2);
                        } else {
                          return ((selectedService.vehiclePricing[selectedVehicleSize as keyof typeof selectedService.vehiclePricing] as number) || 0).toFixed(2);
                        }
                      })()
                    } • {formatDuration(selectedService.duration)}</p>
                  ) : (
                    <p>Select vehicle size for pricing • {formatDuration(selectedService.duration)}</p>
                  )}
                </div>
              ) : (
                <p className="text-black mt-1">${selectedService.price.toFixed(2)} • {formatDuration(selectedService.duration)}</p>
              )}
            </div>

            {/* Seat Row Selection */}
            {selectedService.useSeatRowPricing && selectedService.seatRowPricing && (
              <div>
                <h3 className="text-lg font-semibold text-black mb-3">How many rows of seats? *</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* 2 Seat Rows */}
                  <label
                    className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedSeatRows === 'twoRows'
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
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
                      <div>
                        <span className="font-medium text-black">2 Rows</span>
                        <p className="text-sm text-gray-500">Sedans, coupes, most cars</p>
                      </div>
                    </div>
                    <span className="text-black font-semibold">${selectedService.seatRowPricing.twoRows.toFixed(2)}</span>
                  </label>

                  {/* 3 Seat Rows */}
                  <label
                    className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedSeatRows === 'threeRows'
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
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
                      <div>
                        <span className="font-medium text-black">3 Rows</span>
                        <p className="text-sm text-gray-500">SUVs, minivans, larger vehicles</p>
                      </div>
                    </div>
                    <span className="text-black font-semibold">${selectedService.seatRowPricing.threeRows.toFixed(2)}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Vehicle Size Selection */}
            {selectedService.useVehiclePricing && selectedService.vehiclePricing && (
              <div>
                <h3 className="text-lg font-semibold text-black mb-3">Select Vehicle Size *</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Sedan */}
                  {selectedService.vehiclePricing.sedan !== undefined && (
                    <label
                      className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedVehicleSize === 'sedan'
                          ? 'border-sky-500 bg-sky-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
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
                  
                  {/* SUV/Truck */}
                  {(selectedService.vehiclePricing.suv !== undefined || selectedService.vehiclePricing.truck !== undefined) && (
                    <label
                      className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedVehicleSize === 'suv' || selectedVehicleSize === 'truck'
                          ? 'border-sky-500 bg-sky-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
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
                  
                  {/* Large SUV/Lifted Truck */}
                  {(selectedService.vehiclePricing.largeSuv !== undefined || selectedService.vehiclePricing.largeTruck !== undefined) && (
                    <label
                      className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedVehicleSize === 'largeSuv' || selectedVehicleSize === 'largeTruck'
                          ? 'border-sky-500 bg-sky-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
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

            

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">Select Date</label>
              <DatePicker
                selectedDate={selectedDate}
                onDateSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime('');
                }}
                minDate={getMinDate()}
                maxDate={getMaxDate()}
              />
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-black mb-2">Select Time</label>
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handleSelectTime(slot)}
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

            {/* Add-ons entry point & selection summary */}
            {availableAddOns.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-black">
                    {selectedAddOns.length > 0 ? (
                      <span>
                        Add-ons selected:{' '}
                        {availableAddOns
                          .filter((a) => selectedAddOns.includes(a.id))
                          .map((a) => a.name)
                          .join(', ')}
                      </span>
                    ) : (
                      <span>No add-ons selected</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={openAddOnsModal}
                      className="px-4 py-2 bg-white/20 border border-white/30 rounded-md text-black hover:bg-white/40"
                      disabled={!selectedTime}
                      title={!selectedTime ? 'Select a time first' : 'Choose add-ons'}
                    >
                      {selectedAddOns.length ? 'Edit add-ons' : 'Choose add-ons'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-black">Total: ${calculateTotal().toFixed(2)}</div>
                  <div className="text-sm text-black">Duration: {formatDuration(calculateDuration())}</div>
                </div>
                <button
                  onClick={() => setStep(3)}
                  disabled={!selectedDate || !selectedTime || (selectedService?.useSeatRowPricing && !selectedSeatRows) || (selectedService?.useVehiclePricing && !selectedVehicleSize)}
                  className="px-6 py-2 bg-sky-400/80 backdrop-blur-sm text-black rounded-md hover:bg-sky-500/90 disabled:bg-white/20 disabled:cursor-not-allowed shadow-lg"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add-ons Modal */}
        {showAddOnsModal && selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddOnsModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
              <h3 className="text-xl font-semibold text-gray-900">Choose Add-ons</h3>
              <p className="text-sm text-gray-600 mt-1">
                Select any additional services to add to your booking.
              </p>
              <div className="mt-4 max-height: 18rem; overflow:auto;" />
              <div className="max-h-72 overflow-auto space-y-2">
                {availableAddOns.length === 0 && (
                  <div className="text-sm text-gray-600">No add-ons available for this service.</div>
                )}
                {availableAddOns.map((addOn) => (
                  <label key={addOn.id} className="flex items-start gap-3 p-3 border rounded-md">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={tempSelectedAddOns.includes(addOn.id)}
                      onChange={() => handleTempAddOnToggle(addOn.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-black">{addOn.name}</div>
                      {addOn.duration && (
                        <div className="text-xs text-gray-600">+{formatDuration(addOn.duration)}</div>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-black">+${addOn.price.toFixed(2)}</div>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddOnsModal(false);
                    setTempSelectedAddOns(selectedAddOns);
                  }}
                  className="px-4 py-2 border rounded-md text-black bg-gray-100 hover:bg-gray-200"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={confirmAddOns}
                  className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600"
                >
                  Add to booking
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Customer Details */}
        {step === 3 && selectedService && (
          <div className="bg-white/20 backdrop-blur-md shadow rounded-lg p-6 border border-white/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-black">Your Details</h2>
              <button
                onClick={() => setStep(2)}
                className="text-black hover:text-black"
              >
                Back
              </button>
            </div>

            <form onSubmit={handleBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Name <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white/30 backdrop-blur-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Phone Number <span className="text-red-600">*</span></label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white/30 backdrop-blur-sm"
                />
              </div>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="smsOptIn"
                  checked={smsOptIn}
                  onChange={(e) => setSmsOptIn(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-sky-500 focus:ring-sky-500"
                />
                <div>
                  <label htmlFor="smsOptIn" className="text-sm text-black">
                    I agree to receive appointment reminders and updates via SMS. Message and data rates may apply. You can opt out at any time by replying STOP. View our{' '}
                    <a href="/privacy" className="text-sky-600 underline hover:text-sky-700" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                    {' '}and{' '}
                    <a href="/terms" className="text-sky-600 underline hover:text-sky-700" target="_blank" rel="noopener noreferrer">SMS Terms</a>.
                  </label>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm text-gray-600">Powered by</span>
                    <span className="text-base font-semibold text-sky-600">Automation Lab</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-3">
                  Service Location <span className="text-red-600">*</span>
                </label>
                <LocationMap 
                  onLocationSelect={(location) => setCustomerLocation(location)}
                  // Pass the confirmed/selected address to the map so it doesn't auto-geocode while typing
                  addressText={customerLocation}
                  initialLocation={customerLocation}
                />
                <div className="mt-3">
                  <label className="block text-sm font-medium text-black mb-1">
                    Or enter address and select from the list:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={addressQuery}
                      onChange={(e) => setAddressQuery(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white/30 backdrop-blur-sm"
                      placeholder="Start typing your address (e.g., 123 Main St)"
                    />
                    {addressSuggestions.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full bg-white/95 backdrop-blur-sm border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {addressSuggestions.map((s: any) => (
                          <li
                            key={s.place_id}
                            className="px-3 py-2 text-black hover:bg-sky-100 cursor-pointer text-sm"
                            onClick={() => {
                              const full = s.display_name as string;
                              // Use precise coordinates from the suggestion (7 decimal places)
                              const preciseCoordinates: [number, number] = [
                                parseFloat(parseFloat(s.lat).toFixed(7)),
                                parseFloat(parseFloat(s.lon).toFixed(7))
                              ];
                              setCustomerLocation(full);
                              setAddressQuery(full);
                              setAddressSuggestions([]);
                              // Update map position with precise coordinates
                              // This will be handled by LocationMap when addressText changes
                            }}
                          >
                            {s.display_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Tip: Selecting an option will place the marker on the map.
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 mt-6">
                <h3 className="font-semibold text-black mb-3">Booking Summary</h3>
                {selectedService.image && (
                  <img
                    src={selectedService.image}
                    alt={selectedService.name}
                    className="w-full max-w-xs h-40 object-cover rounded-lg mb-3 border border-gray-200"
                  />
                )}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-black">Service:</span>
                    <span className="text-black">{selectedService.name}</span>
                  </div>
                  {selectedAddOns.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-black">Add-ons:</span>
                      <span className="text-black">
                        {addOns.filter((a) => selectedAddOns.includes(a.id)).map((a) => a.name).join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-black">Date & Time:</span>
                    <span className="text-black">{selectedDate} at {formatTimeToAMPM(selectedTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Location:</span>
                    <span className="text-black">{customerLocation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Duration:</span>
                    <span className="text-black">{formatDuration(calculateDuration())}</span>
                  </div>
                  {appliedDiscount > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-black">Subtotal:</span>
                        <span className="text-black">${calculateTotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span>-${appliedDiscount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-black">${calculateFinalTotal().toFixed(2)}</span>
                  </div>
                  {appliedDiscount > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      {Math.floor((appliedDiscount / 10) * 200)} points will be used
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-sky-400/80 backdrop-blur-sm text-black rounded-md hover:bg-sky-500/90 font-medium text-lg shadow-lg"
              >
                Confirm Booking
              </button>
            </form>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && confirmedBooking && (
          <div className="bg-white/20 backdrop-blur-md shadow rounded-lg p-8 border border-white/30">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-black mb-2">Booking Confirmed!</h2>
              <p className="text-black">Your appointment has been successfully booked.</p>
            </div>

            <div className="bg-white/30 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/30">
              <h3 className="text-xl font-semibold text-black mb-4">Booking Details</h3>
              <div className="space-y-3 text-black">
                <div className="flex justify-between">
                  <span className="font-medium">Service:</span>
                  <span>{confirmedBooking.serviceName}</span>
                </div>
                {confirmedBooking.selectedAddOns && confirmedBooking.selectedAddOns.length > 0 && (
                  <div className="flex justify-between">
                    <span className="font-medium">Add-ons:</span>
                    <span>{confirmedBooking.selectedAddOns.map((a: AddOn) => a.name).join(', ')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium">Date:</span>
                  <span>
                    {parseLocalDateFromISO(confirmedBooking.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Time:</span>
                  <span>{formatTimeToAMPM(confirmedBooking.time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Duration:</span>
                  <span>{formatDuration(confirmedBooking.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Location:</span>
                  <span className="text-right max-w-xs">{confirmedBooking.customerLocation || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Customer:</span>
                  <span>{confirmedBooking.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Phone:</span>
                  <span>{confirmedBooking.customerPhone}</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Paid:</span>
                    <span>${confirmedBooking.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50/50 backdrop-blur-sm rounded-lg p-4 mb-6 border border-blue-200">
              <p className="text-sm text-black">
                <strong>What's next?</strong> We will contact you at <strong>{confirmedBooking.customerPhone}</strong> to confirm your appointment.
              </p>
            </div>

            {/* Feedback Form */}
            {!feedbackSubmitted && (
              <div className="bg-white/30 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/30">
                <h3 className="text-xl font-semibold text-black mb-4">How was your experience?</h3>
                <p className="text-sm text-black mb-4">
                  Thanks for trusting us with your vehicle. Share your feedback and help us keep delivering 5-star results.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!feedbackComment.trim()) {
                      alert('Please enter your feedback');
                      return;
                    }
                    setIsSubmittingFeedback(true);
                    try {
                      const response = await fetch('/api/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          customerName: confirmedBooking.customerName,
                          customerEmail: confirmedBooking.customerEmail,
                          bookingId: confirmedBooking.id,
                          rating: feedbackRating,
                          comment: feedbackComment,
                        }),
                      });
                      if (response.ok) {
                        setFeedbackSubmitted(true);
                        setFeedbackComment('');
                        setFeedbackRating(null);
                      } else {
                        const error = await response.json();
                        alert(`Failed to submit feedback: ${error.error || 'Please try again'}`);
                      }
                    } catch (error) {
                      console.error('Error submitting feedback:', error);
                      alert('Failed to submit feedback. Please try again.');
                    } finally {
                      setIsSubmittingFeedback(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Rating (optional)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          className={`text-2xl ${feedbackRating && feedbackRating >= star ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">Your Feedback *</label>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white/30 backdrop-blur-sm min-h-[100px]"
                      placeholder="Tell us about your experience..."
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingFeedback}
                    className="w-full px-6 py-3 bg-sky-400/80 backdrop-blur-sm text-black rounded-md hover:bg-sky-500/90 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </form>
              </div>
            )}

            {feedbackSubmitted && (
              <div className="bg-green-50/50 backdrop-blur-sm rounded-lg p-4 mb-6 border border-green-200">
                <p className="text-sm text-black">
                  <strong>Thank you!</strong> Your feedback has been submitted successfully.
                </p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Link
                href="/"
                className="px-6 py-3 bg-gray-400/80 backdrop-blur-sm text-black rounded-md hover:bg-gray-500/90 font-medium"
              >
                Back to Home
              </Link>
              <button
                onClick={() => {
                  // Reset form and start over
                  setSelectedService(null);
                  setSelectedAddOns([]);
                  setSelectedDate('');
                  setSelectedTime('');
                  setSelectedVehicleSize('');
                  setSelectedSeatRows('');
                  setCustomerName('');
                  setCustomerEmail('');
                  setCustomerPhone('');
                  setCustomerLocation('');
                  setAppliedDiscount(0);
                  setCustomerPoints(0);
                  setConfirmedBooking(null);
                  setSmsOptIn(false);
                  setStep(1);
                }}
                className="px-6 py-3 bg-sky-400/80 backdrop-blur-sm text-black rounded-md hover:bg-sky-500/90 font-medium"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

