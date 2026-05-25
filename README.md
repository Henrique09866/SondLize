$content = @"
# 🎵 SondLize - Seu Reprodutor de Música Pessoal

**SondLize** é um aplicativo mobile multiplataforma para reprodução de áudio desenvolvido com React Native e Expo. Gerenciador de música completo com suporte a bibliotecas, playlists, pastas e recursos avançados de reprodução.

## ✨ Principais Características

### 🎶 Reprodução de Áudio
- **Reprodutor completo** com controles fluidos (play, pause, skip)
- **Busca por posição** em tempo real na música
- **Fila de reprodução** com gerenciamento intuitivo
- **Suporte a múltiplos formatos** de áudio

### 📚 Gerenciamento de Biblioteca
- **Biblioteca pessoal** com importação de músicas locais
- **Organização por pastas** personalizadas
- **Playlists customizadas** para diferentes momentos
- **Busca e filtros** por título, artista e data
- **Ordenação inteligente** (recentes, título, artista)

### 🎚️ Recursos Avançados
- **Equalizador** para customizar o som
- **Sleep Timer** para dormir com música
- **Visualização de letras** durante a reprodução
- **Mini player** compacto para navegação
- **Notificações de reprodução** (Android 13+)

### 🎨 Interface Moderna
- **Design elegante** e responsivo
- **Suporte a tema claro/escuro** automático
- **Animações fluidas** com Reanimated 2
- **Safe Area** para todos os dispositivos
- **Bottom Tab Navigation** intuitiva

## 🛠️ Stack Tecnológico

- **React Native** 0.81.5 com React 19
- **Expo** 54 (desenvolvimento e build)
- **TypeScript** para type safety
- **React Navigation** 7 (tabs, stack, native stack)
- **React Native Track Player** 4 para reprodução de áudio
- **Zustand** para state management
- **Reanimated 2** para animações
- **React Native Gesture Handler** para gestos
- **JSMediaTags** para leitura de metadados

## 📱 Suporte de Plataformas

- ✅ **Android** (API 24+)
- ✅ **iOS** (suporte universal)
- ✅ **Web** (preview em desenvolvimento)

## 🚀 Como Começar

### Requisitos
- Node.js 18+
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)

### Instalação

`````bash
# Clone o repositório
git clone https://github.com/Henrique09866/SondLize.git
cd SondLize

# Instale as dependências
npm install

# Inicie o aplicativo
npm start

# Escolha a plataforma:
# - Pressione 'a' para Android Emulator
# - Pressione 'i' para iOS Simulator
# - Pressione 'w' para Web
`````

### Scripts Disponíveis

`````bash
npm start          # Inicia o Expo com opções interativas
npm run android    # Executa no emulador Android
npm run ios        # Executa no simulador iOS
npm run web        # Executa na versão web
npm run lint       # Valida o código com ESLint
npm run reset-project  # Reseta o projeto para estado inicial
`````

## 📁 Estrutura do Projeto

`````
src/
├── screens/           # Telas principais
│   ├── PlayerScreen   # Reprodutor completo
│   ├── LibraryScreen  # Biblioteca de músicas
│   ├── FoldersScreen  # Gerenciador de pastas
│   ├── PlaylistsScreen # Gerenciador de playlists
│   └── ...
├── components/        # Componentes reutilizáveis
│   ├── MiniPlayer     # Player compacto
│   ├── EqualizerSheet # Controle de equalizador
│   ├── SleepTimerSheet # Timer para sono
│   └── ...
├── store/            # State management (Zustand)
│   ├── usePlayerStore      # Estado do reprodutor
│   ├── useLibraryStore     # Biblioteca de músicas
│   ├── useFoldersStore     # Pastas
│   └── usePlaylistsStore   # Playlists
├── services/         # Serviços (notificações, etc)
├── hooks/           # Custom React Hooks
├── constants/       # Tema, cores, tipografia
└── utils/           # Funções auxiliares
`````

## 🔐 Permissões Necessárias

### Android
- `WAKE_LOCK` - Manter o app em execução
- `FOREGROUND_SERVICE` - Reprodução em background
- `FOREGROUND_SERVICE_MEDIA_PLAYBACK` - Serviço de mídia
- `POST_NOTIFICATIONS` - Notificações

### iOS
- Acesso à biblioteca de mídia
- Acesso ao armazenamento local

## 🌟 Recursos em Destaque

- **Reprodução robusta** com controle total de fila
- **Armazenamento persistente** com AsyncStorage
- **Integração nativa** com player do sistema
- **Performance otimizada** com React Compiler
- **Desenvolvimento com TypeScript** para melhor qualidade

## 👨‍💻 Autor

**Henrique** - [GitHub](https://github.com/Henrique09866)

---

Feito com ❤️ para amantes de música que querem controle total sobre sua biblioteca pessoal.
"@
