import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../api/client";

export type LabelListVisibility = "labelShow" | "labelShowIfUnread" | "labelHide";
export type MessageListVisibility = "show" | "hide";

export type Label = {
  id: string;
  name: string;
  type: "system" | "user";
  labelListVisibility: LabelListVisibility | null;
  messageListVisibility: MessageListVisibility | null;
  color: LabelColor | null;
  messagesTotal: number | null;
  messagesUnread: number | null;
};

export type LabelColor = { textColor: string; backgroundColor: string };

export type LabelInput = {
  name: string;
  labelListVisibility: LabelListVisibility;
  messageListVisibility: MessageListVisibility;
  color: LabelColor | null;
};

const labelKeys = {
  all: ["labels"] as const,
  detail: (id: string) => ["labels", id] as const,
};

const labelPath = (id: string) => `/api/labels/${encodeURIComponent(id)}`;

export function useLabels() {
  return useQuery({
    queryKey: labelKeys.all,
    queryFn: () => apiFetch<Label[]>("/api/labels"),
  });
}

export function useLabel(id: string) {
  return useQuery({
    queryKey: labelKeys.detail(id),
    queryFn: () => apiFetch<Label>(labelPath(id)),
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LabelInput) =>
      apiFetch<Label>("/api/labels", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: labelKeys.all }),
  });
}

// Omitted fields are left unchanged; `color: null` removes the color.
export function useUpdateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<LabelInput> }) => {
      const { color, ...rest } = input;
      if (color !== null) {
        return apiFetch<Label>(labelPath(id), { method: "PATCH", body: JSON.stringify(input) });
      }
      // PATCH can't clear a color.
      const uncolored = await apiFetch<Label>(`${labelPath(id)}/color`, { method: "DELETE" });
      return Object.keys(rest).length === 0
        ? uncolored
        : apiFetch<Label>(labelPath(id), { method: "PATCH", body: JSON.stringify(rest) });
    },
    // Optimistic update
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: labelKeys.all, exact: true });
      const previous = queryClient.getQueryData<Label[]>(labelKeys.all);
      // Backend renames children too, so do the same in the cache
      const oldName = previous?.find((label) => label.id === id)?.name;
      const renameChild = (name: string) =>
        oldName && input.name && name.startsWith(`${oldName}/`)
          ? input.name + name.slice(oldName.length)
          : name;
      queryClient.setQueryData<Label[]>(labelKeys.all, (labels) =>
        labels?.map((label) =>
          label.id === id ? { ...label, ...input } : { ...label, name: renameChild(label.name) },
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) =>
      queryClient.setQueryData(labelKeys.all, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: labelKeys.all }),
  });
}

export function useDeleteLabel(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>(labelPath(id), { method: "DELETE" }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: labelKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: labelKeys.all });
    },
  });
}
