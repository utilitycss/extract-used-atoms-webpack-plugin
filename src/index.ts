import postcss from "postcss";
import * as fs from "fs";
import { promisify } from "util";

const cssnano = require("cssnano");

const readFile = promisify(fs.readFile);

const RemoveUnused = postcss.plugin(
  "remove-unused",
  (hashes: string[]) => root => {
    root.walkRules(rule => {
      const shouldBeIncluded = hashes.some(hash =>
        rule.selector.includes(hash)
      );
      if (!shouldBeIncluded) {
        rule.remove();
      }
    });
  }
);

interface AtomUsage {
  name: string;
  used: string[];
  hashes: string[];
}

interface ExtractUsedAtomsOptions {
  scope: string;
  excluded: (string | RegExp)[];
  cssBundle: string;
  filename: string;
  minify: boolean;
}

class ExtractUsedAtoms {
  scope: string;
  scopeRE: RegExp;
  excluded: RegExp[];
  cssBundle: string;
  filename: string;
  minify: boolean;
  usages: AtomUsage[];
  hashes: string[];

  constructor(options: ExtractUsedAtomsOptions) {
    const {
      scope = "",
      excluded = [],
      cssBundle = "",
      filename = "used-atoms",
      minify = true
    } = options;

    this.scope = scope;
    this.scopeRE = new RegExp(`${scope}/`);
    this.excluded = excluded.concat(cssBundle).map(a => new RegExp(a));
    (this.cssBundle = cssBundle), (this.filename = filename);
    this.minify = minify;
    this.usages = [];
    this.hashes = [];
  }

  apply(compiler: any) {
    compiler.hooks.emit.tapAsync(
      "ExtractUsedAtoms",
      async (compilation: any, cb: () => void) => {
        compilation.chunks.forEach((chunk: any) => {
          chunk.getModules().forEach((module: any) => {
            if (
              module.type === "json" &&
              this.scopeRE.test(module.rawRequest) &&
              this.excluded.every(a => !a.test(module.rawRequest))
            ) {
              const name: string = module.rawRequest;
              const usedExports = module.usedExports || [];
              const used: string[] = usedExports.includes("default")
                ? usedExports
                    .concat(module.buildMeta.providedExports)
                    .filter((el: string) => el !== "default")
                : usedExports;
              const hashes = used.map(n => require(name)[n]);
              const moduleUsage = {
                name,
                used,
                hashes
              };
              this.usages.push(moduleUsage);
            }
          });
        });

        if (this.usages.length) {
          this.hashes = Array.from(
            this.usages.reduce((curr, next) => {
              next.hashes.forEach(hashStr => {
                hashStr.split(" ").forEach(hash => {
                  if (hash !== "") {
                    curr.add(hash);
                  }
                });
              });
              return curr;
            }, new Set())
          ) as string[];

          const css = await readFile(require.resolve(this.cssBundle), {
            encoding: "utf8"
          });

          const plugins = [RemoveUnused(this.hashes)];

          if (this.minify) {
            plugins.push(
              cssnano({
                preset: [
                  "advanced",
                  {
                    reduceIdents: false,
                    zindex: false,
                    discardComments: {
                      removeAll: true
                    }
                  }
                ]
              })
            );
          }

          const cssBundle = await postcss(plugins).process(css, {
            from: undefined
          });

          compilation.assets[`${this.filename}.css`] = {
            source: () => cssBundle.css,
            size: () => cssBundle.css.length
          };
        }
        cb();
      }
    );
  }
}

export default ExtractUsedAtoms;
