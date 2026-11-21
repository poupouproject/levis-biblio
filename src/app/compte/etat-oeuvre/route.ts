import { NextResponse } from 'next/server';
import type { WorkStatusResponse } from '@/types';
import { readAccount } from '@/lib/account/dal';
import { getAccountSession, isSignedIn } from '@/lib/account/session';
import { todayIso } from '@/lib/account/format';
import { workIdentity, workStatus } from '@/lib/account/work-status';
import { getCatalog } from '@/lib/catalog/source';
import { getAccountLoans } from '@/lib/levis/account';

const HEADERS = { 'Cache-Control': 'private, no-store' };

const none = (): NextResponse<WorkStatusResponse> =>
  NextResponse.json({ status: null }, { headers: HEADERS });

/**
 * Ce que l'usager connecté a d'une œuvre (en main, réservée, déjà empruntée), pour sa fiche.
 * Sous `/compte`, seul chemin où le cookie de session est envoyé : la fiche reste statique et
 * demande cet état après coup. Hors connexion : aucune requête au portail.
 * Lu sur le portail à chaque demande (trois zones en parallèle, ~100 ms), rien n'est gardé.
 * Ne renvoie que l'état de l'œuvre demandée, jamais le reste du dossier.
 */
export async function GET(request: Request): Promise<NextResponse<WorkStatusResponse>> {
  const id = new URL(request.url).searchParams.get('oeuvre') ?? '';
  if (!/^[\dXx]{1,13}$/.test(id)) return none();

  const session = await getAccountSession();
  if (!isSignedIn(session)) return none();

  const work = await (await getCatalog()).catalog.getWork(id);
  if (!work) return none();

  try {
    const loans = await readAccount(getAccountLoans);
    if (!loans.ok) return none();
    return NextResponse.json(
      { status: workStatus(loans.value, workIdentity(work), todayIso()) },
      { headers: HEADERS },
    );
  } catch {
    // Portail injoignable ou réponse illisible : la fiche s'affiche simplement sans l'état
    return none();
  }
}
