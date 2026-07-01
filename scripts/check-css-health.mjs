import { readFileSync } from "node:fs";

const checks = [
  {
    file: "app/layout.tsx",
    message: 'app/layout.tsx must import "./globals.css".',
    test: (content) => content.includes('import "./globals.css";')
  },
  {
    file: "app/globals.css",
    message: "app/globals.css must include Tailwind base/components/utilities directives.",
    test: (content) =>
      content.includes("@tailwind base;") &&
      content.includes("@tailwind components;") &&
      content.includes("@tailwind utilities;")
  },
  {
    file: "tailwind.config.ts",
    message: "tailwind.config.ts content must scan app, components, lib, and store.",
    test: (content) =>
      [
        "./app/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./lib/**/*.{ts,tsx}",
        "./store/**/*.{ts,tsx}"
      ].every((pattern) => content.includes(pattern))
  }
];

const failures = [];

for (const check of checks) {
  const content = readFileSync(check.file, "utf8");
  if (!check.test(content)) {
    failures.push(`${check.file}: ${check.message}`);
  }
}

if (failures.length > 0) {
  console.error("CSS health check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("CSS health check passed.");
