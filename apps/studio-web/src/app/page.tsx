export default function HomePage() {
  return (
    <section>
      <div className="page-header">
        <h1>AIVS Studio</h1>
        <p>Riwaq Al Ilm — AI video production for children&apos;s Islamic education</p>
      </div>
      <div className="stack">
        <div className="card">
          <h2>Creative pipeline</h2>
          <p className="muted">
            Script → review → narration &amp; video generation → assembly → two-step publishing
            approval.
          </p>
          <ul>
            <li>
              <a href="/scripts">Scripts</a> — brief in, AI-generated scenes out, human approval
            </li>
            <li>
              <a href="/assets">Assets</a> — uploads and generated media (quarantine → ready)
            </li>
            <li>
              <a href="/publications">Publishing</a> — reviewed, approved, published
            </li>
          </ul>
        </div>
        <div className="card">
          <h2>Governance</h2>
          <ul>
            <li>
              <a href="/consents">Consents</a> — guardian consent registry for child media
            </li>
            <li>
              <a href="/members">Members</a> — workspace roles and invitations
            </li>
            <li>
              <a href="/status">Environment status</a> · <a href="/api/health">Health endpoint</a> ·{" "}
              <a href="/api/services">Services status</a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
