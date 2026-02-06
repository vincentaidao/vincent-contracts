# Vincent Contracts

## Deploy

Single entrypoint:

```bash
pnpm deploy -- --network sepolia
pnpm deploy -- --network sepolia --stage dev
```

Mainnet safety:

```bash
pnpm deploy -- --network mainnet --confirm-mainnet --stage prod
# or
CONFIRM_MAINNET=YES DEPLOY_NETWORK=mainnet pnpm deploy
```

Notes:
- `--network` is required when not using Hardhat's `--network` switch.
- `--stage` is optional; it suffixes the deployment record filename.
- Mainnet requires `--confirm-mainnet` or `CONFIRM_MAINNET=YES`.
- Deploy does **not** transfer VIN or Seeder ownership; do that manually if needed.

## Airdrop Eligibility

The airdrop supports read-only eligibility checks based on current rules:

- `eligibility(agentId)` returns `(eligible, reason)` based only on agent id + registry. Reasons include `INVALID_AGENT`, `NO_WALLET`, and `ELIGIBLE`.
- `isEligible(agentId)` returns true if the agent id is valid and a registered wallet exists.
- `isEligibleForAgent(agentId)` checks the registered wallet for the agentId.

Claims are manually enabled via `claimEnabled` per ops policy (typically after sellout + LP seeding).
