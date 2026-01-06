import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";
import Sidebar from "@/components/Sidebar";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MealPlan Pro | Your Fat Loss Journey",
  description: "Track macros, plan meals, and crush your fitness goals",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <UserProvider>
            <div className="flex">
              <Sidebar />
              <main className="main-content">
                {children}
              </main>
            </div>
          </UserProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

