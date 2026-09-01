import { useState } from 'react';

import { useAuth } from '@/features/auth';
import { PageHeader } from '@/shared/components/PageHeader';
import { SegmentedControl } from '@/shared/components/SegmentedControl';

import { AccessPanel } from '../components/AccessPanel';
import { ApprovalsPanel } from '../components/ApprovalsPanel';
import { AuditPanel } from '../components/AuditPanel';
import { AutomationsPanel } from '../components/AutomationsPanel';
import { FieldsPanel } from '../components/FieldsPanel';
import { WorkloadPanel } from '../components/WorkloadPanel';

type Tab = 'approvals' | 'workload' | 'automations' | 'fields' | 'access' | 'audit';

/**
 * Everything an administrator needs, behind one door. Kept as tabs rather than
 * five sidebar entries so the main navigation stays about work, not settings.
 */
export function AdminPage() {
  const [tab, setTab] = useState<Tab>('approvals');
  const { user } = useAuth();
  // Workload is a tally of everybody's open work, so it is the owner's alone.
  // Shown to an admin it would only ever render the API's refusal.
  const seesWorkload = user?.role === 'OWNER';

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <PageHeader
        title="Administration"
        subtitle="Approvals, capacity, automation rules, custom fields, access and the audit trail."
        actions={
          <SegmentedControl<Tab>
            ariaLabel="Admin section"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'approvals', label: 'Approvals' },
              ...(seesWorkload ? [{ value: 'workload' as const, label: 'Workload' }] : []),
              { value: 'automations', label: 'Automations' },
              { value: 'fields', label: 'Fields' },
              { value: 'access', label: 'Access' },
              { value: 'audit', label: 'Audit' },
            ]}
          />
        }
      />

      {tab === 'approvals' ? <ApprovalsPanel /> : null}
      {tab === 'workload' && seesWorkload ? <WorkloadPanel /> : null}
      {tab === 'automations' ? <AutomationsPanel /> : null}
      {tab === 'fields' ? <FieldsPanel /> : null}
      {tab === 'access' ? <AccessPanel /> : null}
      {tab === 'audit' ? <AuditPanel /> : null}
    </div>
  );
}
