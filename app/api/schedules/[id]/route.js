import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '../../../lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  try {
    const { id } = params;
    const db = await getDb();
    const col = db.collection('schedules');
    const doc = await col.findOne({ _id: new ObjectId(id) });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(
      {
        id: doc._id.toString(),
        name: doc.name,
        savedAt: doc.savedAt,
        data: doc.data,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('GET /api/schedules/[id] error', e);
    return NextResponse.json({ error: 'Failed to load schedule' }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id } = params;
    const db = await getDb();
    const col = db.collection('schedules');
    const res = await col.deleteOne({ _id: new ObjectId(id) });
    if (res.deletedCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('DELETE /api/schedules/[id] error', e);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
