import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { signJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    let user = null;
    let passwordMatch = false;

    // 1. Try PostgreSQL database lookup if configured
    if (process.env.DATABASE_URL) {
      try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [emailLower]);
        if (result.rows.length > 0) {
          const dbUser = result.rows[0];
          const isMatch = await bcrypt.compare(password, dbUser.password_hash);
          if (isMatch) {
            user = dbUser;
            passwordMatch = true;
          }
        }
      } catch (dbErr) {
        console.warn('PostgreSQL login query warning:', dbErr.message);
      }
    }

    // 2. Admin fallback from environment variables if DB is unconfigured/offline
    const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().trim() : null;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!user && adminEmail && adminPassword && emailLower === adminEmail) {
      if (password === adminPassword) {
        user = {
          id: 1,
          name: 'House Of Ginija Admin',
          email: adminEmail,
          role: 'admin',
        };
        passwordMatch = true;
      }
    }

    if (!user || !passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Generate JWT token
    const token = await signJWT({ id: user.id, name: user.name, email: user.email, role: user.role });

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    // Strip password_hash from returned payload
    const { password_hash, ...userPayload } = user;

    return NextResponse.json({ user: userPayload });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
