'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
export function LogoutButton() {
  const client = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function logout() {
    setPending(true);
    setError(false);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error();
      client.clear();
      window.location.replace('/admin/login');
    } catch {
      setError(true);
      setPending(false);
    }
  }
  return (
    <>
      <button onClick={logout} disabled={pending}>
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
      {error && <span role="alert">Unable to sign out. Please try again.</span>}
    </>
  );
}
