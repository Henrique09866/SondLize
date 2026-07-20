import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Configura o comportamento das notificações quando o app está em foreground.
 * Removido para evitar notificações fantasmas em foreground.
 */
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: false, // RNTP já exibe a notificação de mídia nativa
//     shouldPlaySound: false,
//     shouldSetBadge: false,
//     shouldShowBanner: false,
//     shouldShowList: false,
//   }),
// });

/**
 * Solicita permissão de notificação (obrigatório Android 13+ / API 33+)
 * e cria o canal "playback" no Android.
 *
 * Deve ser chamada UMA vez na inicialização do app (App.tsx).
 */
export async function setupNotifications(): Promise<boolean> {
  // Canal "playback" removido para não gerar notificação fantasma

  // Solicitar permissão (Android 13+ exige isso — sem isso, nenhuma notificação aparece)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}
