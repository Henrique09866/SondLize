import {
  documentDirectory,
  makeDirectoryAsync,
  copyAsync,
  deleteAsync,
} from 'expo-file-system/legacy';

const ARTWORK_DIR = 'SondLizeFolderArt/';

export const saveFolderArtwork = async (sourceUri: string): Promise<string> => {
  const dir = `${documentDirectory}${ARTWORK_DIR}`;
  await makeDirectoryAsync(dir, { intermediates: true });

  const ext = sourceUri.split('.').pop()?.split('?')[0]?.toLowerCase();
  const safeExt = ext === 'png' ? 'png' : 'jpg';
  const dest = `${dir}folder_${Date.now()}.${safeExt}`;

  await copyAsync({ from: sourceUri, to: dest });
  return dest;
};

export const deleteFolderArtwork = async (uri?: string): Promise<void> => {
  if (!uri || !documentDirectory || !uri.startsWith(documentDirectory)) return;
  try {
    await deleteAsync(uri, { idempotent: true });
  } catch (e) {
    console.warn('Failed to delete folder artwork file:', e);
  }
};
