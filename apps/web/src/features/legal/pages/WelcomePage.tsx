import { Link } from 'react-router-dom';

import { PublicPage, Section } from '../components/PublicPage';

/**
 * The public homepage. Reachable signed out, because Google's review needs to
 * see what the app is and why it asks for a calendar before it will grant the
 * scope - and because a login box explains nothing to anyone.
 */
export function WelcomePage() {
  return (
    <PublicPage
      title="Todo"
      intro="Departments, tasks and the meetings that move them - in one place, on one clock."
    >
      <Section heading="What it does">
        <p>
          Todo is a work tracker for teams. Work is filed in departments, each task has an owner,
          a due date and a status, and the meetings held about that work sit beside it rather than
          in a separate calendar nobody opens. Scheduling times are Central, wherever the person
          booking happens to be, so a nine o&rsquo;clock means the same thing to everyone.
        </p>
      </Section>

      <Section heading="Why it asks for your Google Calendar">
        <p>
          Connecting Google Calendar is optional, and everything else in Todo works without it.
          When it is connected, scheduling a meeting in Todo creates the matching event on your
          own calendar so that:
        </p>
        <ul style={{ paddingLeft: '1.2rem', display: 'grid', gap: 6 }}>
          <li>Google issues a Meet link, rather than somebody pasting one by hand.</li>
          <li>The people you invite receive a real calendar invitation they can accept.</li>
          <li>Moving or cancelling a meeting in Todo moves or cancels it for everyone.</li>
        </ul>
        <p>
          Todo reads and writes the events it created. It does not read your existing calendar,
          and only the person organising a meeting needs to connect an account &mdash; the people
          invited need nothing. You can disconnect at any time from the Meetings page, which
          removes the stored credentials immediately.
        </p>
      </Section>

      <Section heading="Who it is for">
        <p>
          Teams who already run on meetings and want the decisions taken in them attached to the
          work they concern. Todo is provided as a hosted service by CIS Technologies; each
          organisation&rsquo;s data is kept separate, and people see the work they raised, own or
          were put on.
        </p>
      </Section>

      <div className="row" style={{ gap: 'var(--space-3)' }}>
        <Link className="btn btn--primary" to="/sign-in" style={{ textDecoration: 'none' }}>
          Sign in
        </Link>
        <a className="btn" href="mailto:support@fyxo.ai" style={{ textDecoration: 'none' }}>
          Contact us
        </a>
      </div>
    </PublicPage>
  );
}
