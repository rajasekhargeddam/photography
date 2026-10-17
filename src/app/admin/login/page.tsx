import Link from 'next/link';
import { LoginForm } from '@/features/admin/login-form';
export default function AdminLogin() {
  return (
    <main className="admin-login">
      <Link href="/">← Back to website</Link>
      <section className="panel">
        <p className="eyebrow">My Dream Photography</p>
        <h1>Admin login</h1>
        <p className="muted">
          Sign in with your studio account to view requests.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
