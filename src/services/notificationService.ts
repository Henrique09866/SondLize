import * as Notifications from 'expo-notifications';

/**
 * Solicita permissão de notificação (obrigatório Android 13+ / API 33+).
 *
 * A notificação de mídia em si (com botões de ícones e capa) é gerenciada
 * nativamente pelo @rntp/player (MediaSession), não pelo expo-notifications.
 *
 * Deve ser chamada UMA vez na inicialização do app (App.tsx).
 */
export async function setupNotifications(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}
