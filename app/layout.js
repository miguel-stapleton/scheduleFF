export const metadata = {
  title: 'Wedding Day Beauty Schedule',
  description: 'Kanban-style wedding day beauty schedule creator',
};

import '../styles.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
