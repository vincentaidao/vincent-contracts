import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export type DeploymentRecord = Record<string, any>;

function getDeploymentsDir() {
  return join(__dirname, "..", "..", "deployments");
}

export function loadDeployment(network: string): DeploymentRecord {
  const dir = getDeploymentsDir();
  const path = join(dir, `${network}.json`);
  try {
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return { network, updatedAt: new Date().toISOString() };
  }
}

export function writeDeployment(network: string, patch: DeploymentRecord) {
  const dir = getDeploymentsDir();
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${network}.json`);
  const current = loadDeployment(network);
  const next = {
    ...current,
    ...patch,
    network,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(path, JSON.stringify(next, null, 2) + "\n");
  return path;
}
