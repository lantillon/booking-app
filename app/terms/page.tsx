'use client';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms and Conditions</h1>
        <p className="text-gray-600 mb-4">Last updated: April 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Services</h2>
          <p className="text-gray-600">
            Detail Labs provides mobile car detailing services in the El Paso, TX area.
            We travel to your location with all necessary equipment and supplies to detail your vehicle.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Booking and Appointments</h2>
          <ul className="list-disc list-inside text-gray-600 ml-4 space-y-2">
            <li>Appointments must be booked at least 24 hours in advance.</li>
            <li>A valid phone number and email are required for booking.</li>
            <li>You will receive a confirmation and reminders via SMS and/or email.</li>
            <li>Please ensure your vehicle is accessible at the scheduled time and location.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Cancellation Policy</h2>
          <p className="text-gray-600">
            We understand plans change. Please notify us at least 24 hours before your appointment
            if you need to cancel or reschedule. Same-day cancellations may be subject to a cancellation fee.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Pricing and Payment</h2>
          <ul className="list-disc list-inside text-gray-600 ml-4 space-y-2">
            <li>Prices vary based on vehicle size and selected services.</li>
            <li>Payment is due upon completion of service.</li>
            <li>We accept cash, credit card, Cash App, and Zelle.</li>
            <li>Prices are subject to change without notice.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Service Location</h2>
          <p className="text-gray-600">
            We provide mobile services throughout the El Paso area. Service availability
            may vary based on your location. West side locations (certain zip codes) are
            only serviced on Mondays.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">6. SMS Communications</h2>
          <p className="text-gray-600 mb-2">
            By providing your phone number, you agree to receive SMS messages including:
          </p>
          <ul className="list-disc list-inside text-gray-600 ml-4 space-y-1">
            <li>Booking confirmations</li>
            <li>Appointment reminders</li>
            <li>Service updates</li>
          </ul>
          <p className="text-gray-600 mt-2">
            Message and data rates may apply. Reply STOP to opt out at any time.
            Reply HELP for assistance. Message frequency varies.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Liability</h2>
          <p className="text-gray-600">
            Detail Labs takes great care with your vehicle. However, we are not responsible for:
          </p>
          <ul className="list-disc list-inside text-gray-600 ml-4 space-y-1 mt-2">
            <li>Pre-existing damage or conditions</li>
            <li>Items left in the vehicle</li>
            <li>Damage caused by pre-existing paint or interior conditions</li>
          </ul>
          <p className="text-gray-600 mt-2">
            Please remove valuables and personal items before your appointment.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Satisfaction Guarantee</h2>
          <p className="text-gray-600">
            We strive for 100% customer satisfaction. If you are not satisfied with our service,
            please contact us within 24 hours and we will work to resolve any issues.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Contact Us</h2>
          <p className="text-gray-600">
            <strong>Detail Labs</strong><br />
            Phone: 915-270-2659<br />
            Email: lantill2270@gmail.com
          </p>
        </section>
      </div>
    </div>
  );
}
