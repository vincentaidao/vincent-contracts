export type UniswapV4Deployment = {
  poolManager: string;
  positionManager: string;
  permit2: string;
};

export type NetworkDefaults = {
  chainId: number;
  identityRegistry: string;
};

export const NETWORK_DEFAULTS: Record<string, NetworkDefaults> = {
  mainnet: {
    chainId: 1,
    identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
  },
  sepolia: {
    chainId: 11155111,
    identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  },
};

// Source: https://docs.uniswap.org/contracts/v4/deployments
export const UNISWAP_V4_BY_CHAIN_ID: Record<number, UniswapV4Deployment> = {
  1: {
    poolManager: "0x000000000004444c5dc75cB358380D2e3dE08A90",
    positionManager: "0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e",
    permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  },
  11155111: {
    poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
    positionManager: "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4",
    permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  },
};
