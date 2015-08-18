
module.exports = function (grunt) {
    require("load-grunt-tasks")(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        babel: {
            all: {
                expand: true,
                cwd: "src/",
                src: "**/*.js",
                dest: "build"
            }
        },

        bnf: {
            lib: {
                files: {
                    "build/lib/ebnf.bnf.grammar.js": ["src/lib/ebnf.bnf"]
                }
            },
            demo: {
                files: {
                    "build/demo/calc.bnf.grammar.js": ["src/demo/calc.bnf"]
                }
            }
        },

        ebnf: {
            demo: {
                files: {
                    "build/demo/calc.ebnf.grammar.js": ["src/demo/calc.ebnf"]
                }
            }
        }
    });

    grunt.registerTask("default", ["babel", "bnf", "ebnf"]);

    grunt.registerMultiTask("bnf", function () {
        var bnf = require("./build/lib/bnf");
        var persil = require("./build/lib/persil");
        var logging = require("./build/lib/logging");

        this.files.forEach(function (f) {
            var src = grunt.file.read(f.src[0]);
            var res = bnf.compile(src);
            if (res.error) {
                grunt.log.error(logging.message(src, res));
            }
            grunt.file.write(f.dest, persil.stringify(res.data));
        });
    });

    grunt.registerMultiTask("ebnf", function () {
        var ebnf = require("./build/lib/ebnf");
        var persil = require("./build/lib/persil");
        var logging = require("./build/lib/logging");

        this.files.forEach(function (f) {
            var src = grunt.file.read(f.src[0]);
            var res = ebnf.compile(src);
            if (res.error) {
                grunt.log.error(logging.message(src, res));
            }
            grunt.file.write(f.dest, persil.stringify(res.data));
        });
    });
};