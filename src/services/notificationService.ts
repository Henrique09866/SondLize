import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Configura o comportamento das notificações quando o app está em foreground.
 * O RNTP gerencia a notificação de mídia (media style) automaticamente.
 * Este serviço cuida apenas da permissão e do canal Android.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // RNTP já exibe a notificação de mídia nativa
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

/**
 * Solicita permissão de notificação (obrigatório Android 13+ / API 33+)
 * e cria o canal "playback" no Android.
 *
 * Deve ser chamada UMA vez na inicialização do app (App.tsx).
 */
export async function setupNotifications(): Promise<boolean> {
  // Criar canal de notificação para Android (necessário para o player funcionar
  // em background e para o build APK não rejeitar as notificações)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('playback', {
      name: 'Reprodução de Música',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: null,
      showBadge: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  // Solicitar permissão (Android 13+ exige isso — sem isso, nenhuma notificação aparece)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}
