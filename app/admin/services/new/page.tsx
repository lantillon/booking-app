'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { minutesToHoursMinutes, hoursMinutesToMinutes } from '@/lib/utils';
import { AddOn } from '@/types';

export default function NewServicePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 30,
    price: 0,
    image: '',
    useVehiclePricing: false,
    vehiclePricing: {
      sedan: 0,
      suv: 0,
      truck: 0,
      largeSuv: 0,
      largeTruck: 0,
    },
    useSeatRowPricing: false,
    seatRowPricing: {
      twoRows: 0,
      threeRows: 0,
    },
    addOnIds: [] as string[],
  });
  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [addOns, setAddOns] = useState<AddOn[]>([]);

  useEffect(() => {
    fetch('/api/addons')
      .then((res) => res.json())
      .then(setAddOns);
  }, []);

  // Update formData.duration when hours or minutes change
  const handleDurationChange = (hours: number, minutes: number) => {
    setDurationHours(hours);
    setDurationMinutes(minutes);
    const totalMinutes = hoursMinutesToMinutes(hours, minutes);
    if (totalMinutes >= 0) {
      setFormData((prev) => ({ ...prev, duration: totalMinutes }));
    }
  };
  const [imagePreview, setImagePreview] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({ ...formData, image: base64String });
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const service = {
      id: Date.now().toString(),
      ...formData,
      vehiclePricing: formData.useVehiclePricing ? formData.vehiclePricing : undefined,
      seatRowPricing: formData.useSeatRowPricing ? formData.seatRowPricing : undefined,
    };
    await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    });
    router.push('/admin');
  };

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
        <h1 className="text-3xl font-bold text-black mb-8">New Service</h1>
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
          <div>
            <label className="block text-sm font-medium text-black mb-1">Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-xs max-h-48 rounded-md border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, image: '' });
                    setImagePreview('');
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Duration</label>
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
            {!formData.useVehiclePricing && !formData.useSeatRowPricing && (
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
            )}
          </div>
          
          {/* Seat Row Pricing Option */}
          <div className="border-t pt-4">
            <label className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                checked={formData.useSeatRowPricing}
                onChange={(e) => setFormData({
                  ...formData,
                  useSeatRowPricing: e.target.checked,
                  useVehiclePricing: e.target.checked ? false : formData.useVehiclePricing
                })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-black">Use pricing based on seat rows (2 rows vs 3 rows)</span>
            </label>

            {formData.useSeatRowPricing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">2 Seat Rows ($)</label>
                  <p className="text-xs text-gray-500 mb-2">Sedans, coupes, most cars</p>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.seatRowPricing.twoRows}
                    onChange={(e) => setFormData({
                      ...formData,
                      seatRowPricing: { ...formData.seatRowPricing, twoRows: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">3 Seat Rows ($)</label>
                  <p className="text-xs text-gray-500 mb-2">SUVs, minivans, larger vehicles</p>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.seatRowPricing.threeRows}
                    onChange={(e) => setFormData({
                      ...formData,
                      seatRowPricing: { ...formData.seatRowPricing, threeRows: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Vehicle Pricing Option */}
          <div className="border-t pt-4">
            <label className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                checked={formData.useVehiclePricing}
                onChange={(e) => setFormData({
                  ...formData,
                  useVehiclePricing: e.target.checked,
                  useSeatRowPricing: e.target.checked ? false : formData.useSeatRowPricing
                })}
                className="w-4 h-4"
                disabled={formData.useSeatRowPricing}
              />
              <span className={`text-sm font-medium ${formData.useSeatRowPricing ? 'text-gray-400' : 'text-black'}`}>Use different pricing based on vehicle size</span>
            </label>
            
            {formData.useVehiclePricing && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-md">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Sedan ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.vehiclePricing.sedan}
                    onChange={(e) => setFormData({
                      ...formData,
                      vehiclePricing: { ...formData.vehiclePricing, sedan: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">SUV/Truck ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.vehiclePricing.suv || formData.vehiclePricing.truck}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        vehiclePricing: { 
                          ...formData.vehiclePricing, 
                          suv: value,
                          truck: value
                        }
                      });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Large SUV/Lifted Truck ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.vehiclePricing.largeSuv || formData.vehiclePricing.largeTruck}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        vehiclePricing: { 
                          ...formData.vehiclePricing, 
                          largeSuv: value,
                          largeTruck: value
                        }
                      });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Assign Add-ons */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-black mb-3">Assign Add-ons (Optional)</label>
            <p className="text-xs text-gray-600 mb-3">Select which add-ons are available for this service</p>
            {addOns.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto bg-gray-50 p-3 rounded-md">
                {addOns.map((addOn) => (
                  <label key={addOn.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.addOnIds.includes(addOn.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            addOnIds: [...formData.addOnIds, addOn.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            addOnIds: formData.addOnIds.filter((id) => id !== addOn.id),
                          });
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-black">{addOn.name}</span>
                    <span className="text-xs text-gray-600">(${addOn.price})</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No add-ons available. Create add-ons first.</p>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              className="px-4 py-2 bg-sky-400 text-black rounded-md hover:bg-indigo-700"
            >
              Create Service
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

