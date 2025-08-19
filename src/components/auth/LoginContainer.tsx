'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { LoginRequest } from '@/types';

export default function LoginContainer() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (credentials: LoginRequest) => {
    try {
      setError(null);
      setIsLoading(true);
      await login(credentials.email, credentials.password);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      <LoginForm onLogin={handleLogin} isLoading={isLoading} />
    </div>
  );
}
