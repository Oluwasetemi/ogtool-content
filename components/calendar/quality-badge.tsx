import { QualityScore } from '@/lib/core/types';

interface QualityBadgeProps {
  score: QualityScore | number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function QualityBadge({ score, size = 'md', showLabel = true }: QualityBadgeProps) {
  const value = typeof score === 'number' ? score : score.overall;

  const getColor = (val: number) => {
    if (val >= 8.5) return 'bg-green-500 text-white';
    if (val >= 7.5) return 'bg-blue-500 text-white';
    if (val >= 7.0) return 'bg-yellow-500 text-white';
    if (val >= 6.0) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getGrade = (val: number) => {
    if (val >= 9.0) return 'S';
    if (val >= 8.5) return 'A+';
    if (val >= 8.0) return 'A';
    if (val >= 7.5) return 'B+';
    if (val >= 7.0) return 'B';
    if (val >= 6.0) return 'C';
    if (val >= 5.0) return 'D';
    return 'F';
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`${getColor(value)} ${sizeClasses[size]} font-semibold rounded-full`}>
        {value.toFixed(1)}/10
      </span>
      {showLabel && (
        <span className="text-sm font-medium text-gray-600">
          Grade {getGrade(value)}
        </span>
      )}
    </div>
  );
}

interface QualityBreakdownProps {
  score: QualityScore;
}

export function QualityBreakdown({ score }: QualityBreakdownProps) {
  const dimensions = [
    { name: 'Naturalness', value: score.naturalness, weight: '30%' },
    { name: 'Distribution', value: score.distribution, weight: '25%' },
    { name: 'Consistency', value: score.consistency, weight: '20%' },
    { name: 'Diversity', value: score.diversity, weight: '15%' },
    { name: 'Timing', value: score.timing, weight: '10%' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Quality Breakdown</h3>
        <QualityBadge score={score.overall} showLabel={true} />
      </div>

      <div className="space-y-2">
        {dimensions.map((dim) => (
          <div key={dim.name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-gray-900">
                {dim.name}
                <span className="text-gray-500 ml-2">({dim.weight})</span>
              </span>
              <span className="font-semibold text-gray-900">{dim.value.toFixed(1)}/10</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  dim.value >= 8.5
                    ? 'bg-green-500'
                    : dim.value >= 7.5
                    ? 'bg-blue-500'
                    : dim.value >= 7.0
                    ? 'bg-yellow-500'
                    : 'bg-orange-500'
                }`}
                style={{ width: `${(dim.value / 10) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {score.flags && score.flags.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Quality Flags ({score.flags.length})</h4>
          <div className="space-y-2">
            {score.flags.map((flag, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  flag.severity === 'critical'
                    ? 'bg-red-50 border-red-200'
                    : flag.severity === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                      flag.severity === 'critical'
                        ? 'bg-red-200 text-red-800'
                        : flag.severity === 'warning'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-blue-200 text-blue-800'
                    }`}
                  >
                    {flag.severity}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{flag.message}</p>
                    <p className="text-xs text-gray-600 mt-1">→ {flag.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
