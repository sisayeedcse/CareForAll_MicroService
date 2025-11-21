import CampaignForm from "../components/CampaignForm.jsx";
import LoginForm from "../components/LoginForm.jsx";
import PaymentForm from "../components/PaymentForm.jsx";
import RegisterForm from "../components/RegisterForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminPanel() {
  const { token, user } = useAuth();

  return (
    <div className="grid" style={{ gap: 24 }}>
      <header>
        <h2>Admin & Observability Panel</h2>
        <p className="muted">
          Authenticate, register new operators, and launch resilient campaigns
          without bypassing API gateway requirements.
        </p>
      </header>

      <section
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
        }}
      >
        <RegisterForm />
        <LoginForm />
      </section>

      <section>
        {token ? (
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
            }}
          >
            <CampaignForm onCreated={() => {}} />
            <PaymentForm />
          </div>
        ) : (
          <div className="card">
            <h3>Campaign & payment controls locked</h3>
            <p className="muted">
              Sign in first to create or edit campaigns and to capture payments.
              JWT tokens issued by the user service are stored locally and
              forwarded via Authorization headers automatically.
            </p>
          </div>
        )}
      </section>

      {token && (
        <div className="card">
          <h3>Signed in as</h3>
          <p>
            <strong>{user?.name}</strong>
          </p>
          <p className="muted">{user?.email}</p>
        </div>
      )}
    </div>
  );
}
