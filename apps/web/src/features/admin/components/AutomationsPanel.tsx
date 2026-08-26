import {
  AUTOMATION_ACTIONS,
  AUTOMATION_TRIGGERS,
  ITEM_STATUSES,
  type AutomationAction,
  type AutomationTrigger,
  type ItemStatus,
} from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { membersApi } from '@/features/members';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { SkeletonRows } from '@/shared/components/Skeleton';
import { formatDateTime } from '@/shared/lib/format';
import { STATUS_TONE } from '@/shared/lib/item-meta';

import { adminApi } from '../api/admin.api';

const TRIGGER_LABEL: Record<AutomationTrigger, string> = {
  STATUS_CHANGED: 'a status changes',
  OWNER_CHANGED: 'an owner changes',
  DUE_DATE_APPROACHING: 'a due date approaches',
  ITEM_CREATED: 'a task is created',
};

const ACTION_LABEL: Record<AutomationAction, string> = {
  NOTIFY_OWNER: 'notify the owner',
  NOTIFY_USER: 'notify a specific person',
  SET_STATUS: 'set the status',
  SET_PRIORITY: 'set the priority',
  ASSIGN_OWNER: 'assign an owner',
};

export function AutomationsPanel() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<AutomationTrigger>('STATUS_CHANGED');
  const [status, setStatus] = useState<ItemStatus>('BLOCKED');
  const [action, setAction] = useState<AutomationAction>('NOTIFY_OWNER');
  const [userId, setUserId] = useState('');

  const automations = useQuery({ queryKey: ['automations'], queryFn: adminApi.listAutomations });
  const members = useQuery({ queryKey: queryKeys.members, queryFn: membersApi.list });

  const invalidate = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: ['automations'] }).then(() => undefined);

  const create = useMutation({
    mutationFn: () =>
      adminApi.createAutomation({
        name: name.trim(),
        trigger,
        condition: trigger === 'STATUS_CHANGED' ? { status } : undefined,
        action,
        actionConfig: action === 'NOTIFY_USER' || action === 'ASSIGN_OWNER' ? { userId } : undefined,
        enabled: true,
      }),
    onSuccess: async () => {
      setName('');
      await invalidate();
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      adminApi.updateAutomation(id, { enabled }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.removeAutomation(id),
    onSuccess: invalidate,
  });

  const needsUser = action === 'NOTIFY_USER' || action === 'ASSIGN_OWNER';

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <div className="card stack">
        <p className="card__title" style={{ marginBottom: 0 }}>New rule</p>

        <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <input
            className="field__input"
            placeholder="Rule name"
            aria-label="Rule name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={{ width: 220 }}
          />

          <span className="meta">When</span>
          <select
            className="field__input"
            aria-label="Trigger"
            value={trigger}
            onChange={(event) => setTrigger(event.target.value as AutomationTrigger)}
          >
            {AUTOMATION_TRIGGERS.map((value) => (
              <option key={value} value={value}>{TRIGGER_LABEL[value]}</option>
            ))}
          </select>

          {trigger === 'STATUS_CHANGED' ? (
            <>
              <span className="meta">to</span>
              <select
                className="field__input"
                aria-label="Status condition"
                value={status}
                onChange={(event) => setStatus(event.target.value as ItemStatus)}
              >
                {ITEM_STATUSES.map((value) => (
                  <option key={value} value={value}>{STATUS_TONE[value].label}</option>
                ))}
              </select>
            </>
          ) : null}

          <span className="meta">then</span>
          <select
            className="field__input"
            aria-label="Action"
            value={action}
            onChange={(event) => setAction(event.target.value as AutomationAction)}
          >
            {AUTOMATION_ACTIONS.map((value) => (
              <option key={value} value={value}>{ACTION_LABEL[value]}</option>
            ))}
          </select>

          {needsUser ? (
            <select
              className="field__input"
              aria-label="Person"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            >
              <option value="">Choose a person…</option>
              {members.data?.map((member) => (
                <option key={member.userId} value={member.userId}>{member.fullName}</option>
              ))}
            </select>
          ) : null}

          <button
            className="btn btn--primary"
            disabled={name.trim() === '' || (needsUser && userId === '') || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? 'Adding…' : 'Add rule'}
          </button>
        </div>

        {create.error ? <ErrorNotice error={create.error} /> : null}
      </div>

      {automations.isPending ? (
        <SkeletonRows rows={3} height={56} />
      ) : automations.error ? (
        <ErrorNotice error={automations.error} />
      ) : (
        <div className="card card--flush">
          {(automations.data ?? []).map((rule) => (
            <div
              key={rule.id}
              className="row"
              style={{ padding: '12px var(--space-4)', borderBottom: '1px solid var(--line)', gap: 'var(--space-3)' }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 'var(--text-md)', fontWeight: 500 }}>{rule.name}</span>
                <span className="meta" style={{ display: 'block' }}>
                  When {TRIGGER_LABEL[rule.trigger]}
                  {rule.condition?.status ? ` to ${String(rule.condition.status).toLowerCase()}` : ''} → {ACTION_LABEL[rule.action]}
                </span>
              </span>

              <span className="meta" style={{ whiteSpace: 'nowrap' }}>
                ran {rule.runCount}×{rule.lastRunAt ? ` · ${formatDateTime(rule.lastRunAt)}` : ''}
              </span>

              <button
                className="chip"
                aria-pressed={rule.enabled}
                onClick={() => toggle.mutate({ id: rule.id, enabled: !rule.enabled })}
              >
                {rule.enabled ? 'On' : 'Off'}
              </button>

              <button className="btn btn--ghost btn--sm" onClick={() => remove.mutate(rule.id)}>
                Delete
              </button>
            </div>
          ))}

          {automations.data?.length === 0 ? (
            <p className="meta" style={{ padding: 'var(--space-4)' }}>
              No rules yet. A good first one: when a status changes to Blocked, notify the owner.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
