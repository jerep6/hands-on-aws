'use strict';

const gulp = require('gulp'),
    path = require('path');

const commonDirectory = path.resolve(__dirname, '..', 'common');

gulp.task('copie-common', () => {
  return gulp.src([`${commonDirectory}/*`, `!${commonDirectory}/node_modules`])
    .pipe(gulp.dest(path.resolve(__dirname, "common")));
});

gulp.task('utils:watch', () => {
  gulp.watch(`${commonDirectory}/**`, ['copie-common']);
});

gulp.task('build:dev', ["copie-common"]);

gulp.task('default', ["utils:watch"]);
