/**
 * x402 Payment Middleware for Resource Servers
 * 
 * Provides Express middleware for accepting x402 payments
 * "1 line of code to accept digital dollars"
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import axios from 'axios';
import {
  PaymentRequiredResponse,
  PaymentRequirements,
  PaymentPayload,
  VerifyRequest,
  SettleRequest,
  PaymentMiddlewareConfig,
  X402_VERSION,
  X_PAYMENT_HEADER,
  X_PAYMENT_RESPONSE_HEADER,
  SCHEMES,
} from '../types/x402';

/**
 * Creates payment middleware for Express applications
 * 
 * @example
 * ```typescript
 * app.use(paymentMiddleware("0xYourAddress", {
 *   "/api/data": "$0.01",
 *   "/api/premium": "$0.10"
 * }));
 * ```
 */
export function paymentMiddleware(
  payToAddress: string,
  pricing: Record<string, string>,
  options?: Partial<PaymentMiddlewareConfig>
): RequestHandler {
  const config: PaymentMiddlewareConfig = {
    facilitatorUrl: options?.facilitatorUrl || 'http://localhost:3001',
    payToAddress,
    tokenAddress: options?.tokenAddress || '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH on Starknet
    network: options?.network || 'starknet-sepolia',
    pricing,
    timeoutSeconds: options?.timeoutSeconds || 300, // 5 minutes default
    scheme: options?.scheme || SCHEMES.EXACT,
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if this endpoint requires payment
      const price = findPriceForPath(req.path, config.pricing);
      
      if (!price) {
        // No payment required for this endpoint
        return next();
      }

      // Check for payment header
      const paymentHeader = req.header(X_PAYMENT_HEADER);

      if (!paymentHeader) {
        // No payment provided, return 402 with requirements
        return sendPaymentRequired(res, req.path, price, config);
      }

      // Verify and settle the payment
      const isValid = await verifyAndSettlePayment(
        paymentHeader,
        req.path,
        price,
        config
      );

      if (!isValid.success) {
        // Invalid payment, return 402 with error
        return sendPaymentRequired(res, req.path, price, config, isValid.error);
      }

      // Payment successful, add settlement info to response headers
      if (isValid.txHash) {
        const settlementResponse = {
          txHash: isValid.txHash,
          network: config.network,
          timestamp: Date.now(),
        };
        
        const encodedResponse = Buffer.from(
          JSON.stringify(settlementResponse)
        ).toString('base64');
        
        res.setHeader(X_PAYMENT_RESPONSE_HEADER, encodedResponse);
      }

      // Continue to the actual route handler
      next();
    } catch (error) {
      console.error('Payment middleware error:', error);
      res.status(500).json({
        error: 'Payment processing error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Finds the price for a given path
 */
function findPriceForPath(
  path: string,
  pricing: Record<string, string>
): string | null {
  // Exact match
  if (pricing[path]) {
    return pricing[path];
  }

  // Pattern match (e.g., "/api/*")
  for (const [pattern, price] of Object.entries(pricing)) {
    if (matchPath(path, pattern)) {
      return price;
    }
  }

  return null;
}

/**
 * Simple path pattern matching
 */
function matchPath(path: string, pattern: string): boolean {
  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\//g, '\\/');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Sends a 402 Payment Required response
 */
function sendPaymentRequired(
  res: Response,
  resource: string,
  price: string,
  config: PaymentMiddlewareConfig,
  error?: string
): void {
  const amountInWei = parsePrice(price);

  const requirements: PaymentRequirements = {
    scheme: config.scheme,
    network: config.network,
    maxAmountRequired: amountInWei.toString(),
    resource,
    description: `Access to ${resource}`,
    mimeType: 'application/json',
    outputSchema: null,
    payTo: config.payToAddress,
    maxTimeoutSeconds: config.timeoutSeconds,
    asset: config.tokenAddress,
    extra: null,
  };

  const response: PaymentRequiredResponse = {
    x402Version: X402_VERSION,
    accepts: [requirements],
    error,
  };

  res.status(402).json(response);
}

/**
 * Parses a price string like "$0.01" into wei
 */
function parsePrice(price: string): bigint {
  // Remove currency symbols and whitespace
  const cleaned = price.replace(/[$\s]/g, '');
  
  // Parse as decimal
  const dollars = parseFloat(cleaned);
  
  if (isNaN(dollars)) {
    throw new Error(`Invalid price format: ${price}`);
  }

  // Convert to wei (assuming 1 ETH = $2000, adjust as needed)
  // In production, you'd use an oracle or fixed conversion rate
  const ethAmount = dollars / 2000;
  const weiAmount = BigInt(Math.floor(ethAmount * 1e18));
  
  return weiAmount;
}

/**
 * Verifies and settles a payment
 */
async function verifyAndSettlePayment(
  paymentHeader: string,
  resource: string,
  price: string,
  config: PaymentMiddlewareConfig
): Promise<{ success: boolean; error?: string; txHash?: string }> {
  try {
    const amountInWei = parsePrice(price);

    const requirements: PaymentRequirements = {
      scheme: config.scheme,
      network: config.network,
      maxAmountRequired: amountInWei.toString(),
      resource,
      description: `Access to ${resource}`,
      mimeType: 'application/json',
      outputSchema: null,
      payTo: config.payToAddress,
      maxTimeoutSeconds: config.timeoutSeconds,
      asset: config.tokenAddress,
      extra: null,
    };

    // First verify the payment
    const verifyRequest: VerifyRequest = {
      x402Version: X402_VERSION,
      paymentHeader,
      paymentRequirements: requirements,
    };

    const verifyResponse = await axios.post(
      `${config.facilitatorUrl}/verify`,
      verifyRequest
    );

    if (!verifyResponse.data.isValid) {
      return {
        success: false,
        error: verifyResponse.data.invalidReason || 'Payment verification failed',
      };
    }

    // Then settle the payment
    const settleRequest: SettleRequest = {
      x402Version: X402_VERSION,
      paymentHeader,
      paymentRequirements: requirements,
    };

    const settleResponse = await axios.post(
      `${config.facilitatorUrl}/settle`,
      settleRequest
    );

    if (!settleResponse.data.success) {
      return {
        success: false,
        error: settleResponse.data.error || 'Payment settlement failed',
      };
    }

    return {
      success: true,
      txHash: settleResponse.data.txHash,
    };
  } catch (error) {
    console.error('Payment verification/settlement error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed',
    };
  }
}

/**
 * Simple payment middleware without facilitator (local verification only)
 * Useful for development or when you want to handle settlement separately
 */
export function localPaymentMiddleware(
  payToAddress: string,
  pricing: Record<string, string>,
  options?: {
    tokenAddress?: string;
    network?: string;
    timeoutSeconds?: number;
  }
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const price = findPriceForPath(req.path, pricing);
    
    if (!price) {
      return next();
    }

    const paymentHeader = req.header(X_PAYMENT_HEADER);

    if (!paymentHeader) {
      const config: PaymentMiddlewareConfig = {
        facilitatorUrl: '',
        payToAddress,
        tokenAddress: options?.tokenAddress || '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        network: options?.network || 'starknet-sepolia',
        pricing,
        timeoutSeconds: options?.timeoutSeconds || 300,
        scheme: SCHEMES.EXACT,
      };
      
      return sendPaymentRequired(res, req.path, price, config);
    }

    // In local mode, just decode and validate the header format
    try {
      const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded) as PaymentPayload;

      if (payload.x402Version === X402_VERSION) {
        // Basic validation passed, continue
        // Note: This doesn't verify signatures or settle on-chain
        next();
      } else {
        throw new Error('Invalid payment version');
      }
    } catch (error) {
      const config: PaymentMiddlewareConfig = {
        facilitatorUrl: '',
        payToAddress,
        tokenAddress: options?.tokenAddress || '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        network: options?.network || 'starknet-sepolia',
        pricing,
        timeoutSeconds: options?.timeoutSeconds || 300,
        scheme: SCHEMES.EXACT,
      };
      
      return sendPaymentRequired(
        res,
        req.path,
        price,
        config,
        'Invalid payment format'
      );
    }
  };
}

