import { NextResponse } from 'next/server';
import { getDb } from '../../lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const col = db.collection('schedules');
    // Return a lightweight list but include brideName for UI
    const docs = await col
      .find({}, { projection: { name: 1, savedAt: 1, 'data.brideName': 1 } })
      .sort({ savedAt: -1 })
      .toArray();

    const items = docs.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      savedAt: d.savedAt,
      data: { brideName: d?.data?.brideName ?? '' },
    }));

    return NextResponse.json(items, { status: 200 });
  } catch (e) {
    console.error('GET /api/schedules error', e);
    return NextResponse.json({ error: 'Failed to list schedules' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, data } = body || {};
    if (!name || !data) {
      return NextResponse.json({ error: 'Missing name or data' }, { status: 400 });
    }

    const doc = {
      name,
      data,
      savedAt: new Date().toISOString(),
    };

    const db = await getDb();
    const col = db.collection('schedules');
    const { insertedId } = await col.insertOne(doc);

    return NextResponse.json({ id: insertedId.toString(), ...doc }, { status: 201 });
  } catch (e) {
    console.error('POST /api/schedules error', e);
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  }
}
