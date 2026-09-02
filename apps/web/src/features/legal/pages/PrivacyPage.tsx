import { PublicPage, Section } from '../components/PublicPage';

/** Kept in one place so the page and any future copy of it cannot drift. */
const UPDATED = '2 September 2026';

/**
 * The privacy policy Google's review reads before granting a sensitive scope.
 *
 * Written against what the code actually does rather than from a template: the
 * scopes named here are the ones requested in google.provider.ts, and the
 * stored fields are the columns on calendar_connections. If either changes,
 * this page changes with it - a policy that overstates is as much a problem as
 * one that understates.
 */
export function PrivacyPage() {
  return (
    <PublicPage title="Privacy policy" intro={`Last updated ${UPDATED}.`}>
      <Section heading="Who we are">
        <p>
          Todo is operated by CIS Technologies. We provide it as a hosted service to
          organisations, who decide who may use it and what work is recorded in it. For the work
          data inside an organisation&rsquo;s account we act on that organisation&rsquo;s
          instructions; for the running of the service itself we are responsible directly to you.
          Questions about either go to <a href="mailto:support@fyxo.ai">support@fyxo.ai</a>.
        </p>
      </Section>

      <Section heading="What we hold about you">
        <ul style={{ paddingLeft: '1.2rem', display: 'grid', gap: 6 }}>
          <li>
            <strong>Your account:</strong> email address, name, and optionally a job title and
            avatar. Passwords are never stored &mdash; only an argon2id hash, which cannot be
            reversed.
          </li>
          <li>
            <strong>Your work:</strong> the departments, tasks, comments, meetings and decisions
            you create or are added to, and a record of who changed what and when.
          </li>
          <li>
            <strong>Service records:</strong> sign-in times and server logs, kept so we can keep
            the service running and investigate abuse.
          </li>
        </ul>
      </Section>

      <Section heading="Google user data">
        <p>
          Connecting Google Calendar is optional. If you connect it, you grant Todo these scopes
          and nothing else:
        </p>
        <ul style={{ paddingLeft: '1.2rem', display: 'grid', gap: 6 }}>
          <li>
            <code>.../auth/calendar.events</code> &mdash; to create the calendar event behind a
            meeting you schedule in Todo, to move or cancel it when you do, to change who is
            invited, and to ask Google for a Meet link. Todo works with the events it creates this
            way. It does not read your existing calendar and does not scan your diary.
          </li>
          <li>
            <code>openid</code> and <code>email</code> &mdash; to show you which Google account is
            connected, so you can tell whether it is the right one.
          </li>
        </ul>
        <p>What we store as a result:</p>
        <ul style={{ paddingLeft: '1.2rem', display: 'grid', gap: 6 }}>
          <li>
            An access token and a refresh token, so a meeting you schedule tomorrow does not
            require you to sign in to Google again, together with the token&rsquo;s expiry time
            and the identifier of the calendar to write to.
          </li>
          <li>The email address of the connected Google account.</li>
          <li>
            For each meeting, the identifier of the calendar event and its join link, so Todo can
            update or cancel the right event later.
          </li>
        </ul>
        <p>
          The email addresses of the people you invite are sent to Google as part of creating the
          event. That is what causes them to receive the invitation; it is the purpose of the
          feature.
        </p>
      </Section>

      <Section heading="Limited Use">
        <p>
          Todo&rsquo;s use and transfer of information received from Google APIs adheres to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. Specifically: we use Google user data only to
          provide the calendar features described above; we do not transfer it to others except as
          necessary to provide those features, for security purposes, or to comply with the law;
          we do not use it for advertising; we do not sell it; and no human reads it except with
          your explicit permission, to resolve a support request you have raised, for security
          purposes, or where the law requires it. Google user data is never used to train
          generalised machine-learning or AI models.
        </p>
      </Section>

      <Section heading="Disconnecting and deletion">
        <p>
          You can disconnect Google Calendar from the Meetings page at any time. Doing so deletes
          the stored access and refresh tokens straight away, and Todo can no longer touch your
          calendar. Events already created remain on your calendar and are yours to keep or
          delete. You can also revoke access from your{' '}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
            Google account permissions
          </a>
          .
        </p>
        <p>
          To have your account and its data deleted, ask an administrator of your organisation, or
          write to <a href="mailto:support@fyxo.ai">support@fyxo.ai</a> and we will act on it. Some
          records are kept where the law requires; backups are cycled out on a rolling schedule.
        </p>
      </Section>

      <Section heading="How it is protected">
        <p>
          Traffic is encrypted in transit. Access to the production database is restricted to the
          people who operate the service. Within an organisation, people see the work they raised,
          own or were added to; only an owner sees everything. Between organisations there is no
          sharing at all.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If this policy changes materially we will say so in the application before the change
          takes effect. The date at the top always reflects the current version.
        </p>
      </Section>
    </PublicPage>
  );
}
