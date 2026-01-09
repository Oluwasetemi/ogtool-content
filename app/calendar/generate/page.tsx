'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Note: Client components can't export metadata directly
// Metadata is handled by the parent layout

export default function GeneratePage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [minQualityScore, setMinQualityScore] = useState(7.0);
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ weekId: string; qualityScore: number } | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(['Starting generation...']);
    setResult(null);

    try {
      setProgress((prev) => [...prev, 'Loading configuration...']);

      const response = await fetch('/api/calendar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minQualityScore, postsPerWeek }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate calendar');
      }

      const data = await response.json();

      setProgress((prev) => [
        ...prev,
        'Generated post structure...',
        'Generated comment structure...',
        'Distributed posts across week...',
        'Generated text with AI...',
        'Scored quality...',
        `✓ Calendar generated successfully with score ${data.calendar.qualityScore.overall}/10`,
      ]);

      setResult({
        weekId: data.calendar.weekId,
        qualityScore: data.calendar.qualityScore.overall,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate calendar');
      setProgress((prev) => [...prev, `✗ Error: ${err instanceof Error ? err.message : 'Unknown error'}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
          <h1 className="text-3xl font-bold text-gray-900">Generate New Calendar</h1>
          <p className="text-gray-600 mt-1">Create a new week of Reddit content</p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Configuration</h2>

            <div className="space-y-6">
              {/* Posts Per Week */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posts Per Week
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={postsPerWeek}
                  onChange={(e) => setPostsPerWeek(Number(e.target.value))}
                  disabled={isGenerating}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Number of posts to generate (1-10)
                </p>
              </div>

              {/* Min Quality Score */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Quality Score: {minQualityScore.toFixed(1)}/10
                </label>
                <input
                  type="range"
                  min="5"
                  max="9"
                  step="0.5"
                  value={minQualityScore}
                  onChange={(e) => setMinQualityScore(Number(e.target.value))}
                  disabled={isGenerating}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5.0 (Low)</span>
                  <span>7.0 (Standard)</span>
                  <span>9.0 (Excellent)</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  The algorithm will retry up to 5 times to meet this threshold
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isGenerating
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Calendar
                  </>
                )}
              </button>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">How it works:</p>
                    <ul className="space-y-1 text-blue-800">
                      <li>• Selects 3 diverse subreddits</li>
                      <li>• Assigns authentic personas</li>
                      <li>• Generates natural language with AI</li>
                      <li>• Creates realistic comment threads</li>
                      <li>• Scores quality on 5 dimensions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress & Result */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {result ? 'Generation Complete' : 'Progress'}
            </h2>

            {progress.length === 0 && !error && (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p>Click "Generate Calendar" to start</p>
              </div>
            )}

            {progress.length > 0 && (
              <div className="space-y-2 font-mono text-sm">
                {progress.map((step, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded ${
                      step.startsWith('✓')
                        ? 'bg-green-50 text-green-700'
                        : step.startsWith('✗')
                        ? 'bg-red-50 text-red-700'
                        : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {step}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-red-900">
                    <p className="font-medium">Error</p>
                    <p className="mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <svg className="w-12 h-12 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Calendar Generated Successfully!
                  </h3>
                  <p className="text-green-800">
                    Quality Score: <span className="font-bold">{result.qualityScore.toFixed(1)}/10</span>
                  </p>
                </div>

                <button
                  onClick={() => router.push(`/calendar/${result.weekId}`)}
                  className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  View Calendar
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>

                <button
                  onClick={() => {
                    setProgress([]);
                    setResult(null);
                    setError(null);
                  }}
                  className="w-full py-2 px-6 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Generate Another
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
