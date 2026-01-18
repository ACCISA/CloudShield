var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { ipcMain, BrowserWindow, dialog, app } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "child_process";
var regeditRs = { exports: {} };
function commonjsRequire(path2) {
  throw new Error('Could not dynamically require "' + path2 + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var jsBinding = { exports: {} };
var hasRequiredJsBinding;
function requireJsBinding() {
  if (hasRequiredJsBinding) return jsBinding.exports;
  hasRequiredJsBinding = 1;
  const { readFileSync } = fs;
  let nativeBinding = null;
  const loadErrors = [], isMusl = () => {
    let e = false;
    return process.platform === "linux" && (e = isMuslFromFilesystem(), e === null && (e = isMuslFromReport()), e === null && (e = isMuslFromChildProcess())), e;
  }, isFileMusl = (e) => e.includes("libc.musl-") || e.includes("ld-musl-"), isMuslFromFilesystem = () => {
    try {
      return readFileSync("/usr/bin/ldd", "utf-8").includes("musl");
    } catch {
      return null;
    }
  }, isMuslFromReport = () => {
    var _a;
    let e = null;
    return typeof ((_a = process.report) == null ? void 0 : _a.getReport) == "function" && (process.report.excludeNetwork = true, e = process.report.getReport()), e ? e.header && e.header.glibcVersionRuntime ? false : !!(Array.isArray(e.sharedObjects) && e.sharedObjects.some(isFileMusl)) : null;
  }, isMuslFromChildProcess = () => {
    try {
      return require("child_process").execSync("ldd --version", { encoding: "utf8" }).includes("musl");
    } catch {
      return false;
    }
  };
  function requireNative() {
    var _a, _b, _c, _d;
    if (process.env.NAPI_RS_NATIVE_LIBRARY_PATH) try {
      return commonjsRequire(process.env.NAPI_RS_NATIVE_LIBRARY_PATH);
    } catch (e) {
      loadErrors.push(e);
    }
    else if (process.platform === "android") if (process.arch === "arm64") {
      try {
        return require("./regedit-rs.android-arm64.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-android-arm64"), r = require("regedit-rs-android-arm64/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else if (process.arch === "arm") {
      try {
        return require("./regedit-rs.android-arm-eabi.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-android-arm-eabi"), r = require("regedit-rs-android-arm-eabi/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else loadErrors.push(new Error(`Unsupported architecture on Android ${process.arch}`));
    else if (process.platform === "win32") if (process.arch === "x64") if (((_b = (_a = process.config) == null ? void 0 : _a.variables) == null ? void 0 : _b.shlib_suffix) === "dll.a" || ((_d = (_c = process.config) == null ? void 0 : _c.variables) == null ? void 0 : _d.node_target_type) === "shared_library") {
      try {
        return require("./regedit-rs.win32-x64-gnu.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-win32-x64-gnu"), r = require("regedit-rs-win32-x64-gnu/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else {
      try {
        return require("./regedit-rs.win32-x64-msvc.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-win32-x64-msvc"), r = require("regedit-rs-win32-x64-msvc/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    }
    else if (process.arch === "ia32") {
      try {
        return require("./regedit-rs.win32-ia32-msvc.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-win32-ia32-msvc"), r = require("regedit-rs-win32-ia32-msvc/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else if (process.arch === "arm64") {
      try {
        return require("./regedit-rs.win32-arm64-msvc.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-win32-arm64-msvc"), r = require("regedit-rs-win32-arm64-msvc/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else loadErrors.push(new Error(`Unsupported architecture on Windows: ${process.arch}`));
    else if (process.platform === "darwin") {
      try {
        return require("./regedit-rs.darwin-universal.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-darwin-universal"), r = require("regedit-rs-darwin-universal/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
      if (process.arch === "x64") {
        try {
          return require("./regedit-rs.darwin-x64.node");
        } catch (e) {
          loadErrors.push(e);
        }
        try {
          const e = require("regedit-rs-darwin-x64"), r = require("regedit-rs-darwin-x64/package.json").version;
          if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
          return e;
        } catch (e) {
          loadErrors.push(e);
        }
      } else if (process.arch === "arm64") {
        try {
          return require("./regedit-rs.darwin-arm64.node");
        } catch (e) {
          loadErrors.push(e);
        }
        try {
          const e = require("regedit-rs-darwin-arm64"), r = require("regedit-rs-darwin-arm64/package.json").version;
          if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
          return e;
        } catch (e) {
          loadErrors.push(e);
        }
      } else loadErrors.push(new Error(`Unsupported architecture on macOS: ${process.arch}`));
    } else if (process.platform === "freebsd") if (process.arch === "x64") {
      try {
        return require("./regedit-rs.freebsd-x64.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-freebsd-x64"), r = require("regedit-rs-freebsd-x64/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else if (process.arch === "arm64") {
      try {
        return require("./regedit-rs.freebsd-arm64.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-freebsd-arm64"), r = require("regedit-rs-freebsd-arm64/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else loadErrors.push(new Error(`Unsupported architecture on FreeBSD: ${process.arch}`));
    else if (process.platform === "linux") if (process.arch === "x64") if (isMusl()) {
      try {
        return require("./regedit-rs.linux-x64-musl.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-linux-x64-musl"), r = require("regedit-rs-linux-x64-musl/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else {
      try {
        return require("./regedit-rs.linux-x64-gnu.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-linux-x64-gnu"), r = require("regedit-rs-linux-x64-gnu/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    }
    else if (process.arch === "arm64") if (isMusl()) {
      try {
        return require("./regedit-rs.linux-arm64-musl.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-linux-arm64-musl"), r = require("regedit-rs-linux-arm64-musl/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else {
      try {
        return require("./regedit-rs.linux-arm64-gnu.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-linux-arm64-gnu"), r = require("regedit-rs-linux-arm64-gnu/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    }
    else if (process.arch === "arm") if (isMusl()) {
      try {
        return require("./regedit-rs.linux-arm-musleabihf.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-linux-arm-musleabihf"), r = require("regedit-rs-linux-arm-musleabihf/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else {
      try {
        return require("./regedit-rs.linux-arm-gnueabihf.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-linux-arm-gnueabihf"), r = require("regedit-rs-linux-arm-gnueabihf/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    }
    else if (process.arch === "loong64") if (isMusl()) {
      try {
        return require("./regedit-rs.linux-loong64-musl.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-linux-loong64-musl"), r = require("regedit-rs-linux-loong64-musl/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else {
      try {
        return require("./regedit-rs.linux-loong64-gnu.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-linux-loong64-gnu"), r = require("regedit-rs-linux-loong64-gnu/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    }
    else if (process.arch === "riscv64") if (isMusl()) {
      try {
        return require("./regedit-rs.linux-riscv64-musl.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-linux-riscv64-musl"), r = require("regedit-rs-linux-riscv64-musl/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else {
      try {
        return require("./regedit-rs.linux-riscv64-gnu.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-linux-riscv64-gnu"), r = require("regedit-rs-linux-riscv64-gnu/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    }
    else if (process.arch === "ppc64") {
      try {
        return require("./regedit-rs.linux-ppc64-gnu.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-linux-ppc64-gnu"), r = require("regedit-rs-linux-ppc64-gnu/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else if (process.arch === "s390x") {
      try {
        return require("./regedit-rs.linux-s390x-gnu.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-linux-s390x-gnu"), r = require("regedit-rs-linux-s390x-gnu/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else loadErrors.push(new Error(`Unsupported architecture on Linux: ${process.arch}`));
    else if (process.platform === "openharmony") if (process.arch === "arm64") {
      try {
        return require("./regedit-rs.openharmony-arm64.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-openharmony-arm64"), r = require("regedit-rs-openharmony-arm64/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else if (process.arch === "x64") {
      try {
        return require("./regedit-rs.openharmony-x64.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-openharmony-x64"), r = require("regedit-rs-openharmony-x64/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else if (process.arch === "arm") {
      try {
        return require("./regedit-rs.openharmony-arm.node");
      } catch (e) {
        loadErrors.push(e);
      }
      try {
        const e = require("regedit-rs-openharmony-arm"), r = require("regedit-rs-openharmony-arm/package.json").version;
        if (r !== "1.0.3" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 1.0.3 but got ${r}. You can reinstall dependencies to fix this issue.`);
        return e;
      } catch (e) {
        loadErrors.push(e);
      }
    } else loadErrors.push(new Error(`Unsupported architecture on OpenHarmony: ${process.arch}`));
    else loadErrors.push(new Error(`Unsupported OS: ${process.platform}, architecture: ${process.arch}`));
  }
  if (nativeBinding = requireNative(), !nativeBinding || process.env.NAPI_RS_FORCE_WASI) {
    let e = null, r = null;
    try {
      e = require("./regedit-rs.wasi.cjs"), nativeBinding = e;
    } catch (i) {
      process.env.NAPI_RS_FORCE_WASI && (r = i);
    }
    if (!nativeBinding) try {
      e = require("regedit-rs-wasm32-wasi"), nativeBinding = e;
    } catch (i) {
      process.env.NAPI_RS_FORCE_WASI && (r.cause = i, loadErrors.push(i));
    }
    if (process.env.NAPI_RS_FORCE_WASI === "error" && !e) {
      const i = new Error("WASI binding not found and NAPI_RS_FORCE_WASI is set to error");
      throw i.cause = r, i;
    }
  }
  if (!nativeBinding) throw loadErrors.length > 0 ? new Error("Cannot find native binding. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828). Please try `npm i` again after removing both package-lock.json and node_modules directory.", { cause: loadErrors.reduce((e, r) => (r.cause = e, r)) }) : new Error("Failed to load native binding");
  jsBinding.exports = nativeBinding, jsBinding.exports.createKey = nativeBinding.createKey, jsBinding.exports.deleteKey = nativeBinding.deleteKey, jsBinding.exports.deleteValue = nativeBinding.deleteValue, jsBinding.exports.list = nativeBinding.list, jsBinding.exports.putValue = nativeBinding.putValue, jsBinding.exports.RegistryType = nativeBinding.RegistryType;
  return jsBinding.exports;
}
regeditRs.exports;
(function(module) {
  function loadNativeBinding() {
    try {
      const binding = requireJsBinding();
      return binding;
    } catch (error) {
      const registeryType = {};
      return {
        RegistryType: registeryType,
        list: () => {
          throw error;
        },
        createKey: () => {
          throw error;
        },
        putValue: () => {
          throw error;
        },
        deleteKey: () => {
          throw error;
        },
        deleteValue: () => {
          throw error;
        }
      };
    }
  }
  const { RegistryType, list: _list, createKey: _createKey, putValue: _putValue, deleteKey: _deleteKey, deleteValue: _deleteValue } = loadNativeBinding();
  module.exports.RegistryType = RegistryType;
  function szBufferToString(buffer) {
    const string = buffer.toString("ucs-2");
    if (string[string.length - 1] !== "\0") {
      return string;
    }
    return string.substring(0, string.length - 1);
  }
  class RegistryItemValue {
    static valueToBuffer(value) {
      return Buffer.from(value);
    }
    static bufferToValue(buffer) {
      return buffer;
    }
    constructor(buffer, type) {
      this.rawValue = Buffer.isBuffer(buffer) ? buffer : this.constructor.valueToBuffer(buffer);
      this.type = type;
    }
    get value() {
      return this.constructor.bufferToValue(this.rawValue);
    }
  }
  class RegSzValue extends RegistryItemValue {
    static valueToBuffer(value) {
      return Buffer.from(value, "ucs-2");
    }
    static bufferToValue(buffer) {
      return szBufferToString(buffer);
    }
    constructor(buffer) {
      super(buffer, RegistryType.RegSz);
    }
  }
  class RegExpandSzValue extends RegistryItemValue {
    static valueToBuffer(value) {
      return Buffer.from(value, "ucs-2");
    }
    static bufferToValue(buffer) {
      return szBufferToString(buffer);
    }
    constructor(buffer) {
      super(buffer, RegistryType.RegExpandSz);
    }
    get expandedValue() {
      return this.value.replace(/%([^%]+)%/g, (_, n) => process.env[n]);
    }
  }
  class RegDwordValue extends RegistryItemValue {
    static valueToBuffer(value) {
      const buffer = Buffer.alloc(4);
      buffer.writeInt32LE(value, 0);
      return buffer;
    }
    static bufferToValue(buffer) {
      return buffer.readInt32LE(0);
    }
    constructor(buffer) {
      super(buffer, RegistryType.RegDword);
    }
  }
  class RegQwordValue extends RegistryItemValue {
    static valueToBuffer(value) {
      const buffer = Buffer.alloc(8);
      buffer.writeBigInt64LE(value, 0);
      return buffer;
    }
    static bufferToValue(buffer) {
      return buffer.readBigInt64LE(0);
    }
    constructor(buffer) {
      super(buffer, RegistryType.RegQword);
    }
  }
  class RegMultiSzValue extends RegistryItemValue {
    static valueToBuffer(value) {
      return Buffer.from(value.join("\0"), "ucs-2");
    }
    static bufferToValue(buffer) {
      return szBufferToString(buffer).split("\0");
    }
    constructor(buffer) {
      super(buffer, RegistryType.RegMultiSz);
    }
  }
  class RegBinaryValue extends RegistryItemValue {
    static valueToBuffer(value) {
      return Buffer.from(value);
    }
    static bufferToValue(buffer) {
      return buffer;
    }
    constructor(buffer) {
      super(buffer, RegistryType.RegBinary);
    }
  }
  class RegNoneValue extends RegistryItemValue {
    static valueToBuffer(value) {
      return Buffer.from(value);
    }
    static bufferToValue(buffer) {
      return buffer;
    }
    constructor(buffer) {
      super(buffer, RegistryType.RegNone);
    }
  }
  class RegLinkValue extends RegistryItemValue {
    static valueToBuffer(value) {
      return Buffer.from(value, "ucs-2");
    }
    static bufferToValue(buffer) {
      return szBufferToString(buffer);
    }
    constructor(buffer) {
      super(buffer, RegistryType.RegLink);
    }
  }
  class RegResourceListValue extends RegistryItemValue {
    static valueToBuffer(value) {
      return Buffer.from(value);
    }
    static bufferToValue(buffer) {
      return buffer;
    }
    constructor(buffer) {
      super(buffer, RegistryType.RegResourceList);
    }
  }
  class RegFullResourceDescriptorValue extends RegistryItemValue {
    static valueToBuffer(value) {
      return Buffer.from(value);
    }
    static bufferToValue(buffer) {
      return buffer;
    }
    constructor(buffer) {
      super(buffer, RegistryType.RegFullResourceDescriptor);
    }
  }
  class RegResourceRequirementsListValue extends RegistryItemValue {
    static valueToBuffer(value) {
      return Buffer.from(value);
    }
    static bufferToValue(buffer) {
      return buffer;
    }
    constructor(buffer) {
      super(buffer, RegistryType.RegResourceRequirementsList);
    }
  }
  class RegDwordBigEndianValue extends RegistryItemValue {
    static valueToBuffer(value) {
      const buffer = Buffer.alloc(4);
      buffer.writeInt32BE(value, 0);
      return buffer;
    }
    static bufferToValue(buffer) {
      return buffer.readInt32BE(0);
    }
    constructor(buffer) {
      super(buffer, RegistryType.RegDwordBigEndian);
    }
  }
  const _RegistryItemValueMapper = class _RegistryItemValueMapper {
    static from(value, type) {
      const registryValueClass = _RegistryItemValueMapper.registryTypeToClass[type];
      if (!registryValueClass) {
        throw new Error(`Unknown registry type ${type}`);
      }
      return new registryValueClass(value);
    }
  };
  __publicField(_RegistryItemValueMapper, "registryTypeToClass", {
    [RegistryType.RegSz]: RegSzValue,
    [RegistryType.RegExpandSz]: RegExpandSzValue,
    [RegistryType.RegDword]: RegDwordValue,
    [RegistryType.RegQword]: RegQwordValue,
    [RegistryType.RegMultiSz]: RegMultiSzValue,
    [RegistryType.RegBinary]: RegBinaryValue,
    [RegistryType.RegNone]: RegNoneValue,
    [RegistryType.RegLink]: RegLinkValue,
    [RegistryType.RegResourceList]: RegResourceListValue,
    [RegistryType.RegFullResourceDescriptor]: RegFullResourceDescriptorValue,
    [RegistryType.RegResourceRequirementsList]: RegResourceRequirementsListValue,
    [RegistryType.RegDwordBigEndian]: RegDwordBigEndianValue
  });
  let RegistryItemValueMapper = _RegistryItemValueMapper;
  module.exports.RegistryItemValue = RegistryItemValue;
  module.exports.RegistryItemValueMapper = RegistryItemValueMapper;
  module.exports.RegSzValue = RegSzValue;
  module.exports.RegExpandSzValue = RegExpandSzValue;
  module.exports.RegDwordValue = RegDwordValue;
  module.exports.RegQwordValue = RegQwordValue;
  module.exports.RegMultiSzValue = RegMultiSzValue;
  module.exports.RegBinaryValue = RegBinaryValue;
  module.exports.RegNoneValue = RegNoneValue;
  module.exports.RegLinkValue = RegLinkValue;
  module.exports.RegResourceListValue = RegResourceListValue;
  module.exports.RegFullResourceDescriptorValue = RegFullResourceDescriptorValue;
  module.exports.RegResourceRequirementsListValue = RegResourceRequirementsListValue;
  module.exports.RegDwordBigEndianValue = RegDwordBigEndianValue;
  module.exports.listSync = function(keys) {
    const res = _list(keys);
    for (const key in res) {
      const registryItem = res[key];
      if (!registryItem.exists) {
        continue;
      }
      for (const value in registryItem.values) {
        const registryValue = registryItem.values[value];
        registryItem.values[value] = RegistryItemValueMapper.from(registryValue.rawValue, registryValue.vtype);
      }
    }
    return res;
  };
  module.exports.createKeySync = function(keys) {
    return _createKey(keys);
  };
  module.exports.putValueSync = function(putCollection) {
    const parsedCollection = {};
    for (const key in putCollection) {
      const registryItem = putCollection[key];
      for (const value in registryItem) {
        const registryValue = registryItem[value];
        parsedCollection[key] = parsedCollection[key] || {};
        parsedCollection[key][value] = {
          rawValue: registryValue.rawValue,
          vtype: registryValue.type
        };
      }
    }
    return _putValue(parsedCollection);
  };
  module.exports.deleteKeySync = function(keys) {
    return _deleteKey(keys);
  };
  module.exports.deleteValueSync = function(deleteCollection) {
    return _deleteValue(deleteCollection);
  };
  module.exports.list = async function(keys) {
    return new Promise((resolve, reject) => {
      try {
        const res = module.exports.listSync(keys);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    });
  };
  module.exports.createKey = async function(keys) {
    return new Promise((resolve, reject) => {
      try {
        const res = module.exports.createKeySync(keys);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    });
  };
  module.exports.putValue = async function(putCollection) {
    return new Promise((resolve, reject) => {
      try {
        const res = module.exports.putValueSync(putCollection);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    });
  };
  module.exports.deleteKey = async function(keys) {
    return new Promise((resolve, reject) => {
      try {
        const res = module.exports.deleteKeySync(keys);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    });
  };
  module.exports.deleteValue = async function(deleteCollection) {
    return new Promise((resolve, reject) => {
      try {
        const res = module.exports.deleteValueSync(deleteCollection);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    });
  };
})(regeditRs);
var regeditRsExports = regeditRs.exports;
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
const getWinOVPNPath = async () => {
  const res = await regeditRsExports.list(["HKLM\\SOFTWARE\\OpenVPN"]);
  if (!res["HKLM\\SOFTWARE\\OpenVPN"].exists) {
    return { success: false, message: "OpenVPN is not installed.", path: null };
  }
  const exePath = res["HKLM\\SOFTWARE\\OpenVPN"].values["exe_path"].value;
  if (!fs.existsSync(exePath)) {
    return {
      success: false,
      message: "OpenVPN executable not found.",
      path: null
    };
  }
  return { success: true, message: "OpenVPN is installed.", path: exePath };
};
ipcMain.handle("get-win-ovpn-path", async () => {
  return getWinOVPNPath();
});
const getBinPath = (exeName) => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "bin", exeName);
  }
  const platform = process.platform === "win32" ? "win" : process.platform === "darwin" ? "mac" : "linux";
  return path.join(
    __dirname$1,
    "..",
    "..",
    "resources",
    "bin",
    platform,
    exeName
  );
};
ipcMain.handle(
  "run-openvpn",
  async (_event, params = {
    ovpnPath: ""
  }) => {
    return new Promise(async (resolve, reject) => {
      var _a, _b;
      try {
        if (!fs.existsSync(params.ovpnPath)) {
          return reject(
            new Error(`OpenVPN config not found: ${params.ovpnPath}`)
          );
        }
        let command = "openvpn";
        if (process.platform === "win32") {
          let winOVPN = await getWinOVPNPath();
          if (winOVPN.success) {
            command = winOVPN.path;
          } else {
            return reject(new Error(winOVPN.message));
          }
        }
        const child = spawn(command, [params.ovpnPath], {
          stdio: "inherit"
        });
        let output = "";
        let error = "";
        resolve({
          success: true,
          pid: child.pid,
          message: `OpenVPN launched with config ${params.ovpnPath}`
        });
        (_a = child.stdout) == null ? void 0 : _a.on("data", (data) => {
          output += data.toString();
          console.log(output);
        });
        (_b = child.stderr) == null ? void 0 : _b.on("data", (data) => {
          error += data.toString();
          console.log("[openvpn stderr]:", data.toString());
        });
        child.on("close", (code) => {
          if (code !== 0) {
            console.log(`[openvpn] Process exited with code ${code}`);
            if (error) console.log("[openvpn error output]:", error);
          }
        });
        child.on("error", (err) => {
          console.error("[openvpn spawn error]:", err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
);
ipcMain.handle("show-open-dialog", async (_event, options) => {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused) return await dialog.showOpenDialog(focused, options);
  return await dialog.showOpenDialog(options);
});
ipcMain.handle(
  "run-xfreerdp",
  async (_event, params) => {
    return new Promise((resolve, reject) => {
      var _a, _b;
      try {
        const isWin = process.platform === "win32";
        const exeName = isWin ? "wfreerdp.exe" : "xfreerdp3";
        let exePath = exeName;
        if (isWin) {
          const candidate = getBinPath(exeName);
          if (fs.existsSync(candidate)) exePath = candidate;
          else if (!fs.existsSync(candidate))
            return reject(
              new Error(`Bundled xfreerdp not found at ${candidate}`)
            );
        }
        const child = spawn(exePath, [
          `/u:${params.username}`,
          `/p:${params.password}`,
          `/v:${params.ip}`,
          "/cert:tofu"
        ]);
        let output = "";
        let error = "";
        resolve({
          success: true,
          pid: child.pid,
          message: "xfreerdp3 launched"
        });
        (_a = child.stdout) == null ? void 0 : _a.on("data", (data) => {
          output += data.toString();
        });
        (_b = child.stderr) == null ? void 0 : _b.on("data", (data) => {
          error += data.toString();
          console.log("[xfreerdp3 stderr]:", data.toString());
        });
        child.on("close", (code) => {
          if (code !== 0) {
            console.log(`[xfreerdp3] Process exited with code ${code}`);
            if (error) console.log("[xfreerdp3 error output]:", error);
          }
        });
        child.on("error", (err) => {
          console.error("[xfreerdp3 spawn error]:", err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL,
  getBinPath
};
