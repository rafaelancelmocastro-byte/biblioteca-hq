# Biblioteca de HQs

Aplicação responsiva para organizar, descobrir e ler HQs. A interface é construída com React e Vite; a Vercel hospeda o frontend estático e as funções serverless em `api/`.

## Arquitetura

- `src/`: frontend React + Vite. Nesta etapa, utiliza dados e armazenamento local simulados.
- `api/`: funções serverless da Vercel. A primeira função disponível é `GET /api/health`.
- `dist/`: build estático gerado pelo Vite. Não deve ser editado manualmente.
- `vercel.json`: define `npm run build`, publica `dist` e encaminha as rotas da SPA para `index.html`, preservando `/api/*` para as funções serverless.

O frontend não acessa Cloudflare R2 diretamente e não contém credenciais de servidor. A integração real com Supabase e R2 fica para a próxima etapa.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e mantenha o arquivo local fora do Git.

Variáveis públicas, permitidas no frontend Vite:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Variáveis exclusivamente server-side, para as funções em `api/`:

```env
SUPABASE_SERVICE_ROLE_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=biblioteca-hqs
R2_ENDPOINT=
APP_OWNER_EMAIL=
```

Nunca use o prefixo `VITE_` em segredos: variáveis com esse prefixo podem ser incorporadas ao JavaScript entregue ao navegador. Em especial, `SUPABASE_SERVICE_ROLE_KEY` e as credenciais R2 nunca podem ser importadas por arquivos dentro de `src/`.

Nunca envie `.env.local` ao GitHub. O `.gitignore` já bloqueia arquivos `.env*`, exceto o modelo `.env.example`.

O bucket Cloudflare R2 permanecerá privado. Quando a integração for implementada, uploads e URLs temporárias serão gerados somente pelas funções serverless.

Para o R2, `R2_ENDPOINT` deve usar o formato abaixo, substituindo pelo identificador da conta:

```env
R2_ENDPOINT=https://SEU_ACCOUNT_ID.r2.cloudflarestorage.com
```

## Funções de armazenamento

As funções abaixo executam somente na Vercel. Elas exigem um token de sessão Supabase no cabeçalho `Authorization: Bearer <access_token>` e verificam se o e-mail corresponde a `APP_OWNER_EMAIL`.

- `POST /api/storage/presign-upload`: aceita PDFs como `comic` e imagens JPEG, PNG ou WebP como `cover`; retorna uma URL temporária de upload e a chave privada do objeto.
- `POST /api/storage/presign-read`: recebe uma chave emitida pelo servidor e retorna uma URL temporária de leitura.

As URLs expiram em dez minutos. Nenhuma função retorna credenciais R2 ou a chave de serviço do Supabase.

## Desenvolvimento

Instale as dependências:

```bash
npm install
```

Para executar somente o frontend:

```bash
npm run dev
```

Para executar frontend e funções serverless localmente, instale ou use a CLI da Vercel e execute:

```bash
npx vercel dev
```

Após iniciar a Vercel localmente, confira a função de saúde em `http://localhost:3000/api/health`.

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Mantenha `npm run build` como comando de build e `dist` como diretório de saída.
3. Cadastre as variáveis públicas e as variáveis exclusivamente server-side em **Settings → Environment Variables**.
4. Não cadastre segredos com o prefixo `VITE_`.
5. Faça o deploy. As rotas do frontend continuarão abrindo a SPA, enquanto `/api/health` será atendida pela função Vercel.

## Validação

```bash
npm run lint
npm run build
```

O build deve gerar `dist/index.html` e os arquivos em `dist/assets/`. Antes de cada deploy, confirme que os nomes `R2_SECRET_ACCESS_KEY`, `R2_ACCESS_KEY_ID` e `SUPABASE_SERVICE_ROLE_KEY` não aparecem nos arquivos gerados em `dist/`.
