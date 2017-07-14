'use strict';

var gulp = require('gulp'),
  rename = require('gulp-rename'),
  browserify = require('browserify'),
  source = require('vinyl-source-stream'),
  buffer = require('vinyl-buffer'),
  sourcemaps = require('gulp-sourcemaps'),
  gutil = require('gulp-util'),
  htmlmin = require('gulp-htmlmin'),
  sass = require('gulp-sass'),
  autoprefixer = require('gulp-autoprefixer'),
  cssnano = require('gulp-cssnano'),
  uglify = require('gulp-uglify'),
  browserSync = require('browser-sync');

var SRC = './src';
var DEST = './build';

gulp.task('html', function() {
  return gulp
    .src(SRC + '/*.html')
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(gulp.dest(DEST));
});

gulp.task('sass', function() {
  return gulp
    .src(SRC + '/scss/styles.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(
      autoprefixer({
        browsers: ['>1%'],
        cascade: false
      })
    )
    .pipe(cssnano())
    .pipe(
      rename({
        suffix: '.min'
      })
    )
    .pipe(gulp.dest(DEST))
    .pipe(browserSync.stream());
});

gulp.task('scripts', function() {
  // set up the browserify instance on a task basis
  var b = browserify({
    entries: SRC + '/js/scripts.js',
    transform: ['babelify'],
    debug: true
  });

  return (b
      .bundle()
      .pipe(source('main.js'))
      .pipe(rename({ suffix: '.min' }))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      // Add transformation tasks to the pipeline here.
      .pipe(uglify())
      .on('error', gutil.log)
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(DEST)) );
});

gulp.task('browser-sync', () => {
  browserSync.init({
    server: {
      baseDir: DEST,
      index: 'index.html'
    },
    notify: false,
    open: false
  });
});

gulp.task('copy', function() {
  gulp.src(SRC + '/GFR.geojson').pipe(gulp.dest(DEST));
  gulp.src(SRC + '/icons/*').pipe(gulp.dest(DEST + '/icons'));
  gulp.src(SRC + '/fonts/*').pipe(gulp.dest(DEST + '/fonts'));
});

gulp.task('watch', function() {
  gulp.watch(SRC + '/**/*.html', ['html', browserSync.reload]);
  gulp.watch(SRC + '/**/*.scss', ['sass']);
  gulp.watch(SRC + '/**/*.js', ['scripts', browserSync.reload]);
});

gulp.task('default', [
  'watch',
  'html',
  'copy',
  'scripts',
  'sass',
  'browser-sync'
]);
gulp.task('compile', ['html', 'copy', 'scripts', 'sass']);