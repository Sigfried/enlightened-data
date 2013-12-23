module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      './dist/supergroupBundled.js': [
        'bundle.js'
        ,'./supergroup'
        ,'./bower_components/underscore/underscore-min.js'
        ,'./bower_components/1670507/underscoreAddon.js'
        ,'./bower_components/underscore-unchained/src/underscore-unchained.js'
      ]
      , options: { 
            debug: true
          , s: true 
          , transform: ['debowerify', 'decomponentify', 'deamdify', 'deglobalify'],
      }
    },
    watch: {
      files: [ './supergroup.js',"./README.md"],
      tasks: [ 'browserify' ]
    },
    groc: {
        javascript: [
            "./supergroup.js", "README.md"
        ],
        options: {
            "out": "doc/"
        }
    },
    jshint: {
        all: ['Gruntfile.js', './*.js', 'test/**/*.js']
        , options: { laxcomma: true }
        //,environments: ['node']
    }
  });
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-groc');
  grunt.registerTask('default', ['browserify', 'jshint', 'groc']);
};
