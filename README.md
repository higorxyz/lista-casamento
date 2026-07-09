# Lista de Presentes — Marcia & Matheus

Site de lista de presentes de casamento, feito em Next.js (App Router) + TypeScript, pronto para hospedar na Vercel.

## Como funciona

- **Convidados** (`/`) veem todos os presentes. Ao escolher um, informam nome e WhatsApp e confirmam — o item passa a aparecer como **"Já escolhido"** para todo mundo, mas **sem mostrar quem escolheu**.
- **Marcia e Matheus** (`/admin`) entram com uma senha e podem: adicionar presentes (com descrição e link de produto), ver quem escolheu cada item (nome + link direto de WhatsApp), liberar um presente escolhido por engano, e excluir itens.
- Os dados dos presentes ficam gravados em um banco Redis (Upstash), então persistem de verdade entre acessos — diferente de um protótipo local.
- Só quem estiver autenticado como admin (via cookie de sessão seguro) recebe do servidor o nome/WhatsApp de quem escolheu cada presente. Convidados nunca recebem essa informação, nem inspecionando a rede do navegador.

## Rodando localmente

```bash
npm install
cp .env.example .env.local
# edite .env.local com sua senha de admin e as credenciais do Redis (veja abaixo)
npm run dev
```

## Deploy na Vercel — passo a passo

1. **Suba este projeto para um repositório no GitHub** (ou use `vercel deploy` direto pela CLI, se preferir).
2. Na Vercel, clique em **Add New → Project** e importe o repositório.
3. Antes (ou depois) do primeiro deploy, crie o banco de dados:
   - No dashboard do projeto, vá em **Storage → Marketplace Database Providers → Upstash → Redis**.
   - Crie um banco Redis gratuito e **conecte ao projeto**. Isso preenche automaticamente as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
4. Em **Settings → Environment Variables**, adicione:
   - `ADMIN_PASSWORD` → a senha que Marcia e Matheus usarão em `/admin` (escolha algo só vocês saibam).
5. Clique em **Deploy**. Pronto — o site estará em algo como `lista-marcia-e-matheus.vercel.app` (você pode configurar um domínio próprio depois em **Settings → Domains**).

## Estrutura

```
app/
  page.tsx              → página pública (lista de presentes)
  admin/page.tsx         → painel da noiva/noivo (login + gestão)
  api/gifts/              → endpoints da lista (GET público oculta dados do convidado; POST admin)
  api/gifts/[id]/          → editar/liberar (PATCH) e excluir (DELETE) um presente, admin
  api/gifts/[id]/claim/     → convidado escolhe um presente (público)
  api/admin/login|logout|session/ → autenticação simples do admin
components/
  GuestApp.tsx            → grade de presentes + modal de escolha (cliente)
  AdminApp.tsx             → login + painel administrativo (cliente)
lib/
  gifts.ts                → acesso ao Redis (Upstash)
  auth.ts                 → verificação de senha e cookie de sessão do admin
  types.ts                 → tipos + função que "limpa" os dados antes de mandar pro convidado
```

## Trocar a senha de admin depois

Basta editar a variável `ADMIN_PASSWORD` em **Settings → Environment Variables** na Vercel e fazer um novo deploy (ou usar "Redeploy").
