// src/middleware/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrivyClient } from '@privy-io/server-auth';

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export interface AuthenticatedRequest extends FastifyRequest {
  privyUserId?: string;
  walletAddress?: string;
}

/**
 * Verify Privy JWT token from Authorization header.
 * Sets req.privyUserId and req.walletAddress on success.
 */
export async function requireAuth(req: AuthenticatedRequest, res: FastifyReply) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Authorization required' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const claims = await privy.verifyAuthToken(token);
    const userId = claims.userId;

    if (!userId) {
      return res.status(401).send({ error: 'Invalid token' });
    }

    // Get user details to extract wallet
    const user = await privy.getUser(userId);
    const walletAddress = user.wallet?.address?.toLowerCase();

    req.privyUserId = userId;
    req.walletAddress = walletAddress;
  } catch (err: any) {
    if (err.message?.includes('expired')) {
      return res.status(401).send({ error: 'Token expired' });
    }
    return res.status(401).send({ error: 'Invalid token' });
  }
}

/**
 * Verify that the authenticated user owns the commerce.
 * Must be used after requireAuth.
 */
export async function requireCommerceOwner(
  req: AuthenticatedRequest,
  res: FastifyReply,
  commerceWallet: string
) {
  if (!req.walletAddress) {
    return res.status(401).send({ error: 'Authorization required' });
  }

  if (req.walletAddress.toLowerCase() !== commerceWallet.toLowerCase()) {
    return res.status(403).send({ error: 'Not authorized for this commerce' });
  }
}
