import 'server-only';
import { ImageResponse } from 'next/og';
import { QrCode } from '@/components/recap/QrCode';
import { MONTHS, comparisonText, type YearRecap } from './recap';

/** Format story (9:16) : Instagram, Facebook, WhatsApp. */
const WIDTH = 1080;
const HEIGHT = 1920;

interface ShareImageOptions {
  /** L'usager a choisi de montrer sa plume et sa série de l'année. */
  titles: boolean;
  demo: boolean;
  /** Adresse affichée et encodée dans le code QR (commune à tous). */
  link: string;
}

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Image du bilan, produite à la demande et jamais stockée. Seulement des chiffres par défaut ;
 * aucune couverture du portail (voir l'issue #20) ni aucun titre de document.
 */
export function shareImage(recap: YearRecap, { titles, demo, link }: ShareImageOptions): Response {
  const facts: [string, string][] = [];
  if (titles && recap.topAuthor) facts.push(['Plume de l’année', recap.topAuthor.name]);
  if (titles && recap.topSeries) facts.push(['Série de l’année', recap.topSeries.name]);
  if (recap.topMonth) {
    facts.push(['Mois le plus occupé', capitalize(MONTHS[recap.topMonth.month] ?? '')]);
  }
  if (recap.streak >= 2) facts.push(['Mois de suite avec un emprunt', String(recap.streak)]);
  if (recap.pace) facts.push(['Jours par emprunt, en moyenne', String(recap.pace.averageDays)]);
  // Quatre encadrés au plus : l'image garde le format story sans rien comprimer
  const shown = facts.slice(0, 4);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '110px 96px 90px',
        color: 'white',
        backgroundImage: 'linear-gradient(160deg, #3d2c5e 0%, #5b2333 45%, #14505c 100%)',
      }}
    >
      <div
        style={{ display: 'flex', flexShrink: 0, fontSize: 36, letterSpacing: 6, opacity: 0.85 }}
      >
        LÉVISBIBLIO · {recap.year}
      </div>
      <div style={{ display: 'flex', flexShrink: 0, marginTop: 36, fontSize: 84, lineHeight: 1.1 }}>
        Mon année à la bibliothèque
      </div>
      <div style={{ display: 'flex', flexShrink: 0, alignItems: 'flex-end', marginTop: 70 }}>
        <div style={{ display: 'flex', fontSize: 260, lineHeight: 1 }}>{recap.total}</div>
        <div style={{ display: 'flex', fontSize: 68, marginLeft: 28, marginBottom: 34 }}>
          {recap.total > 1 ? 'documents' : 'document'}
        </div>
      </div>
      <div
        style={{ display: 'flex', flexShrink: 0, marginTop: 20, fontSize: 46, color: '#f0c987' }}
      >
        {comparisonText(recap)}
      </div>
      <div
        style={{ display: 'flex', flexShrink: 0, flexDirection: 'column', marginTop: 64, gap: 22 }}
      >
        {shown.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '22px 34px',
              borderRadius: 32,
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
            }}
          >
            <div style={{ display: 'flex', fontSize: 30, opacity: 0.8 }}>{label}</div>
            <div style={{ display: 'flex', fontSize: 52, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexGrow: 1 }} />
      <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 40 }}>
        <div style={{ display: 'flex', padding: 16, borderRadius: 24, backgroundColor: 'white' }}>
          <QrCode value={link} size={200} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700 }}>Et la vôtre?</div>
          <div style={{ display: 'flex', fontSize: 34, opacity: 0.85 }}>
            {link.replace(/^https?:\/\//, '')}
          </div>
          <div style={{ display: 'flex', fontSize: 26, opacity: 0.7 }}>
            {demo
              ? 'Démonstration : dossier fictif.'
              : 'Projet citoyen, indépendant de la Ville de Lévis.'}
          </div>
        </div>
      </div>
    </div>,
    { width: WIDTH, height: HEIGHT },
  );
}
