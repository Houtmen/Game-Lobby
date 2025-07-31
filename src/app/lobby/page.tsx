import SimpleProtectedRoute from '@/components/auth/SimpleProtectedRoute';
import BasicLobby from '@/components/lobby/BasicLobby';

export default function LobbyPage() {
  return (
    <SimpleProtectedRoute>
      <BasicLobby />
    </SimpleProtectedRoute>
  );
}
