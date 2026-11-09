import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../api/client";

export type Me = {
  name: string;
  email: string;
  picture?: string;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<Me>("/api/me"),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>("/logout", { method: "POST" }),
    onSuccess: () => queryClient.resetQueries(),
  });
}
