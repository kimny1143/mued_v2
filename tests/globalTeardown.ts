import { kill } from 'process';

export default async function globalTeardown() {
  // MCP サーバー終了
  const mcpPid = process.env.MCP_PROC_PID;
  if (mcpPid) {
    kill(Number(mcpPid));
  }

  // Stripe-mock 終了
  const stripePid = process.env.STRIPE_MOCK_PID;
  if (stripePid) {
    kill(Number(stripePid));
  }
} 