# Supabase

## Migration inicial

`migrations/202609220001_initial_schema.sql` cria o catálogo, perfis, favoritos e progresso de leitura. Ela também habilita RLS em todas as tabelas públicas.

Para aplicar no projeto `biblioteca-hq`, abra o SQL Editor do Supabase, cole o conteúdo completo da migration e execute-o uma única vez. Depois crie o usuário proprietário pela autenticação do Supabase; o gatilho criará automaticamente o perfil correspondente.

## Regras de acesso

- O catálogo requer uma sessão autenticada.
- Cada usuário acessa apenas o próprio perfil, favoritos e progresso.
- Nenhuma política permite gravação direta no catálogo pelo navegador.
- As chaves `pdf_key` e `cover_key` guardam somente o caminho do objeto privado no R2. URLs temporárias serão criadas no servidor na fase de armazenamento.

## Próxima integração

Depois de aplicar a migration, a próxima alteração no código será adicionar o cliente Supabase usando somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, então migrar os repositórios locais de progresso e favoritos. Não utilize nem exponha a chave `SUPABASE_SERVICE_ROLE_KEY` no frontend.
