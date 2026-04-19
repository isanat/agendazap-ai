import { db } from '@/lib/db'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare, hash } from 'bcryptjs'

// Helper function to hash passwords using bcrypt
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

// Helper to verify passwords using bcrypt
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword)
}

// Check if a password hash is a legacy (weak) hash
export function isLegacyHash(passwordHash: string): boolean {
  // Bcrypt hashes always start with $2a$, $2b$, or $2y$
  // Legacy simpleHash produces hex strings that don't start with $2
  return !passwordHash.startsWith('$2')
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { Account: true }
        })

        if (!user) {
          return null
        }

        // Check if user has a legacy hash - reject login for security
        if (isLegacyHash(user.password)) {
          // User needs to reset their password
          console.warn(`User ${user.email} has legacy password hash - password reset required`)
          return null
        }

        // Verify password using bcrypt
        const passwordMatch = await compare(credentials.password, user.password)
        
        if (!passwordMatch) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountId: user.Account?.id || null,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.accountId = user.accountId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.accountId = token.accountId as string | null
      }
      return session
    }
  },
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login'
  }
}

// Helper to check authentication (client-side)
export async function getCurrentUser() {
  const session = await fetch('/api/auth/session').then(res => res.json())
  return session?.user || null
}
