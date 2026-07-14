export default function HomePage() {
  return (
    <section>
      <h1>AIVS Studio — Environment Foundation</h1>
      <p>
        Phase <code>AIVS-ENV-001</code>: local development environment. No production features are
        implemented yet.
      </p>
      <ul>
        <li>
          <a href="/status">Environment status page</a>
        </li>
        <li>
          <a href="/api/health">Health endpoint</a>
        </li>
        <li>
          <a href="/api/services">Local services status endpoint</a>
        </li>
      </ul>
    </section>
  );
}
