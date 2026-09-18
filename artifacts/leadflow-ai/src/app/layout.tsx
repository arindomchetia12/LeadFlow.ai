import type { Metadata } from 'next';
import '../index.css';

export const metadata: Metadata = {
  title: 'LeadFlow.ai',
  description: 'AI-powered lead management for growing businesses.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}