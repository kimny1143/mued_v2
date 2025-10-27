import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

export default async function Home() {
  const user = await currentUser();

  // Redirect to dashboard if already logged in
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">MUED LMS</h1>
          <div className="flex gap-4">
            <Link
              href="/sign-in"
              className="text-gray-700 px-4 py-2 hover:text-blue-600 transition"
            >
              Log In
            </Link>
            <Link
              href="/sign-up"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Get Started Free
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Music Lessons Made Easy
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            MUED LMS connects students with expert mentors through
            <br />
            a next-generation learning management system
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/sign-up"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg hover:bg-blue-700 transition"
            >
              Get Started Free Today
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🎵</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Flexible Scheduling</h3>
            <p className="text-gray-600">
              Schedule lessons that work for both mentors and students
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📚</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Rich Material Library</h3>
            <p className="text-gray-600">
              AI-generated personalized materials for efficient learning
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Real-Time Communication</h3>
            <p className="text-gray-600">
              Chat features for real-time interaction between mentors and students
            </p>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12">Pricing Plans</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-gray-200">
              <h3 className="text-xl font-semibold mb-2">Free Plan</h3>
              <p className="text-3xl font-bold mb-4">¥0<span className="text-sm font-normal">/month</span></p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>✓ 1 lesson booking per month</li>
                <li>✓ Access to basic materials</li>
                <li>✓ Messaging features</li>
              </ul>
              <Link
                href="/sign-up"
                className="block text-center bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Get Started Free
              </Link>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-blue-500">
              <h3 className="text-xl font-semibold mb-2">Basic Plan</h3>
              <p className="text-3xl font-bold mb-4">¥2,980<span className="text-sm font-normal">/month</span></p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>✓ 4 lesson bookings per month</li>
                <li>✓ Access to all materials</li>
                <li>✓ Priority support</li>
              </ul>
              <Link
                href="/sign-up"
                className="block text-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Choose Plan
              </Link>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-purple-500">
              <h3 className="text-xl font-semibold mb-2">Premium Plan</h3>
              <p className="text-3xl font-bold mb-4">¥5,980<span className="text-sm font-normal">/month</span></p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>✓ Unlimited lesson bookings</li>
                <li>✓ AI material generation</li>
                <li>✓ 1-on-1 coaching</li>
              </ul>
              <Link
                href="/sign-up"
                className="block text-center bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
              >
                Choose Plan
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 mt-24 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 MUED LMS - glasswerks inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}