# E-mails da Biblioteca HQ

O Supabase deste projeto usa o remetente padrão no momento. O painel bloqueia a edição de assunto e corpo dos e-mails até que um provedor SMTP próprio seja configurado.

Após conectar um domínio de envio verificado e um provedor SMTP em **Authentication → Emails → SMTP Settings**, usar estes modelos em **Authentication → Emails → Templates**:

- **Confirm sign up:** assunto `Confirme seu e-mail · Biblioteca HQ`, corpo de `confirm-sign-up.html`.
- **Reset password:** assunto `Redefina sua senha · Biblioteca HQ`, corpo de `reset-password.html`.

Os modelos usam `{{ .ConfirmationURL }}` para preservar o token e o redirecionamento seguro gerado pelo Supabase. Nunca armazenar a senha SMTP no repositório.
