# Cifrei 4.0 - Contexto Tecnico do Projeto

Este documento foi criado para servir como contexto base para desenvolvimento com Codex no VS Code, com foco em alteracoes diretas nos arquivos.

## 1) Escopo mapeado

Mapeamento realizado em `2026-04-20` sobre:

- Pasta raiz: `...\Cifrei 4.0\`
- Aplicacao web: `...\Cifrei 4.0\Exports\`

## 2) Visao geral do produto

O projeto e uma aplicacao web estatica (HTML + CSS + JS) chamada **Cifrei**, com:

- Fluxos de autenticacao (cadastro, login, reset de senha, perfil)
- Fluxos de cifrar/decifrar texto com criptografia no cliente
- Armazenamento em Supabase de cifras e preferencias do usuario
- Recursos de QR Code (gerar e ler)
- Termos legais dinamicos carregados do banco

Nao ha framework frontend (React/Vue/etc.) nem bundler visivel; a logica roda em scripts JS carregados diretamente nas paginas.

## 3) Estrutura de diretorios

### 3.1 `...\Cifrei 4.0\` (nivel acima da aplicacao)

- `Exports/` (aplicacao principal)
- `Cifrei - Termos e Politica de Privacidade.html`
- `Cifrei 4.0.zip`
- `cifrei4_0.bsdesign`
- `Cifrei_4_WhitePaper_Arquitetura_Criptografica_Detalhado.pdf`
- `compactar-cifrei4_0.ps1`
- `Guia_Usuario_Cifrei 4.0.html`
- `icon-512.png`

### 3.2 `...\Cifrei 4.0\Exports\` (aplicacao)

- Paginas HTML:
  - `index.html` (landing page)
  - `entrar.html` (login)
  - `cadastrar.html` (cadastro)
  - `resetpw.html` (redefinicao de senha)
  - `home.html` (inicio pos-login / lista de cifras)
  - `cifrar.html` (cifragem)
  - `decifrar.html` (decifragem)
  - `cifraaberta.html` (resultado da decifragem)
  - `editarcifra.html` (edicao de cifra salva)
  - `meuperfil.html` (perfil)
  - `termos.html` (termos e privacidade)
  - `suporte.html` (ajuda)
- Config:
  - `manifest.json` (PWA basico)
  - `.gitignore`
- Assets:
  - `assets/bootstrap/` (Bootstrap local)
  - `assets/css/` (estilos)
  - `assets/js/` (logica principal)
  - `assets/img/` (logos/icones)
  - `assets/fonts/` (fontes e icones)
  - `assets/doc/` (documento tecnico PDF)

## 4) Arquivos JS centrais e responsabilidades

### 4.1 Criptografia e formato de codigo

- `assets/js/cipherFunctions.js`
  - Geracao/validacao de chave
  - `encrypt()` e `decrypt()`
  - AES-GCM + derivacao de chave com Argon2id
  - Calibracao de custo Argon2 por tempo no dispositivo
  - Formato atual de payload com versao (`CIFREI_CODE_VERSION = 5`)
  - Compatibilidade com formato legado (`version = 4`)

### 4.2 Persistencia (Supabase)

- `assets/js/supabaseClient.js`
  - Inicializa cliente Supabase global (`window.cifreiSupabase`).
- `assets/js/storage.js`
  - CRUD de `cifragem_records`
  - Leitura/gravacao de dados em `profiles`
  - Registro de avaliacoes em `avaliacoes`
  - Funcoes auxiliares de estado de uso relevante e prompts de avaliacao

Tabelas identificadas no codigo:

- `cifragem_records`
- `profiles`
- `avaliacoes`
- `legal_documents` (via `legalDocumentsV2.js`)

### 4.3 Autenticacao e fluxo de conta

- `assets/js/authPagesV2.js`
  - Login, cadastro, reset de senha, update de senha
  - Guard de paginas protegidas
  - Regras de senha (ASCII imprimivel, forca minima etc.)
  - Integracao com endpoint Have I Been Pwned (k-anonymity)
  - Integracao com aceite de termos no cadastro

### 4.4 Interface e fluxos de pagina

- `assets/js/uiBehaviour.js` (arquivo grande, orquestra boa parte da UI)
  - Wiring dos botoes e modais
  - Fluxo de cifrar/decifrar
  - Salvamento e atualizacao de cifra
  - Clipboard inteligente para chave/cifra
  - Geracao e leitura de QR Code (inclui scanner por camera)
  - Menu flutuante e comportamentos globais

- `assets/js/home.js`
  - Lista de cifras na `home.html`
  - Exclusao/edicao de cifra
  - Navegacao para cifrar/decifrar

### 4.5 Auxiliares

- `assets/js/inputMask.js` (mascaras e sanitizacao de inputs)
- `assets/js/passwordGenerator.js` (gerador de senha aleatoria)
- `assets/js/modal.js` (infra de modais)
- `assets/js/helpContent.js` (conteudos de ajuda)
- `assets/js/legalDocumentsV2.js` (carregamento/aceite de termos legais)
- `assets/js/argon2-bundled.min.js` (biblioteca minificada)
- `assets/js/qrcode.min.js` (biblioteca minificada)

## 5) Paginas e intencao funcional

- `index.html`: landing e marketing
- `entrar.html`: login + modal de esqueci senha
- `cadastrar.html`: criacao de usuario + aceite de termos
- `resetpw.html`: atualizacao de senha por link
- `home.html`: listagem de cifras salvas e atalhos principais
- `cifrar.html`: entrada de texto + chave + frase segredo e geracao de cifra
- `decifrar.html`: entrada de chave + codigo e recuperacao do texto
- `cifraaberta.html`: exibicao do texto aberto apos decifrar
- `editarcifra.html`: edicao controlada de registro salvo
- `meuperfil.html`: edicao de perfil, reset de senha, exclusao de conta
- `termos.html`: exibicao de termos/politica e fluxo de aceite
- `suporte.html`: central de instrucoes/ajuda

## 6) Dependencias externas observadas

Scripts remotos usados nas paginas:

- `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- `https://unpkg.com/jsqr/dist/jsQR.js`

Dependencias locais:

- Bootstrap (local em `assets/bootstrap`)
- QRCode lib local (`qrcode.min.js`)
- Argon2 bundle local (`argon2-bundled.min.js`)

## 7) Dados e estado no cliente (local/session storage)

Chaves de estado relevantes identificadas:

- Contextos de navegacao e fluxo:
  - `cifreiDecifrarContext`
  - `cifreiEditarContext`
  - `cifrei_decifragem`
  - `cifreiLastClipboardAsked`
- Calibracao de criptografia:
  - `cifrei.argon2.calibration.v4`
- Sessao/fluxo auth (varias chaves em `authPagesV2.js`), incluindo:
  - `cifrei_pending_login_email_v1`
  - `cifrei_legal_return_context_v1`
  - `cifrei_login_guard_v1`
  - etc.

## 8) Fluxos principais (resumo)

### 8.1 Cifrar

1. Usuario informa mensagem, chave e frase segredo.
2. `encrypt()` gera payload cifrado (AES-GCM + chave derivada via Argon2id).
3. Usuario salva no Supabase (`cifragem_records`) com nome/observacao.
4. Pode gerar QR com conteudo cifrado.

### 8.2 Decifrar

1. Usuario fornece chave e codigo cifrado (manual, clipboard, QR ou cifra salva).
2. `decrypt()` valida/decifra.
3. Resultado e exibido em `cifraaberta.html`.

### 8.3 Conta e legal

1. Cadastro/login via Supabase Auth.
2. Guard de paginas para areas autenticadas.
3. Termos legais carregados de `legal_documents` e aceite persistido em `profiles`.

## 9) Observacoes tecnicas importantes

- O projeto e fortemente acoplado a IDs de elementos HTML.
- Muitos scripts sao carregados em **todas** as paginas e ativam comportamento por deteccao de elementos/`page`.
- Ha texto com encoding inconsistente (acentos corrompidos em alguns arquivos), ponto de atencao para futuras edicoes.
- `supabaseClient.js` contem URL e chave publicavel do projeto Supabase em claro (esperado para chave anonima/publicavel, mas requer governanca de RLS no banco).

## 10) Sugestao de uso deste documento com Codex

Ao pedir alteracoes, referencie:

- Pagina alvo (`cifrar.html`, `decifrar.html`, etc.)
- Arquivo JS de comportamento esperado (`uiBehaviour.js`, `authPagesV2.js`, etc.)
- Se a mudanca e visual (CSS/HTML), funcional (JS), dados (storage.js) ou auth/legal

Exemplo de prompt:

`No fluxo da decifrar.html, quero que o botao btnDecifrar so habilite quando chave e codigo forem validos. Pode alterar HTML/JS diretamente.`
