import './globals.css';
import SwRegister from './sw-register';

export const metadata = {
  title: 'Samura Perfumes - Sistema',
  description: 'Sistema de gestão Samura Perfumes',
  applicationName: 'Samura Perfumes',
  icons: { apple: '/icon-192.png' },
  appleWebApp: { capable: true, title: 'Samura', statusBarStyle: 'black-translucent' },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b0b0b' };

export default function RootLayout({ children }) {
  return (
    <html lang='pt-BR'>
      <head>
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='' />
        <link rel='stylesheet' href='https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Montserrat:wght@300;400;600&display=swap' />
      </head>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
