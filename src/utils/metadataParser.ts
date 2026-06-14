// @ts-ignore
import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';
import * as FileSystem from 'expo-file-system/legacy';

export interface AudioMetadata {
  title?: string;
  artist?: string;
  artwork?: string; // local file URI
}

export const extractMetadata = async (uri: string): Promise<AudioMetadata> => {
  return new Promise(async (resolve) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      jsmediatags.read(blob as any, {
        onSuccess: async (tag: any) => {
          let artwork: string | undefined = undefined;

          if (tag.tags.picture) {
            const { data, format } = tag.tags.picture;
            const extension = format?.includes('png') ? 'png' : 'jpg';
            // Convert byte array to base64
            let base64String = '';
            for (let i = 0; i < data.length; i++) {
              base64String += String.fromCharCode(data[i]);
            }
            
            // Save to FileSystem to prevent AsyncStorage quota limit crash (CursorWindow 2MB limit)
            const safeFileName = `artwork_${Date.now()}.${extension}`;
            const fileUri = `${FileSystem.documentDirectory}${safeFileName}`;
            await FileSystem.writeAsStringAsync(fileUri, base64String, {
              encoding: FileSystem.EncodingType.Base64,
            });
            artwork = fileUri;
          }

          resolve({
            title: tag.tags.title?.trim(),
            artist: tag.tags.artist?.trim(),
            artwork,
          });
        },
        onError: () => {
          resolve({});
        },
      });
    } catch {
      resolve({});
    }
  });
};
