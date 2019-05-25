
module.exports = function (grunt) {
    require("load-grunt-tasks")(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        babel: {
            options: {
                presets: ["@babel/preset-env"]
            },
            all: {
                expand: true,
                cwd: "src/",
                src: "**/*.js",
                dest: "dist"
            }
        },

        bnf: {
            lib: {
                files: {
                    "dist/lib/ebnf.bnf.grammar.js": ["src/lib/ebnf.bnf"]
                }
            },
            examples: {
                files: {
                    "dist/examples/calc-scannerless/calc.bnf.grammar.js": ["src/examples/calc-scannerless/calc.bnf"],
                    "dist/examples/calc-with-regexp-scanner/calc.bnf.grammar.js": ["src/examples/calc-with-regexp-scanner/calc.bnf"]
                }
            }
        },

        ebnf: {
            examples_scannerless: {
                files: {
                    "dist/examples/calc-scannerless/calc.ebnf.grammar.js": ["src/examples/calc-scannerless/calc.ebnf"],
                    "dist/examples/calc-with-grammar-scanner/calc-terminals.ebnf.grammar.js": ["src/examples/calc-with-grammar-scanner/calc-terminals.ebnf"],
                    "dist/examples/json/json-terminals.ebnf.grammar.js": ["src/examples/json/json-terminals.ebnf"]
                }
            },
            examples_with_scanner: {
                options: {
                    scanner: true
                },
                files: {
                    "dist/examples/calc-with-regexp-scanner/calc.ebnf.grammar.js": ["src/examples/calc-with-regexp-scanner/calc.ebnf"],
                    "dist/examples/calc-with-grammar-scanner/calc.ebnf.grammar.js": ["src/examples/calc-with-grammar-scanner/calc.ebnf"],
                    "dist/examples/json/json.ebnf.grammar.js": ["src/examples/json/json.ebnf"]
                }
            }
        }
    });

    grunt.registerTask("default", ["babel", "bnf", "ebnf"]);

    grunt.registerMultiTask("bnf", function () {
        // We need to use explicit dependencies here.
        // index.js breaks since ebnf.bnf has not already been compiled.
        var core = require("./dist/lib/core");
        var bnf = require("./dist/lib/bnf");
        var logging = require("./dist/lib/logging");

        this.files.forEach(function (f) {
            var src = grunt.file.read(f.src[0]);
            var res = bnf.compile(src, this.options);
            if (res.error) {
                grunt.log.error(logging.error(src, res));
            }
            grunt.file.write(f.dest, core.stringify(res.data));
        }, this);
    });

    grunt.registerMultiTask("ebnf", function () {
        var persil = require("./");

        this.files.forEach(function (f) {
            var src = grunt.file.read(f.src[0]);
            var res = persil.ebnf.compile(src, this.options());
            if (res.error) {
                grunt.log.error(persil.error(src, res));
            }
            grunt.file.write(f.dest, persil.stringify(res.data));
        }, this);
    });
};
