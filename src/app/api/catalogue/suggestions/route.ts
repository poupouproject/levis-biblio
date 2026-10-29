import { NextResponse, type NextRequest } from 'next/server';
import type { Suggestion } from '@/lib/catalog/types';
import { suggest } from '@/lib/catalog/cached';

/** Suggestions de la barre de recherche (séries, auteurs, œuvres). Données publiques, en cache. */
export async function GET(request: NextRequest): Promise<NextResponse<Suggestion[]>> {
  const q = (request.nextUrl.searchParams.get('q') ?? '').slice(0, 80);
  return NextResponse.json(await suggest(q), {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
  });
}
