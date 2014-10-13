var gulp = require('gulp');
var rename = require('gulp-rename');
var loopbackAngular = require('gulp-loopback-sdk-angular');
var git = require('gulp-git')

gulp.task('build', function () {
  return gulp.src('../expro-future-service2/server/server.js')
    .pipe(loopbackAngular({apiUrl:'http://fankahui.com:3000/api'}))
    .pipe(rename('ef-services2.js'))
    .pipe(gulp.dest('./'));
})

gulp.task('default', function () {
	git.pull('origin', 'master', {args: '--rebase'}, function (err) {
		if (err) throw err;
		gulp.src('./*.js')
			.pipe(git.commit('gulp commit'))
	})
})