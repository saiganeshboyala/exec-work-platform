/**
 * Central key registry. Colocating keys is what makes cache invalidation
 * predictable: a mutation invalidates a namespace, not a guessed string.
 */
export const queryKeys = {
  session: ['session'] as const,
  dashboard: (workspaceId?: string) => ['dashboard', workspaceId ?? 'all'] as const,
  workspaces: ['workspaces'] as const,
  boards: (workspaceId: string) => ['boards', workspaceId] as const,
  board: (boardId: string) => ['board', boardId] as const,
  items: (filters: Record<string, unknown>) => ['items', filters] as const,
  boardItems: (boardId: string) => ['items', 'board', boardId] as const,
  members: ['members'] as const,
  invitations: ['invitations'] as const,
} as const;
