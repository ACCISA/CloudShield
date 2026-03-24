const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..", "cloudshield", "WebUI");
const jestBin = require.resolve(path.join(projectRoot, "node_modules", "jest", "bin", "jest"));
const jestArgs = ["--coverage", ...process.argv.slice(2)];

const result = spawnSync(process.execPath, [jestBin, ...jestArgs], {
  cwd: projectRoot,
  stdio: "inherit",
});

const lcovPath = path.join(projectRoot, "coverage", "lcov.info");

if (fs.existsSync(lcovPath)) {
  const lcov = fs.readFileSync(lcovPath, "utf8");

  const normalized = lcov
    .replace(/^SF:src\//gm, "SF:cloudshield/WebUI/src/")
    .replace(/^SF:\.\/src\//gm, "SF:cloudshield/WebUI/src/")
    .replace(/^SF:src\\/gm, "SF:cloudshield/WebUI/src/")
    .replace(/^SF:\.\\src\\/gm, "SF:cloudshield/WebUI/src/")
    .replace(/\\/g, "/");

  fs.writeFileSync(lcovPath, normalized, "utf8");

  const hasWebUiPrefixedPaths = normalized.includes("SF:cloudshield/WebUI/src/");
  console.log(
    `[coverage] normalized lcov paths for SonarCloud (webui-prefixed=${hasWebUiPrefixedPaths})`
  );
} else {
  console.log("[coverage] lcov.info not found; skipping lcov normalization");
}

if (result.error) {
  console.error("[coverage] jest execution error:", result.error.message);
}

process.exit(typeof result.status === "number" ? result.status : 1);
