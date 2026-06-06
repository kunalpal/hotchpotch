import { ThemeProvider } from '@/components/theme-provider';
import BProgressProvider from '@/components/providers/progress-provider';
import '@/app/globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Crimson_Pro, IBM_Plex_Sans } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import QueryProvider from '@/components/providers/query-provider';

const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL!;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#171717' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Baseraa',
  description: 'Personal productivity suite',
  robots: { index: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Baseraa',
  },
  icons: {
    icon: [
      {
        url: '/favicon-light.ico',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/favicon-dark.ico',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/apple-touch-icon.png',
  },
};

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700'],
});

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  variable: '--font-crimson-pro',
  display: 'swap',
  weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-US">
      <body
        className={`${ibmPlexSans.variable} ${crimsonPro.variable} bg-background text-foreground sticky top-0`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <BProgressProvider>
            <QueryProvider>
              <main className="flex min-h-screen flex-col items-center">
                {children}
              </main>
              <Toaster />
            </QueryProvider>
          </BProgressProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
