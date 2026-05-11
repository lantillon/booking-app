'use client';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-gray-600 mb-4">Last updated: April 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Information We Collect</h2>
          <p className="text-gray-600 mb-2">
            When you book an appointment with Detail Labs, we collect the following information:
          </p>
          <ul className="list-disc list-inside text-gray-600 ml-4 space-y-1">
            <li>Name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Service address/location</li>
            <li>Vehicle information</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">2. How We Use Your Information</h2>
          <p className="text-gray-600 mb-2">We use your information to:</p>
          <ul className="list-disc list-inside text-gray-600 ml-4 space-y-1">
            <li>Schedule and confirm your appointments</li>
            <li>Send appointment reminders via SMS and email</li>
            <li>Contact you about your service</li>
            <li>Improve our services</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">3. SMS Messaging</h2>
          <p className="text-gray-600 mb-2">
            By providing your phone number during booking, you consent to receive SMS messages from Detail Labs, including:
          </p>
          <ul className="list-disc list-inside text-gray-600 ml-4 space-y-1">
            <li>Booking confirmations</li>
            <li>Appointment reminders (24 hours and 1 hour before)</li>
            <li>Service-related updates</li>
          </ul>
          <p className="text-gray-600 mt-2">
            <strong>Message frequency varies.</strong> Message and data rates may apply.
            Reply STOP to opt out of SMS messages at any time. Reply HELP for assistance.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Data Sharing</h2>
          <p className="text-gray-600">
            We do not sell, trade, or rent your personal information to third parties.
            We may share your information with service providers who assist us in operating our business
            (such as payment processors and SMS providers), but only as necessary to provide our services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Data Security</h2>
          <p className="text-gray-600">
            We implement appropriate security measures to protect your personal information.
            However, no method of transmission over the Internet is 100% secure.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Your Rights</h2>
          <p className="text-gray-600">You have the right to:</p>
          <ul className="list-disc list-inside text-gray-600 ml-4 space-y-1">
            <li>Request access to your personal data</li>
            <li>Request correction of your personal data</li>
            <li>Request deletion of your personal data</li>
            <li>Opt out of SMS communications</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Contact Us</h2>
          <p className="text-gray-600">
            If you have questions about this Privacy Policy, contact us at:
          </p>
          <p className="text-gray-600 mt-2">
            <strong>Detail Labs</strong><br />
            Phone: 915-270-2659<br />
            Email: lantill2270@gmail.com
          </p>
        </section>
      </div>
    </div>
  );
}
