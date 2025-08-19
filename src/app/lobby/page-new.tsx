import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { LobbyInterface } from '@/components/lobby/LobbyInterface';

export default function LobbyPage() {
  return (
    <ProtectedRoute>
      <LobbyInterface />
    </ProtectedRoute>
  );
}
