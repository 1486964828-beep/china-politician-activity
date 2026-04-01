import { spawn } from "node:child_process";

const steps: Array<[string, string[]]> = [
  ["search:generate", process.argv.slice(2)],
  ["candidates:ingest", process.argv.slice(2)],
  ["fetch:articles", []],
  ["extract:events", []],
  ["dedup", []]
];

function runStep(scriptName: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["run", scriptName, "--", ...args], {
      stdio: "inherit",
      shell: true
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Step failed: ${scriptName}`));
      }
    });
  });
}

async function main() {
  for (const [scriptName, args] of steps) {
    console.log(`\n==> Running ${scriptName}`);
    await runStep(scriptName, args);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
