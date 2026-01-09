import { Metadata } from 'next';

export const siteConfig = {
  name: 'OGTools',
  description: 'AI-Powered Reddit Content Calendar Generator - Create authentic, high-quality Reddit posts and comments with advanced AI',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ogImage: '/api/og',
  links: {
    twitter: 'https://twitter.com/setemiojo',
    github: 'https://github.com/oluwasetemi',
  },
};

export function constructMetadata({
  title = siteConfig.name,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
} = {}): Metadata {
  return {
    title,
    description,
    keywords: [
      'Reddit',
      'Content Calendar',
      'AI Content Generation',
      'Social Media Management',
      'Reddit Marketing',
      'Content Planning',
      'AI Writing',
      'Reddit Automation',
    ],
    authors: [
      {
        name: 'Oluwasetemi',
        url: 'https://github.com/oluwasetemi',
      },
    ],
    creator: 'Oluwasetemi',
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: siteConfig.url,
      title,
      description,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
      creator: '@oluwasetemi',
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    ...(noIndex && {
      metadataBase: new URL(siteConfig.url),
    }),
  };
}
