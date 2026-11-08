import { ImageResponse } from 'next/og';

export const alt = 'Votre année à la bibliothèque, sur LévisBiblio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Aperçu du lien partagé : le même pour tous, sans les chiffres de personne. */
export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        color: 'white',
        backgroundImage: 'linear-gradient(135deg, #3d2c5e 0%, #5b2333 55%, #14505c 100%)',
      }}
    >
      <div style={{ display: 'flex', fontSize: 30, letterSpacing: 6, opacity: 0.85 }}>
        LÉVISBIBLIO
      </div>
      <div
        style={{ display: 'flex', marginTop: 28, fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}
      >
        Votre année à la bibliothèque
      </div>
      <div style={{ display: 'flex', marginTop: 32, fontSize: 38, color: '#f0c987' }}>
        Découvrez votre récapitulatif. Et partagez-le!
      </div>
    </div>,
    size,
  );
}
