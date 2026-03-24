const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..", "cloudshield", "WebUI");
const jestBin = require.resolve(path.join(projectRoot, "node_modules", "jest", "bin", "jest"));
const jestArgs = ["--coverage", ...process.argv.slice(2)];

const TARGET_FILES = [
  "api/client.js",
  "components/common/CreateButton/CreateButton.jsx",
  "pages/EmployeesPage.jsx",
  "pages/GroupsPage.jsx",
];

const result = spawnSync(process.execPath, [jestBin, ...jestArgs], {
  cwd: projectRoot,
  stdio: "inherit",
});

const lcovPath = path.join(projectRoot, "coverage", "lcov.info");

if (fs.existsSync(lcovPath)) {
  const lcov = fs.readFileSync(lcovPath, "utf8");

  // Force all paths to be exactly relative to the repository root for Sonar
  const normalized = lcov
    .replace(/^SF:.*[\\/]+cloudshield[\\/]+WebUI[\\/]+src[\\/]+/gm, "SF:cloudshield/WebUI/src/")
    .replace(/^SF:src\//gm, "SF:cloudshield/WebUI/src/")
    .replace(/^SF:\.\/src\//gm, "SF:cloudshield/WebUI/src/")
    .replace(/^SF:src\\/gm, "SF:cloudshield/WebUI/src/")
    .replace(/^SF:\.\\src\\/gm, "SF:cloudshield/WebUI/src/")
    .replace(/\\/g, "/");

  fs.writeFileSync(lcovPath, normalized, "utf8");

  const hasNormalizedPrefix = normalized.includes("SF:cloudshield/WebUI/src/");
  const fileDiagnostics = TARGET_FILES.map((file) => {
    const repoRelative = `SF:cloudshield/WebUI/src/${file}`;
    const present = normalized.includes(repoRelative);
    return `${file}=${present ? "present" : "missing"}`;
  }).join(", ");

  console.log(
    `[coverage] normalized lcov paths for SonarCloud (normalized=${hasNormalizedPrefix})`
  );
  console.log(`[coverage] target file entries: ${fileDiagnostics}`);
} else {
  console.log("[coverage] lcov.info not found; skipping lcov normalization");
}

if (result.error) {
  console.error("[coverage] jest execution error:", result.error.message);
}

process.exit(typeof result.status === "number" ? result.status : 1);
