import { MetadataRoute } from 'next';
import { jsonStorage } from '@/lib/state/json-store';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Get all calendar IDs
  let calendars: string[] = [];
  try {
    calendars = await jsonStorage.listCalendars();
  } catch (error) {
    console.error('Error loading calendars for sitemap:', error);
  }

  // Static routes
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/calendar/generate`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
  ];

  // Dynamic calendar routes
  const calendarRoutes = calendars.map((weekId) => ({
    url: `${baseUrl}/calendar/${weekId}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...calendarRoutes];
}
