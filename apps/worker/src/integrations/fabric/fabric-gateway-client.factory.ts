import { readFile } from 'node:fs/promises';
import { createPrivateKey } from 'node:crypto';
import * as grpc from '@grpc/grpc-js';
import {
  connect,
  signers,
  type ConnectOptions,
  type Contract,
  type Gateway,
} from '@hyperledger/fabric-gateway';
import type { FabricEnv } from '../../config/fabric-env';

export type FabricGatewaySubmitResult = {
  transactionId: string;
  blockNumber?: number;
  commitStatus?: string;
};

export type FabricGatewayClient = {
  submitCreateAnchor(args: string[]): Promise<FabricGatewaySubmitResult>;
  close(): void;
};

export class FabricGatewayClientFactory {
  async create(env: FabricEnv): Promise<FabricGatewayClient> {
    const [identityCert, privateKeyPem, tlsCert] = await Promise.all([
      readFile(env.identityCertPath),
      readFile(env.privateKeyPath),
      readFile(env.tlsCertPath),
    ]);

    const client = new grpc.Client(
      env.peerEndpoint,
      grpc.credentials.createSsl(tlsCert),
      {
        'grpc.ssl_target_name_override': env.gatewayHostAlias,
        'grpc.default_authority': env.gatewayHostAlias,
      },
    );
    const privateKey = createPrivateKey(privateKeyPem);
    const gateway = connect({
      client,
      identity: {
        mspId: env.mspId,
        credentials: identityCert,
      },
      signer: signers.newPrivateKeySigner(privateKey),
      submitOptions: deadlineOptions(env.submitTimeoutMs),
      commitStatusOptions: deadlineOptions(env.commitTimeoutMs),
    });
    const contract = gateway.getNetwork(env.channel).getContract(env.chaincode);

    return new SdkFabricGatewayClient(client, gateway, contract);
  }
}

class SdkFabricGatewayClient implements FabricGatewayClient {
  constructor(
    private readonly grpcClient: grpc.Client,
    private readonly gateway: Gateway,
    private readonly contract: Contract,
  ) {}

  async submitCreateAnchor(args: string[]): Promise<FabricGatewaySubmitResult> {
    const submitted = await this.contract.submitAsync('CreateAnchor', {
      arguments: args,
    });
    const status = await submitted.getStatus();

    if (!status.successful) {
      throw new Error(
        `Fabric transaction ${status.transactionId} failed commit status ${String(status.code)}`,
      );
    }

    return {
      transactionId: status.transactionId || submitted.getTransactionId(),
      blockNumber: toSafeNumber(status.blockNumber),
      commitStatus: 'VALID',
    };
  }

  close() {
    this.gateway.close();
    this.grpcClient.close();
  }
}

function deadlineOptions(timeoutMs: number): ConnectOptions['submitOptions'] {
  return () => ({
    deadline: Date.now() + timeoutMs,
  });
}

function toSafeNumber(value: bigint) {
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : undefined;
}
