const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();

const devMode = process.env.RPNOW_PRODUCTION !== 'production';

gulp.task('app/js', () =>
    gulp.src('client/app/*.js')
        .pipe(plugins.babel({ presets: ['env'] }))
        .pipe(gulp.dest('build/app'))
)

gulp.task('app/html', () =>
    gulp.src('client/app/*.html')
        .pipe(gulp.dest('build/app'))
)

gulp.task('app/md', () =>
    gulp.src('client/app/*.md')
        .pipe(plugins.markdown())
        .pipe(gulp.dest('build/app'))
)

gulp.task('app/css', () =>
    gulp.src(['client/app/*.css', 'client/app.css'])
        .pipe(plugins.cssCondense())
        .pipe(gulp.dest('build/app'))
)

gulp.task('app', [ 'app/js', 'app/html', 'app/css', 'app/md' ])

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
gulp.task('files/root', () =>
    gulp.src('client/*.*')
        .pipe(gulp.dest('build'))
)

gulp.task('files', ['files/assets', 'files/root']);

gulp.task('default', [ 'app', 'files', 'vendor' ])

if (devMode) {
    gulp.watch('client/app/*.js', ['app/js']);
    gulp.watch('client/app/*.html', ['app/html']);
    gulp.watch('client/app/*.css', ['app/css']);
    gulp.watch('client/app/*.md', ['app/md']);
    gulp.watch('client/assets/**/*', ['files/assets']);
    gulp.watch('client/*.*', ['files/root']);
}