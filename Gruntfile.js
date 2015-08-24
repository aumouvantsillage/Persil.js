
module.exports = function (grunt) {
    require("load-grunt-tasks")(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        babel: {
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
            demo: {
                files: {
                    "dist/demo/calc-scannerless/calc.bnf.grammar.js": ["src/demo/calc-scannerless/calc.bnf"],
                    "dist/demo/calc-with-default-scanner/calc.bnf.grammar.js": ["src/demo/calc-with-default-scanner/calc.bnf"]
                }
            }
        },

        ebnf: {
            demo_scannerless: {
                files: {
                    "dist/demo/calc-scannerless/calc.ebnf.grammar.js": ["src/demo/calc-scannerless/calc.ebnf"],
                    "dist/demo/calc-with-custom-scanner/calc-scanner.ebnf.grammar.js": ["src/demo/calc-with-custom-scanner/calc-scanner.ebnf"]
                }
            },
            demo_with_scanner: {
                options: {
                    scanner: true
                },
                files: {
                    "dist/demo/calc-with-default-scanner/calc.ebnf.grammar.js": ["src/demo/calc-with-default-scanner/calc.ebnf"],
                    "dist/demo/calc-with-custom-scanner/calc.ebnf.grammar.js": ["src/demo/calc-with-custom-scanner/calc.ebnf"]
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
