'use client';

import { useUser } from '@/contexts/UserContext';
import Dashboard from '@/components/Dashboard';
import LandingPage from '@/components/LandingPage';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, isLoading } = useUser();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  // If user is logged in, show the Dashboard
  if (user) {
    return <Dashboard />;
  }

  // Otherwise, show the Public Landing Page
  return <LandingPage />;
}
