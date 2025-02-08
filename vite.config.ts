import * as fs from "fs/promises";
import * as Vite from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tsconfigPaths from "vite-tsconfig-paths";
import { checker } from "vite-plugin-checker";
import esbuild from "esbuild";
import * as path from "path";
import { findFoundryHost, findManifestJSON } from "./utils";
import {exec} from "child_process";

export type PackageType = "module" | "system" | "world";

const packageType: PackageType = "module";

// The package name should be the same as the name in the `module.json`/`system.json` file.
const packageID: string = "eunos-kult-hacks";

const manifestJSONPath = await findManifestJSON(packageType);

const filesToCopy = [
  manifestJSONPath



]; // Feel free to change me.

const devServerPort = 30001;
const scriptsEntrypoint = "./src/module/eunos-kult-hacks.ts";
const stylesEntrypoint = "./src/styles/styles.scss";
const NUM_CHROME_PROFILES = parseInt(process.env["NUM_CHROME_PROFILES"] ?? "1", 10);

// @ts-expect-error the types are set to invalid values to ensure the user sets them.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (packageType == "REPLACE ME" || packageID == "REPLACE ME") {
  throw new Error(
    `Must set the "packageType" and the "packageID" variables in vite.config.ts`,
  );
}

const foundryHostData = await findFoundryHost();
const foundryHost = foundryHostData.host;

const foundryPackagePath = getFoundryPackagePath(packageType, packageID);

// await symlinkFoundryPackage(packageType, packageID, foundryHostData);

/**
 * Custom plugin to open one or more Chrome profiles with specific flags when the Vite server starts.
 */
function openChromePlugin(): Vite.Plugin {
  return {
    name:  "open-chrome",
    apply: "serve", // Only apply this plugin during development
    configResolved(chromeConfig) {
      if (chromeConfig.command === "serve") {
        for (let i = 0; i < NUM_CHROME_PROFILES; i++) {
          const command = `start chrome --start-maximized --remote-debugging-port=${String(9222+i)} --auto-open-devtools-for-tabs --user-data-dir="D:/Projects/.CODING/FoundryVTT/ChromeDevProfile_${String(i+1)}" http://localhost:${String(chromeConfig.server.port)}`;
          exec(command, (error) => {
            if (error) {
              console.error(`Failed to open Chrome instance #${String(i+1)}:`, error);
            }
          });
        }
      }
    }
  };
}

const config = Vite.defineConfig(({ command, mode }): Vite.UserConfig => {
  const buildMode = mode === "production" ? "production" : "development";
  const outDir = "dist";

  const plugins: Vite.PluginOption[] = [
    checker({ typescript: { buildMode: true } }),
    tsconfigPaths(),
    foundryEntrypointsPlugin(),
    openChromePlugin(),
  ];

  // Handle minification after build to allow for tree-shaking and whitespace minification
  // "Note the build.minify option does not minify whitespaces when using the 'es' format in lib mode, as it removes
  // pure annotations and breaks tree-shaking."
  if (buildMode === "production") {
    plugins.push(
      minifyPlugin(),
      viteStaticCopy({
        targets: filesToCopy.map((file) => ({
          src: file,
          dest: path.dirname(file),
        })),
        silent: true,
      }),
    );
  } else {
    plugins.push(foundryHMRPlugin());
  }

  return {
    base: command === "build" ? "./" : `/${foundryPackagePath}`,
    publicDir: "static",
    build: {
      outDir,
      sourcemap: buildMode === "development",
      lib: {
        name: packageID,
        // This file is substituted out with the real entrypoint in the foundryEntrypointsPlugin
        entry: "fake-entrypoint.js",
        formats: ["es"],
        fileName: "eunos-kult-hacks",
      },
      target: "es2023",
      rollupOptions: {
        output: {
          assetFileNames: ({ names }): string => {
            if (names.includes("eunos-kult-hacks.css")) {
              return "styles.css";
            }

            return "assets/[name]-[hash][extname]";
          },
        },
      },
    },
    optimizeDeps: {
      entries: [],
    },
    server: {
      port: devServerPort,
      open: false,
      proxy: {
        [`^(?!/${escapeRegExp(foundryPackagePath)})`]: `http://${foundryHost}`,
        "/socket.io": {
          target: `ws://${foundryHost}`,
          ws: true,
        },
      },
    },
    plugins,
  };
});

function foundryEntrypointsPlugin(): Vite.Plugin {
  const manifestPrefix = "\0virtual:foundry/";
  const jsFile = `${manifestPrefix}eunos-kult-hacks.js`;
  const stylesFile = `${manifestPrefix}styles.css?url`;

  let config: Vite.ResolvedConfig;
  return {
    name: "manifest",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    resolveId(source, _importer, options) {
      if (options.isEntry) {
        return jsFile;
      }

      if (source === "/eunos-kult-hacks.js") {
        return jsFile;
      }

      if (source === "/styles.css") {
        return stylesFile;
      }
    },
    async load(id) {
      if (id === jsFile) {
        const scriptsModule = await this.resolve(scriptsEntrypoint);
        if (!scriptsModule) {
          throw new Error(
            `Could not resolve entrypoint: ${JSON.stringify(scriptsEntrypoint)}`,
          );
        }

        let imports = `import ${JSON.stringify(scriptsModule.id)};`;

        // During building there isn't a reference to the css file so it must be imported in the
        // entrypoint manually.
        if (config.command === "build") {
          const stylesModule = await this.resolve(stylesEntrypoint);
          if (!stylesModule) {
            throw new Error(
              `Could not resolve entrypoint: ${JSON.stringify(stylesEntrypoint)}`,
            );
          }

          const stylesID = stylesModule.id;
          imports += `\nimport ${JSON.stringify(stylesID)}`;
        }

        return imports;
      }

      if (id === stylesFile) {
        return `/*
 * This file is intentionally blank.
 * Vite automatically injects the styles into the DOM and performs hot module reload.
 */`;
      }
    },
  };
}

// Credit to PF2e's vite.config.ts for this https://github.com/foundryvtt/pf2e/blob/master/vite.config.ts
function minifyPlugin(): Vite.Plugin {
  return {
    name: "minify",
    config() {
      // If https://github.com/vitejs/vite/issues/2830 is addressed then CSS minification can be enabled.
      return {
        build: {
          minify: false,
        },
      };
    },
    renderChunk: {
      order: "post",
      async handler(code) {
        return esbuild.transform(code, {
          keepNames: true,
          minifyIdentifiers: false,
          minifySyntax: true,
          minifyWhitespace: true,
        });
      },
    },
  };
}

function getFoundryPackagePath(packageType: PackageType, packageID: string) {
  // Foundry puts a package at the path `/modules/module-name`, `/systems/system-name`, or `/worlds/world-name`.
  return `${packageType}s/${packageID}/`;
}

// Escapes all RegExp meta-characters like .
function escapeRegExp(unescaped: string): string {
  return unescaped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// TODO: Make this more agnostic to the organizational folders.
function foundryHMRPlugin(): Vite.Plugin {
  // Vite HMR is only preconfigured for css files: add handler for HBS and lang files
  return {
    name: "hmr-handler",
    apply: "serve",
    async handleHotUpdate(context) {
      const { outDir } = context.server.config.build;

      if (context.file.startsWith(outDir)) return;

      const baseName = path.basename(context.file);
      const extension = path.extname(context.file);

      if (baseName === "en.json") {
        const basePath = context.file.slice(context.file.indexOf("lang/"));
        console.log(`Updating lang file at ${basePath}`);

        await fs.copyFile(context.file, `${outDir}/${basePath}`);

        context.server.ws.send({
          type: "custom",
          event: "lang-update",
          data: { path: `${foundryPackagePath}/${basePath}` },
        });

        return;
      }

      if (extension === ".hbs") {
        const basePath = context.file.slice(context.file.indexOf("templates/"));
        console.log(`Updating template file at ${basePath}`);

        await fs.copyFile(context.file, `${outDir}/${basePath}`);

        context.server.ws.send({
          type: "custom",
          event: "template-update",
          data: { path: `${foundryPackagePath}/${basePath}` },
        });

        return;
      }
    },
  };
}

export default config;
