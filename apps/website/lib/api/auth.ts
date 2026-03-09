import { api } from './axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface User {
  id: string;
  email: string;
  name: string;
  accountRole: string;
  role: string;
}

export const authKeys = {
  me: ['auth', 'me'] as const,
};

export const useUser = () => {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: async () => {
      const res = await api.get<{ data: User }>('/auth/me');
      return res.data.data;
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
};

export const useLoginGoogle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idToken: string) => {
      const res = await api.post<{ data: { user: User } }>('/auth/google', { idToken });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.me, data.user);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
};
