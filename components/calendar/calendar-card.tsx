import Link from 'next/link';
import { QualityBadge } from './quality-badge';

interface CalendarCardProps {
  weekId: string;
  startDate: string | Date;
  status: string;
  postCount: number;
  commentCount: number;
  qualityScore: number;
  generatedAt: number;
}

export function CalendarCard({
  weekId,
  startDate,
  status,
  postCount,
  commentCount,
  qualityScore,
  generatedAt,
}: CalendarCardProps) {
  const date = new Date(startDate);
  const generatedDate = new Date(generatedAt);

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700 border-gray-300',
    approved: 'bg-green-100 text-green-700 border-green-300',
    posted: 'bg-blue-100 text-blue-700 border-blue-300',
  };

  return (
    <Link href={`/calendar/${weekId}`}>
      <div className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{weekId}</h3>
            <p className="text-sm text-gray-500">
              Week of {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full border ${
              statusColors[status as keyof typeof statusColors] || statusColors.draft
            }`}
          >
            {status}
          </span>
        </div>

        <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{postCount} posts</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{commentCount} comments</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <QualityBadge score={qualityScore} size="sm" showLabel={false} />
          <span className="text-xs text-gray-400">
            Generated {generatedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </Link>
  );
}
