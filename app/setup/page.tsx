'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SetupPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);

  const handleSeed = async () => {
    setIsSeeding(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/seed', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        // Fetch status after seeding
        await checkStatus();
      } else {
        setError(data.message || 'Failed to seed data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed data');
    } finally {
      setIsSeeding(false);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/seed');
      const data = await response.json();

      if (response.ok) {
        setStatus(data.data);
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    }
  };

  // Load status on mount
  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Initial Setup</h1>
          <p className="text-gray-600 mt-1">Configure your storage and seed initial data</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Current Status */}
          {status && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Status</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Company Configured</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    status.company.configured
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {status.company.configured ? 'Yes' : 'Using Defaults'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Personas</span>
                  <span className="text-gray-900 font-medium">{status.personas} configured</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Keywords</span>
                  <span className="text-gray-900 font-medium">{status.keywords} configured</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Calendars</span>
                  <span className="text-gray-900 font-medium">{status.calendars} generated</span>
                </div>
              </div>
            </div>
          )}

          {/* Seed Data */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Seed Initial Data</h2>
            <p className="text-gray-600 mb-6">
              This will load company info, personas, and keywords from your data directory into storage.
            </p>

            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                isSeeding
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSeeding ? 'Seeding Data...' : 'Seed Data Now'}
            </button>

            {result && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-green-900 font-medium">{result.message}</p>
                    <ul className="mt-2 text-sm text-green-800">
                      <li>Company: {result.data.company ? '✓' : '✗'}</li>
                      <li>Personas: {result.data.personas}</li>
                      <li>Keywords: {result.data.keywords}</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-red-900 font-medium">Error</p>
                    <p className="text-sm text-red-800 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Setup Instructions</h3>
            <ol className="space-y-2 text-blue-900 text-sm list-decimal list-inside">
              <li>Ensure you have data files in the <code className="bg-blue-100 px-1 py-0.5 rounded">/data</code> directory</li>
              <li>Click "Seed Data Now" to populate your storage</li>
              <li>Verify the data was loaded successfully</li>
              <li>Navigate to "Generate Calendar" to create your first calendar</li>
            </ol>
          </div>

          {/* Next Steps */}
          {result && (
            <div className="flex gap-3">
              <Link href="/calendar/generate" className="flex-1">
                <button className="w-full py-3 px-6 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                  Generate First Calendar
                </button>
              </Link>
              <Link href="/" className="flex-1">
                <button className="w-full py-3 px-6 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                  Go to Dashboard
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
