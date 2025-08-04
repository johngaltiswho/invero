'use client';

import { useUser, SignOutButton } from '@clerk/nextjs';

export default function TestPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Test Page</h1>
      
      {user ? (
        <div>
          <p>✅ Logged in as: {user.emailAddresses[0]?.emailAddress}</p>
          <p>User ID: {user.id}</p>
          <SignOutButton>
            <button style={{ background: 'red', color: 'white', padding: '10px' }}>
              Sign Out
            </button>
          </SignOutButton>
        </div>
      ) : (
        <div>
          <p>❌ Not logged in</p>
          <a href="/sign-in" style={{ background: 'blue', color: 'white', padding: '10px', textDecoration: 'none' }}>
            Go to Sign In
          </a>
        </div>
      )}
    </div>
  );
}