export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number; // base price (used if vehiclePricing is not set)
  image?: string; // base64 image data
  vehiclePricing?: { // optional: different prices for different vehicle sizes
    sedan: number;
    suv: number;
    truck: number;
    largeSuv: number;
    largeTruck?: number; // optional larger vehicle
  };
  useVehiclePricing?: boolean; // flag to indicate if vehicle pricing should be used
  addOnIds?: string[]; // optional: array of add-on IDs assigned to this service
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  duration?: number; // optional additional time
}

export interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string; // Phone number for SMS confirmations
  location: string; // Customer's address/location for mobile service
  serviceId: string;
  serviceName: string;
  addOnIds: string[];
  addOnNames: string[];
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // total duration in minutes
  totalPrice: number;
  vehicleSize?: string; // Optional: 'sedan', 'suv', 'truck', 'van', 'largeTruck'
  zipCode?: string; // Customer's zip code for location-based scheduling
  createdAt: string;
}

export interface WorkingHours {
  start: string;
  end: string;
  enabled: boolean;
}

export interface Availability {
  workingHours: {
    [key: string]: WorkingHours;
  };
  slotDuration: number; // in minutes
  paddingTime: number; // padding in minutes between appointments (default: 0)
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalSpent: number; // total amount spent in dollars
  points: number; // loyalty points (1 point = $1)
  createdAt: string;
}

export interface Feedback {
  id: string;
  customerName: string;
  customerEmail: string;
  bookingId?: string; // optional: link to booking if available
  rating?: number; // optional: 1-5 star rating
  comment: string;
  createdAt: string;
}