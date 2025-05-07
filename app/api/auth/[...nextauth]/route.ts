import NextAuth, { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import { Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

// カスタムセッション型
interface CustomSession extends Session {
  accessToken?: string;
  error?: string;
}

// カスタムJWT型
interface CustomToken extends JWT {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar',
          prompt: 'consent',
          access_type: 'offline',
        }
      }
    }),
    // 他の認証プロバイダーをここに追加
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30日間
  },
  callbacks: {
    jwt: async ({ token, account }) => {
      // 初回サインイン時にアカウント情報をトークンに追加
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token as CustomToken;
    },
    session: async ({ session, token }) => {
      // JWTトークンからセッションにカスタムプロパティを追加
      const customSession = session as CustomSession;
      customSession.accessToken = (token as CustomToken).accessToken;
      customSession.error = (token as CustomToken).error;
      
      return customSession;
    }
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 