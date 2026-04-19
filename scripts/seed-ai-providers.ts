/**
 * Seed script for AI Providers
 * 
 * This script adds default AI providers to the database.
 * Run with: bun run scripts/seed-ai-providers.ts
 */

import { PrismaClient } from '@prisma/client'
import { nanoid } from 'nanoid'

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL
})

// Default AI providers configuration
// Note: API keys should be set via environment variables or superadmin panel
const defaultProviders = [
  {
    id: nanoid(),
    name: 'zai',
    displayName: 'Z.ai GLM (Built-in)',
    apiKey: 'sandbox', // Uses sandbox environment - no external key needed
    baseUrl: null,
    model: 'default',
    priority: 1,
    isEnabled: true,
    costPerInputToken: 0, // Free in sandbox
    costPerOutputToken: 0,
    rateLimitPerMinute: 60,
    maxTokensPerRequest: 4096,
    timeoutMs: 30000,
    healthStatus: 'unknown'
  },
  {
    id: nanoid(),
    name: 'groq',
    displayName: 'Groq (Llama 3.1 8B)',
    apiKey: '', // Must be configured in superadmin
    baseUrl: null,
    model: 'llama-3.1-8b-instant',
    priority: 2,
    isEnabled: false, // Disabled until API key is configured
    costPerInputToken: 0, // Very cheap: $0.05/1M tokens
    costPerOutputToken: 0.08, // $0.08/1M output tokens
    rateLimitPerMinute: 30,
    maxTokensPerRequest: 4096,
    timeoutMs: 30000,
    healthStatus: 'unknown'
  },
  {
    id: nanoid(),
    name: 'openai',
    displayName: 'OpenAI (GPT-4o-mini)',
    apiKey: '', // Must be configured in superadmin
    baseUrl: null,
    model: 'gpt-4o-mini',
    priority: 3,
    isEnabled: false, // Disabled until API key is configured
    costPerInputToken: 0.15, // $0.15/1M tokens
    costPerOutputToken: 0.60, // $0.60/1M tokens
    rateLimitPerMinute: 60,
    maxTokensPerRequest: 4096,
    timeoutMs: 30000,
    healthStatus: 'unknown'
  }
]

async function main() {
  console.log('🌱 Seeding AI providers...')
  
  // Ensure system configuration exists
  let systemConfig = await prisma.systemConfiguration.findFirst()
  
  if (!systemConfig) {
    systemConfig = await prisma.systemConfiguration.create({
      data: {
        id: nanoid(),
        systemName: 'AgendaZap',
        enableAiAssistant: true,
        updatedAt: new Date()
      }
    })
    console.log('✅ Created system configuration')
  }
  
  // Seed AI providers
  for (const provider of defaultProviders) {
    try {
      const existing = await prisma.aIProvider.findUnique({
        where: { name: provider.name }
      })
      
      if (existing) {
        console.log(`⚠️  Provider already exists: ${provider.displayName}`)
        continue
      }
      
      const created = await prisma.aIProvider.create({
        data: {
          ...provider,
          systemConfigurationId: systemConfig.id,
          updatedAt: new Date()
        }
      })
      console.log(`✅ Created: ${created.displayName} (priority: ${created.priority})`)
    } catch (error: any) {
      console.error(`❌ Error creating ${provider.name}:`, error.message)
    }
  }
  
  const total = await prisma.aIProvider.count()
  const enabled = await prisma.aIProvider.count({ where: { isEnabled: true } })
  console.log(`\n🎉 Done! Total providers: ${total}, Enabled: ${enabled}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
