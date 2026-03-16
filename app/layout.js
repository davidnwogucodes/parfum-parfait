import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import Footer from '@/components/Footer';
import BootstrapClient from '@/components/BootstrapClient';

export const metadata = {
  title: 'Parfum-Parfait',
  description: 'Premium Perfume Store',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+Chettan+2&family=Dosis:wght@400;600;700&family=Poppins:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/responsive.css" />
      </head>
      <body>
        <BootstrapClient />
        <CartProvider>
          {children}
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
