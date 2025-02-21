'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AnnotationApp from '@/components/AnnotationApp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );
}

function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Welcome to Tense Annotation Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-gray-600">
            A tool for annotating English tense-aspect structures in learner texts.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/register')}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Sign Up
            </button>
          </div>
          <p className="text-center text-sm text-gray-500">
            New annotators can create an account by clicking Sign Up
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (!session) {
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        // Get user role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;

        if (mounted) {
          setSession(session);
          setUserRole(profile?.role || null);

          // Redirect admin users to admin dashboard
          if (profile?.role === 'admin') {
            router.replace('/admin');
            return;
          }
        }
      } catch (err) {
        console.error('Auth error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Authentication failed');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        if (mounted) {
          setSession(null);
          setUserRole(null);
        }
      } else {
        // Get user role on auth state change
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (mounted) {
          setSession(session);
          setUserRole(profile?.role || null);

          if (profile?.role === 'admin') {
            router.replace('/admin');
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign out');
    }
  };

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

  // Show landing page for non-authenticated users
  if (!session) {
    return <LandingPage />;
  }

  // Show AnnotationApp for authenticated annotators
  if (session && userRole === 'annotator') {
    return (
      <div>
        <div className="flex justify-end p-4">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Logout
          </button>
        </div>
        <AnnotationApp annotatorId={session.user.id} />
      </div>
    );
  }

  return <LoadingFallback />;
}