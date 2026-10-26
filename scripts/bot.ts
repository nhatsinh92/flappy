// scripts/bot.ts
// CLI chạy bot headless và xuất log JSON Lines (cùng định dạng SPEC Section 11).
//
//   npx vite-node scripts/bot.ts -- --games 2000 --seed 1 --ramp both --out bot-log.jsonl
//
// Tùy chọn: --games N (mặc định 1000), --seed S (mặc định 1), --ramp on|off|both (mặc định both),
//           --out FILE (mặc định in ra stdout). Tóm tắt luôn in ra stderr.
// Dùng --out thay vì `>` để file là UTF-8 (PowerShell 5 ghi `>` thành UTF-16).

import { writeFileSync } from "node:fs";
import { runBot } from "./botCore";
import { serializeEvent, type DeathEvent } from "../src/logic/index";

interface CliOptions {
  games: number;
  seed: number;
  ramp: "on" | "off" | "both";
  out: string | null;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { games: 1000, seed: 1, ramp: "both", out: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === "--games") options.games = Number(value);
    else if (arg === "--seed") options.seed = Number(value);
    else if (arg === "--ramp") options.ramp = value as CliOptions["ramp"];
    else if (arg === "--out") options.out = value;
    else continue;
    i += 1;
  }
  if (!Number.isInteger(options.games) || options.games < 1) {
    throw new Error("--games phải là số nguyên ≥ 1");
  }
  if (!Number.isInteger(options.seed) || options.seed < 0) {
    throw new Error("--seed phải là số nguyên ≥ 0");
  }
  if (!["on", "off", "both"].includes(options.ramp)) {
    throw new Error("--ramp phải là on, off hoặc both");
  }
  return options;
}

function summarize(label: string, events: DeathEvent[], survived: number): string {
  const causes: Record<string, number> = {};
  for (const event of events) causes[event.cause] = (causes[event.cause] ?? 0) + 1;
  const total = events.reduce((sum, e) => sum + e.score, 0);
  const mean = events.length > 0 ? (total / events.length).toFixed(2) : "n/a";
  const past10 = events.filter((e) => e.score >= 10).length;
  return (
    `[${label}] chết ${events.length}, sống sót ${survived}, điểm trung bình ${mean}, ` +
    `≥10 điểm: ${past10}, nguyên nhân: ${JSON.stringify(causes)}`
  );
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const modes: boolean[] =
    options.ramp === "both" ? [false, true] : [options.ramp === "on"];
  const lines: string[] = [];
  for (const difficultyRamp of modes) {
    const { events, survived } = runBot({
      games: options.games,
      seed: options.seed,
      difficultyRamp,
    });
    lines.push(...events.map(serializeEvent));
    console.error(summarize(`ramp=${difficultyRamp}`, events, survived));
  }
  const text = lines.map((line) => `${line}\n`).join("");
  if (options.out === null) {
    process.stdout.write(text);
  } else {
    writeFileSync(options.out, text, "utf8");
    console.error(`Đã ghi ${lines.length} dòng vào ${options.out}`);
  }
}

main();
