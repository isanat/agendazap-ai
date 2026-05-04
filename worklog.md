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
