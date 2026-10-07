import Layout from "../../components/Layout";

export default function AdminDashboard() {
  return (
    <Layout>
      <div className="mb-8">
        <h1 className="dashboard-title">
          Secure Escape Admin
        </h1>

        <p className="dashboard-subtitle">
          Platform-level administration and monitoring across
          Secure Escape bank integrations and registered users.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="dashboard-card dashboard-card-body">
          <h2 className="section-title">
            Platform Scope
          </h2>

          <p className="mt-3 text-slate-600">
            Secure Escape administrators monitor platform
            activity, connected bank integrations, registered
            users and system security events without accessing
            private customer investigation evidence.
          </p>

          <div className="mt-6 space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <p className="font-semibold text-slate-800">
                Bank Integrations
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Monitor banks connected to the Secure Escape
                platform and review their integration activity
                through Bank Stats.
              </p>
            </div>

            <div className="border-b border-slate-100 pb-4">
              <p className="font-semibold text-slate-800">
                User Administration
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Review Secure Escape customers and
                administrative staff through the Users section.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-800">
                Platform Security
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Review recorded security and administrative
                activity through the platform Audit Logs.
              </p>
            </div>
          </div>
        </div>

        <div className="dashboard-card dashboard-card-body">
          <h2 className="section-title">
            Admin Responsibilities
          </h2>

          <p className="mt-3 text-slate-600">
            The Secure Escape Admin area provides
            platform-level oversight while keeping individual
            fraud investigations separate from system
            administration.
          </p>

          <ul className="mt-5 space-y-4 text-slate-600">
            <li className="border-b border-slate-100 pb-4">
              Review platform security activity and important
              system events through Audit Logs.
            </li>

            <li className="border-b border-slate-100 pb-4">
              Monitor connected banks, registered users and
              duress activity through Bank Stats.
            </li>

            <li className="border-b border-slate-100 pb-4">
              Review Secure Escape customers and administrative
              staff through Users.
            </li>

            <li>
              Maintain platform oversight without opening
              private customer investigation evidence.
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}