import pkg from '../../package.json';

/**
 * Version de l’application, celle de package.json (écrite par `changeset version`).
 * Import par défaut : l’import nommé d’un JSON avertit sous webpack. À n’importer que côté
 * serveur, sinon tout package.json partirait dans le bundle du navigateur.
 */
export const APP_VERSION: string = pkg.version;
