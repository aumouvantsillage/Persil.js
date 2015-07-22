
module.exports = function (grunt) {
    require("load-grunt-tasks")(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        babel: {
            earley: {
                expand: true,
                cwd: "src/",
                src: "**/*.js",
                dest: "build"
            }
        }
    });

    grunt.registerTask("default", ["babel"]);
};