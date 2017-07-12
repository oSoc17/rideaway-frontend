'use strict';

var gulp = require('gulp'),
  rename = require('gulp-rename'),
  browserify = require('browserify'),
  source = require('vinyl-source-stream'),
  buffer = require('vinyl-buffer'),
  sourcemaps = require('gulp-sourcemaps'),
  babel = require('gulp-babel'),
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
    .src(SRC + '/styles.scss')
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
    entries: SRC + '/scripts.js',
    debug: true
  });

  return (b
      .bundle()
      .pipe(source('main.js'))
      .pipe(rename({ suffix: '.min' }))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      // Add transformation tasks to the pipeline here.
      .pipe(babel())
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
    browser: ['google chrome'],
    notify: false
  });
});

gulp.task('copy', function() {
  gulp.src(SRC + '/GFR.geojson').pipe(gulp.dest(DEST));
  gulp.src(SRC + '/icons/*').pipe(gulp.dest(DEST + '/icons'));
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