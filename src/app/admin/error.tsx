'use client';
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main>
      <h1>Studio admin is unavailable</h1>
      <p>Please try again shortly.</p>
      <button onClick={reset}>Retry</button>
    </main>
  );
}
