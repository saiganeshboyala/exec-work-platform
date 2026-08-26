import type { CreateItemInput, ItemDto, UpdateItemInput } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/query-keys';

import { itemsApi } from '../api/items.api';

/**
 * Every board mutation writes through the same cache key, and edits are applied
 * optimistically: a status cell that waits for a round trip before recolouring
 * feels broken, which is the whole reason this view is a grid and not a form.
 */
export function useBoardItems(boardId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.boardItems(boardId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => itemsApi.listForBoard(boardId),
    enabled: Boolean(boardId),
  });

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: key });
    // Todo counts these same rows.
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateItemInput }) =>
      itemsApi.update(id, patch),

    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ItemDto[]>(key);

      queryClient.setQueryData<ItemDto[]>(key, (current) =>
        (current ?? []).map((item) =>
          item.id === id ? ({ ...item, ...patch } as ItemDto) : item,
        ),
      );

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },

    onSettled: () => void invalidate(),
  });

  const create = useMutation({
    mutationFn: (body: CreateItemInput) => itemsApi.create(body),
    onSuccess: () => void invalidate(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => itemsApi.remove(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ItemDto[]>(key);
      queryClient.setQueryData<ItemDto[]>(key, (current) =>
        (current ?? []).filter((item) => item.id !== id),
      );
      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },

    onSettled: () => void invalidate(),
  });

  return { query, create, update, remove };
}
