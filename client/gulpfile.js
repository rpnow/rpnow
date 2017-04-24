const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();

const devMode = process.env.RPNOW_PRODUCTION !== 'production';

gulp.task('app/js', () =>
    gulp.src('src/app/*.js')
        .pipe(plugins.babel({ presets: ['env'] }))
        .pipe(gulp.dest('build/app'))
)

gulp.task('app/html', () =>
    gulp.src('src/app/*.html')
        .pipe(gulp.dest('build/app'))
)

gulp.task('app/md', () =>
    gulp.src('src/app/*.md')
        .pipe(plugins.markdown())
        .pipe(gulp.dest('build/app'))
)

gulp.task('app/css', () =>
    gulp.src(['src/app/*.css', 'src/app.css'])
        .pipe(plugins.cssCondense())
        .pipe(gulp.dest('build/app'))
)

gulp.task('app', [ 'app/js', 'app/html', 'app/css', 'app/md' ])

gulp.task('vendor/js', () =>
    gulp.src('src/lib/*.js')
        .pipe(plugins.order(['babel-polyfill.min.js', 'angular.min.js']))
        .pipe(plugins.concat('vendor.js'))
        .pipe(gulp.dest('build'))
)
gulp.task('vendor/css', () =>
    gulp.src('src/lib/*.css')
        .pipe(plugins.concat('vendor.css'))
        .pipe(gulp.dest('build'))
)

gulp.task('vendor', [ 'vendor/js', 'vendor/css' ])

gulp.task('files/assets', () =>
    gulp.src('src/assets/**/*')
        .pipe(gulp.dest('build/assets'))
)
gulp.task('files/root', () =>
    gulp.src('src/*.*')
        .pipe(gulp.dest('build'))
)

gulp.task('files', ['files/assets', 'files/root']);

gulp.task('default', [ 'app', 'files', 'vendor' ])

if (devMode) {
    gulp.watch('src/app/*.js', ['app/js']);
    gulp.watch('src/app/*.html', ['app/html']);
    gulp.watch('src/app/*.css', ['app/css']);
    gulp.watch('src/app/*.md', ['app/md']);
    gulp.watch('src/assets/**/*', ['files/assets']);
    gulp.watch('src/*.*', ['files/root']);
}