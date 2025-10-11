/**
 * x402 Facilitator Server for Starknet
 * 
 * This server provides verification and settlement services for x402 payments
 * on Starknet, implementing the facilitator REST API specification.
 */

import express, { Request, Response } from 'express';
import {
  PaymentPayload,
  PaymentRequirements,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  SupportedResponse,
  StarknetExactPayload,
  FacilitatorConfig,
  X402_VERSION,
  SCHEMES,
  NETWORKS,
  VerificationError,
  SettlementError,
} from '../types/x402';
import { StarknetVerifier } from './starknet-verifier';
import { StarknetSettler } from './starknet-settler';

export class FacilitatorServer {
  private app: express.Application;
  private config: FacilitatorConfig;
  private verifier: StarknetVerifier;
  private settler: StarknetSettler;

  constructor(config: FacilitatorConfig) {
    this.config = config;
    this.app = express();
    this.verifier = new StarknetVerifier(config);
    this.settler = new StarknetSettler(config);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, X-PAYMENT');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      
      next();
    });

    // Logging middleware
    this.app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', version: X402_VERSION });
    });

    // Get supported schemes and networks
    this.app.get('/supported', this.handleSupported.bind(this));

    // Verify a payment
    this.app.post('/verify', this.handleVerify.bind(this));

    // Settle a payment
    this.app.post('/settle', this.handleSettle.bind(this));

    // Error handler
    this.app.use(this.errorHandler.bind(this));
  }

  /**
   * GET /supported
   * Returns the list of supported (scheme, network) pairs
   */
  private async handleSupported(req: Request, res: Response): Promise<void> {
    try {
      const response: SupportedResponse = {
        kinds: [
          {
            scheme: SCHEMES.EXACT,
            network: NETWORKS.STARKNET_MAINNET,
          },
          {
            scheme: SCHEMES.EXACT,
            network: NETWORKS.STARKNET_SEPOLIA,
          },
        ],
      };

      res.json(response);
    } catch (error) {
      console.error('Error in /supported:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /verify
   * Verifies a payment without executing it on-chain
   */
  private async handleVerify(req: Request, res: Response): Promise<void> {
    try {
      const request: VerifyRequest = req.body;

      // Validate request
      if (!this.isValidVerifyRequest(request)) {
        const response: VerifyResponse = {
          isValid: false,
          invalidReason: 'Invalid request format',
        };
        return res.json(response);
      }

      // Decode payment header
      const paymentPayload = this.decodePaymentHeader(request.paymentHeader);
      
      if (!paymentPayload) {
        const response: VerifyResponse = {
          isValid: false,
          invalidReason: 'Invalid payment header encoding',
        };
        return res.json(response);
      }

      // Verify version match
      if (paymentPayload.x402Version !== request.x402Version) {
        const response: VerifyResponse = {
          isValid: false,
          invalidReason: 'Version mismatch',
        };
        return res.json(response);
      }

      // Verify the payment based on scheme and network
      const verifyResult = await this.verifyPayment(
        paymentPayload,
        request.paymentRequirements
      );

      res.json(verifyResult);
    } catch (error) {
      console.error('Error in /verify:', error);
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: error instanceof Error ? error.message : 'Verification failed',
      };
      res.json(response);
    }
  }

  /**
   * POST /settle
   * Settles a payment by submitting it to the blockchain
   */
  private async handleSettle(req: Request, res: Response): Promise<void> {
    try {
      const request: SettleRequest = req.body;

      // Validate request
      if (!this.isValidSettleRequest(request)) {
        const response: SettleResponse = {
          success: false,
          error: 'Invalid request format',
          txHash: null,
          networkId: null,
        };
        return res.json(response);
      }

      // Decode payment header
      const paymentPayload = this.decodePaymentHeader(request.paymentHeader);
      
      if (!paymentPayload) {
        const response: SettleResponse = {
          success: false,
          error: 'Invalid payment header encoding',
          txHash: null,
          networkId: null,
        };
        return res.json(response);
      }

      // First verify the payment
      const verifyResult = await this.verifyPayment(
        paymentPayload,
        request.paymentRequirements
      );

      if (!verifyResult.isValid) {
        const response: SettleResponse = {
          success: false,
          error: verifyResult.invalidReason || 'Payment verification failed',
          txHash: null,
          networkId: null,
        };
        return res.json(response);
      }

      // Settle the payment on-chain
      const settleResult = await this.settlePayment(
        paymentPayload,
        request.paymentRequirements
      );

      res.json(settleResult);
    } catch (error) {
      console.error('Error in /settle:', error);
      const response: SettleResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Settlement failed',
        txHash: null,
        networkId: null,
      };
      res.json(response);
    }
  }

  /**
   * Verifies a payment based on its scheme and network
   */
  private async verifyPayment(
    paymentPayload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<VerifyResponse> {
    // Check scheme match
    if (paymentPayload.scheme !== requirements.scheme) {
      return {
        isValid: false,
        invalidReason: 'Scheme mismatch',
      };
    }

    // Check network match
    if (paymentPayload.network !== requirements.network) {
      return {
        isValid: false,
        invalidReason: 'Network mismatch',
      };
    }

    // Verify based on scheme
    if (paymentPayload.scheme === SCHEMES.EXACT) {
      return await this.verifier.verifyExactPayment(
        paymentPayload.payload as StarknetExactPayload,
        requirements
      );
    }

    return {
      isValid: false,
      invalidReason: `Unsupported scheme: ${paymentPayload.scheme}`,
    };
  }

  /**
   * Settles a payment on the blockchain
   */
  private async settlePayment(
    paymentPayload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<SettleResponse> {
    // Settle based on scheme
    if (paymentPayload.scheme === SCHEMES.EXACT) {
      return await this.settler.settleExactPayment(
        paymentPayload.payload as StarknetExactPayload,
        requirements
      );
    }

    return {
      success: false,
      error: `Unsupported scheme: ${paymentPayload.scheme}`,
      txHash: null,
      networkId: null,
    };
  }

  /**
   * Decodes a base64 payment header into a PaymentPayload
   */
  private decodePaymentHeader(header: string): PaymentPayload | null {
    try {
      const decoded = Buffer.from(header, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded) as PaymentPayload;
      return payload;
    } catch (error) {
      console.error('Failed to decode payment header:', error);
      return null;
    }
  }

  /**
   * Validates a verify request
   */
  private isValidVerifyRequest(request: any): request is VerifyRequest {
    return (
      request &&
      typeof request.x402Version === 'number' &&
      typeof request.paymentHeader === 'string' &&
      request.paymentRequirements &&
      typeof request.paymentRequirements === 'object'
    );
  }

  /**
   * Validates a settle request
   */
  private isValidSettleRequest(request: any): request is SettleRequest {
    return (
      request &&
      typeof request.x402Version === 'number' &&
      typeof request.paymentHeader === 'string' &&
      request.paymentRequirements &&
      typeof request.paymentRequirements === 'object'
    );
  }

  /**
   * Error handler middleware
   */
  private errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: express.NextFunction
  ): void {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }

  /**
   * Starts the facilitator server
   */
  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, () => {
        console.log(`x402 Facilitator Server running on port ${this.config.port}`);
        console.log(`Supported networks: ${this.config.networks.join(', ')}`);
        console.log(`Supported schemes: ${this.config.schemes.join(', ')}`);
        resolve();
      });
    });
  }

  /**
   * Gets the Express app instance
   */
  public getApp(): express.Application {
    return this.app;
  }
}

/**
 * Creates and starts a facilitator server
 */
export async function createFacilitatorServer(
  config: FacilitatorConfig
): Promise<FacilitatorServer> {
  const server = new FacilitatorServer(config);
  await server.start();
  return server;
}

