
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
                    "dist/demo/calc-scannerless/calc.bnf.grammar.js": ["src/demo/calc-scannerless/calc.bnf"]
                }
            }
        },

        ebnf: {
            demo: {
                files: {
                    "dist/demo/calc-scannerless/calc.ebnf.grammar.js": ["src/demo/calc-scannerless/calc.ebnf"]
                }
            }
        }
    });

    grunt.registerTask("default", ["babel", "bnf", "ebnf"]);

    grunt.registerMultiTask("bnf", function () {
        // We need to use explicit dependencies here.
        // index.js breaks since ebnf.bnf has not already been compiled.
        var persil = require("./dist/lib/persil");
        var bnf = require("./dist/lib/bnf");
        var logging = require("./dist/lib/logging");

        this.files.forEach(function (f) {
            var src = grunt.file.read(f.src[0]);
            var res = bnf.compile(src);
            if (res.error) {
                grunt.log.error(logging.error(src, res));
            }
            grunt.file.write(f.dest, persil.stringify(res.data));
        });
    });

    grunt.registerMultiTask("ebnf", function () {
        var persil = require("./");

        this.files.forEach(function (f) {
            var src = grunt.file.read(f.src[0]);
            var res = persil.ebnf.compile(src);
            if (res.error) {
                grunt.log.error(persil.error(src, res));
            }
            grunt.file.write(f.dest, persil.stringify(res.data));
        });
    });
};
