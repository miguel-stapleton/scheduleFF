import '../styles.css';
import BootstrapClient from './components/BootstrapClient';

export const metadata = {
  title: 'Wedding Day Beauty Schedule',
  description: 'Kanban-style wedding day beauty schedule creator',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/icons/apple-touch-icon-180.png',
  },
};

export const viewport = {
  themeColor: '#000000',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <BootstrapClient />
        {children}
      </body>
    </html>
  );
}
