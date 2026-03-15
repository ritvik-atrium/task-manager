import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = process.env.DATA_DIR ?? '/data';
const DATA_FILE = join(DATA_DIR, 'tasks.json');

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export async function GET() {
  ensureDir();
  if (!existsSync(DATA_FILE)) return NextResponse.json(null);
  try {
    const raw = readFileSync(DATA_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(req: Request) {
  ensureDir();
  try {
    const body = await req.json();
    writeFileSync(DATA_FILE, JSON.stringify(body));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
