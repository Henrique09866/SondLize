export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in milliseconds
  file: string;     // uri or path
  folderId?: string;
  artwork?: string;
  lyrics?: string;
  createdAt: number;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  artwork?: string;
}

/**
 * Parâmetros de corte da foto de perfil (estilo Instagram).
 * `scale` ≥ 1 (1 = preenche o círculo, > 1 = zoom).
 * `tx`/`ty` são deslocamentos normalizados ao tamanho base ([-1, 1]).
 */
export interface AvatarCrop {
  scale: number;
  tx: number;
  ty: number;
}
