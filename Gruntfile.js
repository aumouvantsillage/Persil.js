
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
                    "dist/demo/calc.bnf.grammar.js": ["src/demo/calc.bnf"]
                }
            }
        },

        ebnf: {
            demo: {
                files: {
                    "dist/demo/calc.ebnf.grammar.js": ["src/demo/calc.ebnf"]
                }
            }
        }
    });

    grunt.registerTask("default", ["babel", "bnf", "ebnf"]);

    grunt.registerMultiTask("bnf", function () {
        var persil = require("./");

        this.files.forEach(function (f) {
            var src = grunt.file.read(f.src[0]);
            var res = persil.bnf.compile(src);
            if (res.error) {
                grunt.log.error(persil.error(src, res));
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
