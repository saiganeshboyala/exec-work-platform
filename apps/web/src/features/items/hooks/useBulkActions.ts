import type { BulkUpdateItemsInput } from '@ewp/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { queryKeys } from '@/shared/api/query-keys';

import { collabApi } from '../api/collab.api';

export type BulkPatch = BulkUpdateItemsInput['patch'];

/** Selection state plus the two mutations that act on it. */
export function useBulkActions(boardId: string) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.boardItems(boardId) });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const toggle = useCallback((id: string): void => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setMany = useCallback((ids: string[], on: boolean): void => {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const update = useMutation({
    mutationFn: (patch: BulkPatch) =>
      collabApi.bulkUpdate({ itemIds: [...selected], patch }),
    onSuccess: async () => {
      clear();
      await invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: () => collabApi.bulkDelete([...selected]),
    onSuccess: async () => {
      clear();
      await invalidate();
    },
  });

  return { selected, toggle, setMany, clear, update, remove };
}
