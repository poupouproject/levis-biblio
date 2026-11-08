import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { QrCode } from '@/components/recap/QrCode';
import { MONTHS, comparisonText, periodText, readerProfile, type YearRecap } from './recap';

/** Format story (9:16) : Instagram, Facebook, WhatsApp. */
const WIDTH = 1080;
const HEIGHT = 1920;

const INK = '#1a1a1a';
const GOLD = '#f0c987';

/**
 * Inter (licence OFL, assets/polices/OFL.txt), réduite aux caractères latins : ~50 Ko par graisse.
 * Lue une fois au chargement du module ; incluse au déploiement par next.config.ts.
 */
const FONTS = ([700, 900] as const).map((weight) => ({
  name: 'Inter',
  data: readFileSync(join(process.cwd(), `assets/polices/inter-${String(weight)}.ttf`)),
  weight,
  style: 'normal' as const,
}));

interface ShareImageOptions {
  /** L'usager a choisi de montrer sa plume et sa série de l'année. */
  titles: boolean;
  demo: boolean;
  /** Adresse affichée et encodée dans le code QR (commune à tous). */
  link: string;
}

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/** Faits marquants, une ligne chacun ; titres seulement si l'usager l'a choisi. */
function facts(recap: YearRecap, titles: boolean): string[] {
  const list: string[] = [];
  if (titles && recap.topSeries) list.push(`${recap.topSeries.name}, ma série de l’année`);
  if (titles && recap.topAuthor) list.push(`${recap.topAuthor.name}, ma plume de l’année`);
  if (recap.topMonth) {
    const month = capitalize(MONTHS[recap.topMonth.month] ?? '');
    list.push(`${month}, mon mois record : ${String(recap.topMonth.count)}`);
  }
  if (recap.streak >= 2) list.push(`${String(recap.streak)} mois de suite à la bibliothèque`);
  if (recap.previousTotal !== null) list.push(comparisonText(recap).replace(/[!.]$/, ''));
  return list.slice(0, 4);
}

/**
 * Image du bilan, façon affiche : le total en très grand, le profil de lecture, quelques faits.
 * Produite à la demande et jamais stockée. Aucune couverture du portail (voir l'issue #20) ni
 * aucun titre, sauf la plume et la série si l'usager le choisit.
 */
export function shareImage(recap: YearRecap, { titles, demo, link }: ShareImageOptions): Response {
  const profile = readerProfile(recap, titles);
  // Trois chiffres tiennent aussi dans la largeur
  const totalSize = recap.total >= 100 ? 400 : 520;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '100px 80px 90px',
        color: INK,
        backgroundColor: GOLD,
        fontFamily: 'Inter',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexShrink: 0,
          justifyContent: 'space-between',
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: 4,
        }}
      >
        <div style={{ display: 'flex' }}>LÉVISBIBLIO</div>
        <div style={{ display: 'flex' }}>{recap.year}</div>
      </div>
      <div
        style={{
          display: 'flex',
          flexShrink: 0,
          marginTop: 40,
          marginLeft: -12,
          fontSize: totalSize,
          fontWeight: 900,
          lineHeight: 0.8,
          letterSpacing: -totalSize / 26,
        }}
      >
        {recap.total}
      </div>
      <div
        style={{
          display: 'flex',
          flexShrink: 0,
          marginTop: 20,
          fontSize: 76,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: -2,
        }}
      >
        {recap.total > 1 ? 'documents empruntés' : 'document emprunté'}
      </div>
      <div style={{ display: 'flex', flexShrink: 0, marginTop: 18, fontSize: 34, fontWeight: 700 }}>
        {capitalize(periodText(recap.year))}
      </div>
      {/* Deux espaces souples : l'espace libre se répartit au lieu de s'entasser en bas */}
      <div style={{ display: 'flex', flexGrow: 1, minHeight: 64 }} />
      <div style={{ display: 'flex', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            padding: '20px 40px',
            borderRadius: 999,
            backgroundColor: INK,
            color: GOLD,
            fontSize: 60,
            fontWeight: 900,
            transform: 'rotate(-3deg)',
          }}
        >
          {profile.label.toUpperCase()}
        </div>
      </div>
      <div style={{ display: 'flex', flexShrink: 0, marginTop: 26, fontSize: 40, fontWeight: 700 }}>
        {profile.reason}
      </div>
      <div
        style={{
          display: 'flex',
          flexShrink: 0,
          flexDirection: 'column',
          marginTop: 56,
          gap: 20,
          fontSize: 46,
          fontWeight: 700,
        }}
      >
        {facts(recap, titles).map((fact) => (
          <div key={fact} style={{ display: 'flex' }}>
            ★ {fact}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexGrow: 1 }} />
      <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 36 }}>
        <div
          style={{
            display: 'flex',
            padding: 12,
            borderRadius: 24,
            backgroundColor: 'white',
            border: `4px solid ${INK}`,
          }}
        >
          <QrCode value={link} size={180} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', fontSize: 52, fontWeight: 900 }}>Et vous?</div>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700 }}>
            {link.replace(/^https?:\/\//, '')}
          </div>
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, opacity: 0.7 }}>
            {demo ? 'Démonstration : dossier fictif' : 'Projet citoyen, indépendant de la Ville'}
          </div>
        </div>
      </div>
    </div>,
    { width: WIDTH, height: HEIGHT, fonts: FONTS },
  );
}
