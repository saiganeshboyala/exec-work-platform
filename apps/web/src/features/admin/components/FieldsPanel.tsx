import { FIELD_TYPES, type FieldType } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { SkeletonRows } from '@/shared/components/Skeleton';

import { adminApi } from '../api/admin.api';

const TYPE_LABEL: Record<FieldType, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  CURRENCY: 'Currency',
  DATE: 'Date',
  SELECT: 'Select',
  USER: 'Person',
  CHECKBOX: 'Checkbox',
};

/** Organisation-wide columns. Board-specific ones are created from a board. */
export function FieldsPanel() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldType>('TEXT');
  const [options, setOptions] = useState('');

  const fields = useQuery({ queryKey: ['fields'], queryFn: () => adminApi.listFields() });

  const invalidate = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: ['fields'] }).then(() => undefined);

  const create = useMutation({
    mutationFn: () =>
      adminApi.createField({
        label: label.trim(),
        type,
        config:
          type === 'SELECT'
            ? { options: options.split(',').map((option) => option.trim()).filter(Boolean) }
            : undefined,
      }),
    onSuccess: async () => {
      setLabel('');
      setOptions('');
      await invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.removeField(id),
    onSuccess: invalidate,
  });

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <div className="card stack">
        <p className="card__title" style={{ marginBottom: 0 }}>New field</p>

        <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <input
            className="field__input"
            placeholder="e.g. Cost centre"
            aria-label="Field name"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            style={{ width: 220 }}
          />

          <select
            className="field__input"
            aria-label="Field type"
            value={type}
            onChange={(event) => setType(event.target.value as FieldType)}
          >
            {FIELD_TYPES.map((value) => (
              <option key={value} value={value}>{TYPE_LABEL[value]}</option>
            ))}
          </select>

          {type === 'SELECT' ? (
            <input
              className="field__input"
              placeholder="Options, comma separated"
              aria-label="Select options"
              value={options}
              onChange={(event) => setOptions(event.target.value)}
              style={{ width: 280 }}
            />
          ) : null}

          <button
            className="btn btn--primary"
            disabled={label.trim() === '' || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? 'Adding…' : 'Add field'}
          </button>
        </div>

        {create.error ? <ErrorNotice error={create.error} /> : null}
      </div>

      {fields.isPending ? (
        <SkeletonRows rows={3} height={48} />
      ) : fields.error ? (
        <ErrorNotice error={fields.error} />
      ) : (
        <div className="card card--flush">
          {(fields.data ?? []).map((field) => (
            <div
              key={field.id}
              className="row"
              style={{ padding: '11px var(--space-4)', borderBottom: '1px solid var(--line)', gap: 'var(--space-3)' }}
            >
              <span style={{ flex: 1, fontSize: 'var(--text-md)' }}>{field.label}</span>
              <span className="badge" style={{ background: 'var(--neutral-wash)', color: 'var(--neutral)' }}>
                {TYPE_LABEL[field.type]}
              </span>
              <span className="meta">{field.boardId ? 'one board' : 'all boards'}</span>
              <code className="meta">{field.key}</code>
              <button className="btn btn--ghost btn--sm" onClick={() => remove.mutate(field.id)}>
                Delete
              </button>
            </div>
          ))}

          {fields.data?.length === 0 ? (
            <p className="meta" style={{ padding: 'var(--space-4)' }}>
              No custom fields yet.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
