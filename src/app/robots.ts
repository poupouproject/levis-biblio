import type { MetadataRoute } from 'next';

/**
 * Aucun robot pour l'instant : le site affiche des disponibilités simulées, n'a pas encore
 * l'accord de la Ville, et chaque couverture convertie compte dans le quota d'images de Vercel.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
