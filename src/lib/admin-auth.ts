import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

// Check if current user is admin
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await currentUser();
    
    if (!user) {
      return false;
    }

    // Check if user has admin role in metadata
    const role = user.publicMetadata?.role || user.privateMetadata?.role;
    return role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// Middleware to require admin access
export async function requireAdmin() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Authentication required');
  }

  const adminCheck = await isAdmin();
  if (!adminCheck) {
    throw new Error('Admin access required');
  }

  return true;
}

// Get current admin user info
export async function getAdminUser() {
  const user = await currentUser();
  
  if (!user) {
    return null;
  }

  const role = user.publicMetadata?.role || user.privateMetadata?.role;
  if (role !== 'admin') {
    return null;
  }

  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username,
    role
  };
}