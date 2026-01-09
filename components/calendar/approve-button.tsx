'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ApproveButton({ weekId }: { weekId: string }) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const response = await fetch(`/api/calendar/${weekId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve calendar');
      }

      router.refresh();
    } catch (error) {
      console.error('Error approving calendar:', error);
      alert('Failed to approve calendar. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <button
      onClick={handleApprove}
      disabled={isApproving}
      className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {isApproving ? 'Approving...' : 'Approve Calendar'}
    </button>
  );
}
