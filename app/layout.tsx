import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aritzia Supply Chain Monitor',
  description: 'Real-time weather and natural disaster monitoring for Aritzia supply chain locations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
