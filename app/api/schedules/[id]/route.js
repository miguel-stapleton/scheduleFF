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

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { name, data } = body || {};
    if (!name || !data) {
      return NextResponse.json({ error: 'Missing name or data' }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection('schedules');

    // Ensure schedule exists
    const existingDoc = await col.findOne({ _id: new ObjectId(id) });
    if (!existingDoc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Prevent renaming to a duplicate name on a different doc
    const nameTaken = await col.findOne({ name, _id: { $ne: new ObjectId(id) } });
    if (nameTaken) {
      return NextResponse.json({ error: 'A schedule with this name already exists' }, { status: 409 });
    }

    const savedAt = new Date().toISOString();
    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name, data, savedAt } }
    );

    return NextResponse.json({ id, name, savedAt, data }, { status: 200 });
  } catch (e) {
    console.error('PUT /api/schedules/[id] error', e);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}
