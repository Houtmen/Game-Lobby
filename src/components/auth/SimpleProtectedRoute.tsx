'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
}

export default function SimpleProtectedRoute({ children }: SimpleProtectedRouteProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      // Check for stored user data
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('accessToken');
      
      if (storedUser && storedToken) {
        try {
          JSON.parse(storedUser); // Validate JSON
          setIsAuthenticated(true);
        } catch (error) {
          // Invalid stored data
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-gray-300">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
