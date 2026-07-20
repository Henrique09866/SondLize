
<p align="center">
  <img src="https://github.com/user-attachments/assets/52d95f76-edcb-4eb1-bee9-0a99f0b04de7" alt="SondLinze Logo" width="250">
</p>

<h1 align="center">🎵 SondLinze</h1>

<p align="center">
  Um player de música moderno para Android desenvolvido com React Native.
</p>

Seu player de música offline, privado e fluido.

📖 Sobre o Projeto
O SondLize é um aplicativo mobile de reprodução de música offline desenvolvido em React Native. O foco principal do projeto é fornecer uma experiência de audição limpa, sem anúncios e sem dependência de internet, gerenciando arquivos de áudio locais diretamente no dispositivo do usuário.

Este projeto foi construído do zero enfrentando desafios complexos de arquitetura nativa, migração de motores de áudio e gerenciamento de estado em larga escala.

🛠️ Tech Stack
Framework: React Native (Expo SDK 54)
Linguagem: TypeScript
Gerenciamento de Estado: Zustand
Navegação: React Navigation v7
Motor de Áudio: expo-av (Arquitetura Bridgeless)
Armazenamento Local: expo-file-system & @react-native-async-storage/async-storage
Backend/Cloud: Firebase (Integração para sincronização de dados)
Metadados: jsmediatags (Parse de ID3 tags de arquivos MP3/WAV)
⚙️ Como Rodar o Projeto
⚠️ Nota: Este projeto utiliza módulos nativos (como expo-av e expo-file-system). O uso do aplicativo padrão "Expo Go" não é compatível. É necessário gerar o build de desenvolvimento.

Pré-requisitos:

Node.js >= 18
Android Studio & SDK configurado (Variáveis de ambiente ANDROID_HOME ativas)
Um dispositivo físico Android (Recomendado) ou Emulador.
Passos:

# 1. Clone o repositóriogit clone https://github.com/seu-usuario/sondlize.gitcd sondlize# 2. Instale as dependênciasnpm install# 3. Gere os arquivos nativosnpx expo prebuild# 4. Rode no dispositivo conectadonpx expo run:android
🚧 Status do Desenvolvimento (WIP)
O projeto está em desenvolvimento ativo. As funcionalidades principais já foram implementadas, mas ajustes finos de UI/UX estão em andamento.

 Reprodução de áudio offline
 Parse de metadados (Capa, Artista, Título)
 Gerenciamento de fila de reprodução
 Suporte a Nova Arquitetura (Bridgeless)
 Copiagem segura de arquivos temporários para armazenamento permanente
 Refatoração dos controles da UI do Player
 Implementação de notificações de mídia interativas em background
 Sistema de equalização
 
📝 Licença
Este projeto é de uso pessoal e educacional.
