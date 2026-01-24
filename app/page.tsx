import Link from 'next/link';

export default function Home() {
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
                href="/book"
                className="px-4 py-2 text-white hover:text-gray-200 font-medium"
              >
                Book Appointment
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center bg-white/20 backdrop-blur-md rounded-lg p-8 shadow-lg border border-white/30">
          <h1 className="text-4xl font-extrabold text-black sm:text-5xl md:text-6xl">
            <span className="block">Welcome to</span>
            <span className="block text-black">Booking Site</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-black sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Easily book your appointments online. Browse our services and find a time that works for you.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Link
                href="/book"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-black bg-sky-400/80 backdrop-blur-sm hover:bg-sky-500/90 md:py-4 md:text-lg md:px-10 shadow-lg"
              >
                Book Now
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

