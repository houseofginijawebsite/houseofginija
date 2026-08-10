import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import pool from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query order from database
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderResult.rows[0];

    // Gating check: ensure user owns this order OR user is an admin
    if (String(order.user_id) !== String(decoded.id) && decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (typeof order.items === 'string') {
      try { order.items = JSON.parse(order.items); } catch {}
    }
    if (typeof order.shipping_address === 'string') {
      try { order.shipping_address = JSON.parse(order.shipping_address); } catch {}
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Fetch order by ID error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
