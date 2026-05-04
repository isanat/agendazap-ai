# Worklog

---
Task ID: 1
Agent: Main Agent
Task: Fix AI chat quality - social media, payment detection, conversation flow

Work Log:
- Investigated all AI-related files: ai-context-service.ts, faq.service.ts, pre-router.ts, webhook route
- Identified that Instagram/Facebook/website/description fields existed in the Account DB model but were NOT being injected into the AI system prompt
- Added instagram, facebook, website, description fields to SalonContext interface
- Updated getSalonContext() to read these fields from the Account record
- Updated generateSystemPrompt() to include Instagram/Facebook/website links in the system prompt
- Added new rules 16-19 to system prompt for: PIX vs in-person payment distinction, social media awareness, proactive sharing after booking, and "é possível?" question handling
- Added social media FAQ handler to faq.service.ts: isSocialMediaQuestion() pattern matcher and buildSocialMediaResponse() builder
- Updated buildAddressResponse() in faq.service.ts to include social media links
- Completely rewrote detectPaymentPreference() to prioritize in-person/cash detection BEFORE PIX, handling "vou de pix mas pago pessoalmente" correctly
- Verified all changes compile without lint errors

Stage Summary:
- AI now knows about Instagram/Facebook/website from the database
- FAQ service handles "tem instagram?" questions with instant response
- Address responses now include social media links
- Payment detection correctly identifies "vou de pix mas pago pessoalmente" as in_person payment
- System prompt now instructs AI to proactively share social media after booking confirmation
- New rule 16: explicitly tells AI that mentioning PIX + paying in person = in_person, NOT pix
- New rule 17: AI must share social media links when asked
- New rule 18: AI should proactively share address + social media after booking confirmation
- New rule 19: When asked "é possível?", answer YES and offer available times, don't list services

---
Task ID: 2
Agent: Main Agent
Task: Auditoria das configurações — múltiplos botões de salvar, dados não persistindo

Work Log:
- Leu todos os arquivos de configurações: settings-page.tsx, business-info-settings.tsx, integrations-settings.tsx, reminder-settings.tsx
- Leu o AI context service (ai-context-service.ts) completo para verificar fluxo de dados de social media
- Leu a API route /api/account/me para confirmar formato de resposta
- Leu o Prisma schema para confirmar campos do modelo Account

BUG CRÍTICO ENCONTRADO: business-info-settings.tsx usava `data.Account` (A maiúsculo) para acessar dados, mas a API retorna `data.account` (a minúsculo). Os dados de Instagram/Facebook NUNCA carregavam no formulário, fazendo parecer que não salvava.

- Corrigido: `data.Account` → `data.account || data.Account` em business-info-settings.tsx (consistente com settings-page.tsx)
- Corrigido: Múltiplos botões de salvar — adicionado estado `activeTab` ao Tabs, botão do header agora é condicional (escondido nas abas: Negócio, Feriados, Pacotes, Fidelidade, Integrações que têm seus próprios saves)
- Corrigido: Removido `(account as any)` casts em ai-context-service.ts para instagram, facebook, website, description, businessCategory, aiTone, aiConfig
- Melhorado: Prompt da IA agora inclui campo "Sobre:" com a descrição do negócio
- Melhorado: Regras 17-22 do prompt da IA significativamente fortalecidas para ser mais proativo:
  - Regra 17: Compartilhar redes sociais com entusiasmo quando perguntado
  - Regra 18: Após confirmar agendamento, PROATIVAMENTE compartilhar endereço + Maps + redes sociais
  - Regra 20: Para clientes novos, proativamente oferecer Instagram para conhecerem o trabalho
  - Regra 21: Enviar endereço completo + complemento + link Maps
  - Regra 22: Seja PROATIVO e NATURAL — não espere o cliente perguntar

Issue conhecido NÃO resolvido: ReminderSettings usa apenas estado local (useState), não persiste no banco. Precisaria criar modelo no Prisma + API.

Stage Summary:
- BUG CRÍTICO corrigido: Instagram/Facebook/website/description agora carregam corretamente no formulário de Negócio
- Botão de salvar do header agora é contextual — some nas abas com save próprio
- AI prompt mais proativo com 6 novas regras sobre compartilhamento automático de informações
- AI agora também recebe a "descrição do negócio" no contexto
- Casts `(account as any)` removidos — código mais seguro e tipado

---
Task ID: 3
Agent: Main Agent
Task: Commit changes and deploy to Vercel via GitHub

Work Log:
- Verified git status: 2 commits ahead of remote (already committed but not pushed)
- Pushed 2 commits to GitHub (agendazap remote)
- Discovered Vercel was NOT auto-deploying because GitHub had no webhook configured
- Found Vercel deploy hook URL: https://api.vercel.com/v1/integrations/deploy/prj_8sxwZ8C2v5bTTrtmsfZ2lTJidzVu/GZbwvLqwsZ
- Created GitHub webhook for push events → Vercel deploy hook
- Also triggered manual deploy via Vercel API as backup
- Amended commit message to be descriptive instead of UUID
- Force pushed amended commit
- Verified webhook triggered auto-deploy successfully
- All deployments READY

Stage Summary:
- GitHub webhook configured for auto-deploy on push
- Latest code deployed to Vercel (production)
- URL: https://agendazap-ai.vercel.app
- From now on, every git push to main will auto-deploy to Vercel
