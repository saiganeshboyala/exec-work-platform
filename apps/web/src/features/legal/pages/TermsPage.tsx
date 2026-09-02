import { PublicPage, Section } from '../components/PublicPage';

const UPDATED = '2 September 2026';

/**
 * Terms of service. Google asks for these alongside the privacy policy, and a
 * reviewer has to be able to read them without signing in.
 */
export function TermsPage() {
  return (
    <PublicPage title="Terms of service" intro={`Last updated ${UPDATED}.`}>
      <Section heading="The agreement">
        <p>
          Todo is provided by CIS Technologies. By using it you agree to these terms. Where your
          employer or client has a separate written agreement with us covering the service, that
          agreement governs and these terms fill any gaps in it.
        </p>
      </Section>

      <Section heading="Your account">
        <p>
          Accounts are issued through the organisation you belong to. You are responsible for what
          happens under your sign-in, and for keeping your password to yourself. Tell us promptly
          if you believe someone else has used your account. Administrators of your organisation
          can add, suspend and remove accounts, and can see the work recorded in their
          organisation according to the roles they set.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>You agree not to use Todo to:</p>
        <ul style={{ paddingLeft: '1.2rem', display: 'grid', gap: 6 }}>
          <li>break the law, or infringe someone else&rsquo;s rights;</li>
          <li>reach data belonging to another organisation, or another person&rsquo;s account;</li>
          <li>
            probe, scan or overload the service, or work around its limits and access controls;
          </li>
          <li>send unsolicited invitations or messages through the calendar features.</li>
        </ul>
      </Section>

      <Section heading="Your content">
        <p>
          The work you record stays yours, and your organisation&rsquo;s. We claim no ownership of
          it. We process it to run the service, as described in the{' '}
          <a href="/privacy">privacy policy</a>, and for no other purpose.
        </p>
      </Section>

      <Section heading="Google Calendar">
        <p>
          Connecting Google Calendar is optional and can be undone at any time. When connected,
          Todo creates and manages the calendar events behind the meetings you schedule in it.
          Your use of Google Calendar itself remains governed by your agreement with Google, and
          we are not responsible for its availability.
        </p>
      </Section>

      <Section heading="Availability and support">
        <p>
          We aim to keep Todo available and to fix faults promptly, but we do not promise
          uninterrupted service. Maintenance, upstream outages and problems at providers we depend
          on can interrupt it. Support is by email at{' '}
          <a href="mailto:support@fyxo.ai">support@fyxo.ai</a>.
        </p>
      </Section>

      <Section heading="Ending it">
        <p>
          Your organisation may stop using Todo at any time and ask for its data to be exported or
          deleted. We may suspend an account that breaches these terms, and will say why where we
          are able to.
        </p>
      </Section>

      <Section heading="Liability">
        <p>
          Todo is provided as it is. To the extent the law allows, we are not liable for indirect
          or consequential loss, or for lost profits or data. Nothing here limits liability that
          cannot lawfully be limited.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          We may update these terms. Material changes will be notified in the application before
          they take effect, and the date above will change with them.
        </p>
      </Section>
    </PublicPage>
  );
}
