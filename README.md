# Vincent Contracts

## Deploy

Single entrypoint:

```bash
pnpm deploy -- --network sepolia
pnpm deploy -- --network sepolia --stage dev
```

Notes:
- `--network` is required when not using Hardhat's `--network` switch.
- `--stage` is optional; it suffixes the deployment record filename.
- Deploy does **not** transfer VIN or Seeder ownership; do that manually if needed.

## Airdrop Eligibility

The airdrop supports read-only eligibility checks based on current rules:

- `isEligible(agentId)` returns true if the agent id is valid and a registered wallet exists.

Claims are manually enabled via `claimEnabled` per ops policy (typically after sellout + LP seeding).
