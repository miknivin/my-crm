import { Outfit } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import ReduxProvider from '@/components/providers/ReduxProvider';
import TestModeTitleOverride from '@/components/common/TestModeTitleOverride';
const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ReduxProvider>
          <TestModeTitleOverride />
          <ThemeProvider>
            <SidebarProvider>
              {children}
            </SidebarProvider>
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
