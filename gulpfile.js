const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const bowerFiles = require('main-bower-files');

gulp.task('app/js', () =>
    gulp.src('client/app/*.js')
        .pipe(plugins.babel({ presets: ['env'] }))
        .pipe(gulp.dest('build/app'))
)
gulp.watch('client/app/*.js', ['app/js']);

gulp.task('app/html', () =>
    gulp.src('client/app/*.html')
        .pipe(gulp.dest('build/app'))
)
gulp.watch('client/app/*.html', ['app/html']);

gulp.task('app/css', () =>
    gulp.src(['client/app/*.css', 'client/app.css'])
        .pipe(plugins.cssCondense())
        .pipe(gulp.dest('build/app'))
)
gulp.watch('client/app/*.css', ['app/css']);

gulp.task('app', [ 'app/js', 'app/html', 'app/css' ])

gulp.task('vendor/js', () =>
    gulp.src('client/lib/*.js')
        .pipe(plugins.order(['babel-polyfill.min.js', 'angular.min.js']))
        .pipe(plugins.concat('vendor.js'))
        .pipe(gulp.dest('build'))
)
gulp.task('vendor/css', () =>
    gulp.src('client/lib/*.css')
        .pipe(plugins.concat('vendor.css'))
        .pipe(gulp.dest('build'))
)

gulp.task('vendor', [ 'vendor/js', 'vendor/css' ])

gulp.task('files/assets', () =>
    gulp.src('client/assets/**/*')
        .pipe(gulp.dest('build/assets'))
)
gulp.watch('client/assets/**/*', ['files/assets']);
gulp.task('files/root', () =>
    gulp.src('client/*.*')
        .pipe(gulp.dest('build'))
)
gulp.watch('client/*.*', ['files/root']);

gulp.task('files', ['files/assets', 'files/root']);

gulp.task('default', [ 'app', 'files', 'vendor' ])