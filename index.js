/*
 * ghost-helm
 * https://github.com/masondesu/ghost-helm
 *
 * Copyright (c) 2014 Mason Stewart
 * Licensed under the MIT license.
 */

'use strict';

// Hey!

//                           _               
//    ________  ____ ___  __(_)_______  _____
//   / ___/ _ \/ __ `/ / / / / ___/ _ \/ ___/
//  / /  /  __/ /_/ / /_/ / / /  /  __(__  ) 
// /_/   \___/\__, /\__,_/_/_/   \___/____/  
//              /_/                          

var gulp = require('gulp'),
    plumber = require('gulp-plumber'),
    exec = require('child_process').exec,
    assign  = require("lodash.assign"),
    Q = require('q'),
    $ = require('gulp-load-plugins')(),
    // the defaults
    defaults = {
      distDir: 'dist',

      templatesDir: 'test/fixtures/templates/pages/**/*',
      templatesBaseDir: 'test/fixtures/templates',
      templatesDistDir: 'test/.tmp',

      stylesDir: 'app/styles/main.scss',
      stylesDistDir: '.tmp/styles',

      jsDir: 'app/scripts/**/*.js',

      assetBuildDir: '.tmp/**/*.html',
      userefSearchPath: ['app','.tmp'],

      imagesDir: ['app/images/**/*', 'app/bower_components/ghost-shield/dist/images/**/*'],
      imagesDistDir: 'dist/images',

      fontDir: ['app/bower_components/ghost-shield/dist/webfonts/*'],

      cname: 'CNAME',

      sitemapDir: 'dist/**/*.html',
      siteUrl: 'http://theironyard.com',

      cleanDir: ['.tmp', 'dist'],

      // deployCommand: 'sh deploy.sh',
      deployCommand: 'ls',
    };

module.exports.setup = function(config, outerGulp){
  // Overrite defaults with user config properties
  config = config || {};
  config = assign(defaults, config);


  //    __                       __      __           
  //   / /____  ____ ___  ____  / /___ _/ /____  _____
  //  / __/ _ \/ __ `__ \/ __ \/ / __ `/ __/ _ \/ ___/
  // / /_/  __/ / / / / / /_/ / / /_/ / /_/  __(__  ) 
  // \__/\___/_/ /_/ /_/ .___/_/\__,_/\__/\___/____/  
  //                  /_/                             

  // Let's take all of the jade templates and markdown files, pre-process them,
  // and story them in .tmp
  gulp.task('templates', ['clean'], function() {
    return gulp.src(config.templatesDir)
    .pipe($.if('**/*.jade', $.jade({
        basedir: config.templatesBaseDir,
        pretty: true
      })))
    .pipe($.if('**/*.md', $.markdown()))

    .pipe(gulp.dest(config.templatesDistDir));
  });


  //          __        __         
  //    _____/ /___  __/ /__  _____
  //   / ___/ __/ / / / / _ \/ ___/
  //  (__  ) /_/ /_/ / /  __(__  ) 
  // /____/\__/\__, /_/\___/____/  
  //          /____/               

  // Let's crunch *local* styles (non-ghost-shield) 
  // in app/styles/main.scss and put them .tmp/styles
  gulp.task('styles', ['clean'], function () {
    return gulp.src(config.stylesDir)
      .pipe($.sass({
        // gulp-sass was blowing up without the next two line
        sourceComments: 'map', 
        sourceMap: 'sass', 
        style: 'expanded',
        // include boubon (for local styles only)
        includePaths: require('node-bourbon').includePaths 
      }))
      .pipe($.autoprefixer('last 1 version'))
      .pipe(gulp.dest(config.stylesDistDir))
      .pipe($.size());
  });

  //        _     
  //       (_)____
  //      / / ___/
  //     / (__  ) 
  //  __/ /____/  
  // /___/        

  // Just run everything through JS Hint.
  // Don't move the files though. We'll do that later.
  gulp.task('scripts', ['clean'], function () {
    return gulp.src(config.jsDir)
      .pipe($.jshint())
      .pipe($.jshint.reporter($.jshintStylish))
      .pipe($.size());
  });


  //                                    ____
  //   __  __________        ________  / __/
  //  / / / / ___/ _ \______/ ___/ _ \/ /_  
  // / /_/ (__  )  __/_____/ /  /  __/ __/  
  // \__,_/____/\___/     /_/   \___/_/     
                                                                                             
  // This task does a number of things. It's responsible for
  // calling useref, which 
  //    * looks at the build directives in the html,
  //    * concatenates all of the files,
  //    * replaces the multiple refs with a ref to the build file,
  //    * and copies the build file to dist
  // 
  // We also use gulp-filter to grab just the JS and just the CSS
  // optimize, minify, etc.

  gulp.task('use-ref', ['templates', 'styles', 'scripts'], function () {
    // quick error handler for gulp-plumber
    var onError = function (err) {
      console.error(err);
      throw err;
    };

    // grab all the html in .tmp
    return gulp.src(config.assetBuildDir)
      
      // added gulp-plumber here since you'll often need
      // more info on why these stream failed
      .pipe(plumber({
        errorHandler: onError
      }))

      // useref all the html, and look in app and .tmp
      // for files references in the html
      .pipe($.useref.assets({
        searchPath: config.userefSearchPath
      }))


      // uglify if it's js, optimize if it's css
      .pipe($.if('**/*.js', $.uglify()))
      .pipe($.if('**/*.css', $.csso()))
      
      // useref requires a call to restore() and useref()
      // when you're done
      .pipe($.useref.restore())
      .pipe($.useref())

      // throw it all into dist
      .pipe(gulp.dest(config.distDir))
      .pipe($.size());
  });


  //     _                                
  //    (_)___ ___  ____ _____ ____  _____
  //   / / __ `__ \/ __ `/ __ `/ _ \/ ___/
  //  / / / / / / / /_/ / /_/ /  __(__  ) 
  // /_/_/ /_/ /_/\__,_/\__, /\___/____/  
  //                   /____/             

  // Look in both local app/images and ghost-shield for images,
  // optimize them and put them in dist/images
  gulp.task('images', ['cname', 'use-ref', 'fonts'],  function () {
    return gulp.src(config.imagesDir)
      // .pipe($.cache($.imagemin({
      //   optimizationLevel: 3,
      //   progressive: true,
      //   interlaced: true
      // })))
      .pipe(gulp.dest(config.imagesDistDir))
      .pipe($.size());
  });


  //     ____            __      
  //    / __/___  ____  / /______
  //   / /_/ __ \/ __ \/ __/ ___/
  //  / __/ /_/ / / / / /_(__  ) 
  // /_/  \____/_/ /_/\__/____/  

  // take fonts out of ghost-shield and move them to dist
  gulp.task('fonts', ['clean'], function () {
    return gulp.src(config.fontDir)
      .pipe($.filter('**/*.{eot,svg,ttf,woff}'))
      .pipe($.flatten())
      .pipe(gulp.dest('dist/styles'))
      .pipe($.size());
  });


                                   
  //   _________  ____ _____ ___  ___ 
  //  / ___/ __ \/ __ `/ __ `__ \/ _ \
  // / /__/ / / / /_/ / / / / / /  __/
  // \___/_/ /_/\__,_/_/ /_/ /_/\___/ 
                                   
  // Copy the CNAME file over to dist
  gulp.task('cname', ['clean'], function () {
    return gulp.src(config.cname)
      .pipe(gulp.dest(config.distDir))
      .pipe($.size());
  });


  //          _ __                                 
  //    _____(_) /____        ____ ___  ____ _____ 
  //   / ___/ / __/ _ \______/ __ `__ \/ __ `/ __ \
  //  (__  ) / /_/  __/_____/ / / / / / /_/ / /_/ /
  // /____/_/\__/\___/     /_/ /_/ /_/\__,_/ .___/ 
  //                                      /_/      

  // After build-step-1 promise is resolved , we can
  // safely generate a sitemap and put it in dist
  gulp.task('sitemap', ['cname', 'use-ref', 'fonts'], function () {
    return gulp.src(config.sitemapDir, {
      read: false
    }).pipe($.sitemap({
        siteUrl: config.siteUrl
    }))
    .pipe(gulp.dest(config.distDir));
  });


  //         __               
  //   _____/ /__  ____ _____ 
  //  / ___/ / _ \/ __ `/ __ \
  // / /__/ /  __/ /_/ / / / /
  // \___/_/\___/\__,_/_/ /_/                            

  gulp.task('clean', function () {
    return gulp.src(config.cleanDir, { read: false }).pipe($.rimraf());
  });
  

  //     __          _ __    __             
  //    / /_  __  __(_) /___/ /
  //   / __ \/ / / / / / __  /
  //  / /_/ / /_/ / / / /_/ /
  // /_.___/\__,_/_/_/\__,_/    

  gulp.task('build', ['cname', 'use-ref', 'fonts', 'sitemap', 'images']);


  //        __           __                                 __ 
  //   ____/ /__  ____  / /___  __  ______ ___  ___  ____  / /_
  //  / __  / _ \/ __ \/ / __ \/ / / / __ `__ \/ _ \/ __ \/ __/
  // / /_/ /  __/ /_/ / / /_/ / /_/ / / / / / /  __/ / / / /_  
  // \__,_/\___/ .___/_/\____/\__, /_/ /_/ /_/\___/_/ /_/\__/  
  //          /_/            /____/                            

  // this task relies on the build-step-2 task having run, which will
  // have triggered all other relevant build tasks. It takes everything
  // in dist and commits it to gh-pages and pushes.
  // 
  // deploy script from: https://github.com/X1011/git-directory-deploy
  gulp.task('deploy', ['build'], function() {
    var deployPromise = Q.defer();
    exec(config.deployCommand, function(err){
      deployPromise.resolve();
    });


    return deployPromise.promise;
  });


  //     __                 __       __         
  //    / /___  _________ _/ /  ____/ /__ _   __
  //   / / __ \/ ___/ __ `/ /  / __  / _ \ | / /
  //  / / /_/ / /__/ /_/ / /  / /_/ /  __/ |/ / 
  // /_/\____/\___/\__,_/_/   \__,_/\___/|___/  
                                             
  // Mostly the same ol' same ol' local dev tasks you know and love.
  gulp.task('connect', function () {
    var connect = require('connect');
    var app = connect()
      .use(require('connect-livereload')({ port: 35729 }))
      .use(connect.static('app'))
      // look in ghost shield too! XD
      .use(connect.static('app/bower_components/ghost-shield/dist'))
      .use(connect.static('.tmp'))
      .use(connect.directory('app'));

    require('http').createServer(app)
      .listen(9000)
      .on('listening', function () {
        console.log('Started connect web server on http://0.0.0.0:9000');
      });
  });

  gulp.task('serve', ['connect', 'styles', 'templates'], function () {
    require('opn')('http://0.0.0.0:9000');
  });

  gulp.task('watch', ['connect', 'serve'], function () {
    var server = $.livereload();

    // watch for changes

    gulp.watch([
      '.tmp/templates/**/*.jade',
      'app/*.html',
      '.tmp/styles/**/*.*',
      'app/scripts/**/*.js',
      'app/images/**/*'
    ]).on('change', function (file) {
      server.changed(file.path);
    });

    gulp.watch('app/templates/**/*.jade', ['templates']);
    gulp.watch('app/styles/**/*.scss', ['styles']);
    gulp.watch('app/scripts/**/*.js', ['scripts']);
    gulp.watch('app/images/**/*', ['images']);
    gulp.watch('bower.json', ['wiredep']);
  });

  outerGulp.tasks = assign({}, gulp.tasks, outerGulp.tasks);

}