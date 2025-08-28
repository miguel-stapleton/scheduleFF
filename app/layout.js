import '../styles.css';
import BootstrapClient from './components/BootstrapClient';
import { headers } from 'next/headers';

export const metadata = {
  title: 'Wedding Day Beauty Schedule',
  description: 'Kanban-style wedding day beauty schedule creator',
  manifest: '/manifest.json',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/icons/apple-touch-icon-FF.png',
  },
};

// Ensure per-request rendering so the device class reflects the current UA
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  const ua = headers().get('user-agent') || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /(iPhone|iPad|iPod)/i.test(ua);
  const deviceClass = isAndroid ? 'device-android' : isIOS ? 'device-ios' : 'device-desktop';

  return (
    <html lang="en" className={deviceClass}>
      <body>
        <BootstrapClient />
        {children}
      </body>
    </html>
  );
}
