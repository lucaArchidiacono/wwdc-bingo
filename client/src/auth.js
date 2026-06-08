import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api.get('/api/auth/me');
      } catch (e) {
        if (e.status === 401) return { user: null, room: null };
        throw e;
      }
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return async () => {
    await api.post('/api/auth/logout');
    qc.clear();
  };
}
