'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminDashboard from '@/components/AdminDashboard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Alert, AlertDescription } from '@/components/ui/alert';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAdminStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          if (mounted) {
            console.log('No session found, redirecting to login');
            router.replace('/login');
          }
          return;
        }

        // Check if user has admin role in profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (!profile || profile.role !== 'admin') {
          if (mounted) {
            console.log('User is not admin, redirecting to home');
            router.replace('/');
          }
          return;
        }

        if (mounted) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to verify admin status');
          router.replace('/login');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkAdminStatus();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="w-full max-w-4xl mx-auto mt-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive" className="w-full max-w-4xl mx-auto mt-4">
        <AlertDescription>You do not have permission to access this page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <AdminDashboard />
      </Suspense>
    </ErrorBoundary>
  );
} 