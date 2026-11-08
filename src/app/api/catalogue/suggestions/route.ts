import { NextResponse, type NextRequest } from 'next/server';
import type { Suggestion } from '@/lib/catalog/types';
import { getCatalog } from '@/lib/catalog/source';

/** Suggestions de la barre de recherche (séries, auteurs, œuvres). Données publiques, en cache. */
export async function GET(request: NextRequest): Promise<NextResponse<Suggestion[]>> {
  const q = (request.nextUrl.searchParams.get('q') ?? '').slice(0, 80);
  const { catalog } = await getCatalog();
  return NextResponse.json(await catalog.suggest(q), {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
  });
}
