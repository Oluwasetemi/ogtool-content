import { Metadata } from 'next';
import { constructMetadata } from '@/lib/metadata';

export const metadata: Metadata = constructMetadata({
  title: 'Generate Calendar - OGTools',
  description: 'Create a new week of AI-generated Reddit content with customizable quality thresholds and post counts.',
  image: `/api/og?title=${encodeURIComponent('Generate Calendar')}&description=${encodeURIComponent('Create authentic Reddit content with AI')}`,
});

export default function GenerateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
