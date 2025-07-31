import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import DiscordProvider from "next-auth/providers/discord"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Temporarily disabled due to typing issues
  providers: [
    // Only include credentials provider for now
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar || undefined,
          provider: user.provider || 'email',
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.username = user.username
        token.provider = user.provider
        token.avatar = user.avatar
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.username = token.username as string
        session.user.provider = token.provider as string
        session.user.avatar = token.avatar as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Handle username conflicts for OAuth users
      if (account?.provider !== 'credentials' && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { username: user.username }
        })
        
        if (existingUser && existingUser.email !== user.email) {
          // Generate unique username
          const baseUsername = user.username || user.email!.split('@')[0]
          let newUsername = baseUsername
          let counter = 1
          
          while (await prisma.user.findUnique({ where: { username: newUsername } })) {
            newUsername = `${baseUsername}_${counter}`
            counter++
          }
          
          user.username = newUsername
        }
      }
      return true
    },
  },
  pages: {
    signIn: '/login',
  },
}
