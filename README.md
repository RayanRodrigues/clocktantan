# Clock Tan-Tan

Ferramenta web para gerenciamento de fichas RPG com sistema de decks por atributo, progresso de pericias e painel administrativo.

## Funcionalidades

- Login com Google (Firebase Auth)
- Salvamento automatico da ficha no Firestore
- 6 decks de atributos (FOR, DES, CON, INT, SAB, CAR)
- Puxar 1x, 2x ou 3x cartas
- Animacao de carta no centro da tela com flip por clique
- Cartas com imagens customizadas em `public/cards`
- Modo claro/escuro
- Painel Admin para:
  - selecionar ficha ativa
  - criar ficha (NPC ou Player)
  - trocar tipo da ficha existente (NPC/Player)
  - excluir ficha ativa
  - filtrar lista por Todos / Players / NPCs

## Stack

- React + TypeScript + Vite
- Firebase Auth + Firestore
- CSS custom

## Requisitos

- Node.js 18+
- npm
- Projeto Firebase com Firestore e Authentication (Google)

## Instalacao

```bash
npm install
```

## Variaveis de ambiente

Crie um arquivo `.env` na raiz:

```env
VITE_FIREBASE_API_KEY=SEU_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=SEU_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=SEU_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=SEU_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=SEU_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=SEU_APP_ID
```

## Executar localmente

Frontend:

```bash
npm run dev
```

Frontend + API local (se estiver usando `server/index.js`):

```bash
npm run dev:all
```

Build:

```bash
npm run build
npm run preview
```

## Estrutura rapida

```text
src/
  components/
  hooks/
  utils/
  App.tsx
  firebase.ts
public/
  cards/
```

## Firestore (regras base)

Abaixo um exemplo alinhado com o fluxo atual (usuario comum edita sua propria ficha; admin lista/cria/edita/exclui):

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isAdmin() { return signedIn() && request.auth.token.admin == true; }

    match /characters/{characterId} {
      allow get: if isAdmin()
        || (signedIn() && characterId == request.auth.uid)
        || (signedIn() && resource != null && resource.data.ownerUid == request.auth.uid);

      allow list: if isAdmin();

      allow create: if (
          signedIn()
          && characterId == request.auth.uid
          && request.resource.data.ownerUid == request.auth.uid
        ) || (
          isAdmin()
          && request.resource.data.ownerUid is string
        );

      allow update, delete: if isAdmin()
        || (signedIn() && resource.data.ownerUid == request.auth.uid);
    }
  }
}
```

## Claim de Admin

Para liberar painel administrativo, o usuario precisa da custom claim `admin: true` no Firebase Auth token.

Depois de definir a claim, faca logout/login para renovar o token.

## Observacoes

- Nunca versione `.env` com chaves reais.
- Imagens das cartas devem ficar em `public/cards`.
- Fichas antigas sem `type` sao tratadas como `player`.

## Creditos

- Criador e escritor do sistema RPG: **G.O.S Show**
- Desenvolvimento da aplicacao: **Rayan de Paula**

## Licenca

Projeto privado para uso do Clock Tan-Tan.
