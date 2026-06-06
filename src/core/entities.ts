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
}
