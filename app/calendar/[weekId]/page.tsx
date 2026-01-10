import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { PostView } from '@/components/calendar/post-view';
import { QualityBreakdown } from '@/components/calendar/quality-badge';
import { ApproveButton } from '@/components/calendar/approve-button';
import { constructMetadata } from '@/lib/metadata';
import { loadCalendar } from '@/lib/core/calendar-generator';

async function getCalendar(weekId: string) {
  try {
    // Load calendar directly from storage (no HTTP call needed)
    console.log('Loading calendar:', weekId);
    const calendar = await loadCalendar(weekId);
    return calendar;
  } catch (error) {
    console.error('Error loading calendar:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ weekId: string }>;
}): Promise<Metadata> {
  const { weekId } = await params;
  const calendar = await getCalendar(weekId);

  if (!calendar) {
    return constructMetadata({
      title: 'Calendar Not Found',
      description: 'The requested calendar could not be found.',
    });
  }

  const startDate = new Date(calendar.startDate);
  const formattedDate = startDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return constructMetadata({
    title: `${calendar.weekId} - Reddit Content Calendar`,
    description: `View ${calendar.posts.length} posts and ${calendar.comments.length} comments for the week of ${formattedDate}. Quality Score: ${calendar.qualityScore.overall.toFixed(1)}/10`,
    image: `/api/og?title=${encodeURIComponent(calendar.weekId)}&description=${encodeURIComponent(`${calendar.posts.length} posts • ${calendar.comments.length} comments • Quality ${calendar.qualityScore.overall.toFixed(1)}/10`)}`,
  });
}

export default async function CalendarDetailPage({
  params,
}: {
  params: Promise<{ weekId: string }>;
}) {
  const { weekId } = await params;
  const calendar = await getCalendar(weekId);

  if (!calendar) {
    notFound();
  }

  const startDate = new Date(calendar.startDate);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{calendar.weekId}</h1>
              <p className="text-gray-600 mt-1">
                Week of {startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-500">
                  {calendar.posts.length} posts • {calendar.comments.length} comments
                </span>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    calendar.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : calendar.status === 'posted'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {calendar.status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/api/calendar/${calendar.weekId}/export`}
                download
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </a>
              {calendar.status === 'draft' && (
                <ApproveButton weekId={calendar.weekId} />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Posts */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Posts & Comments</h2>
            {calendar.posts.map((post: {
              post_id: string;
              subreddit: string;
              title: string;
              body: string;
              author_username: string;
              timestamp: string;
              keyword_ids: string[];
              metadata: {
                topic: string;
                intent: string;
                targetEngagement: number;
              };
            }) => (
              <PostView
                key={post.post_id}
                post={post}
                comments={calendar.comments}
              />
            ))}
          </div>

          {/* Quality Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <QualityBreakdown score={calendar.qualityScore} />
              </div>

              {/* Metadata */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-600">Generated</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {new Date(calendar.metadata.generatedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Attempt</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {calendar.metadata.parameters?.attempt || 1} of 5
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Min Quality Threshold</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {calendar.metadata.parameters?.minQualityScore || 7.0}/10
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                <div className="space-y-3">
                  <Link href="/calendar/generate">
                    <button className="w-full px-4 py-2 mb-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                      Generate New Calendar
                    </button>
                  </Link>
                  <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                    Regenerate This Week
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

