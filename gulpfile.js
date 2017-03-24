const gulp = require('gulp');
const cssc = require('gulp-css-condense');
const babel = require('gulp-babel');

gulp.task('app/js', () =>
    gulp.src('client/app/*.js')
        .pipe(babel({ presets: ['env'] }))
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
        .pipe(cssc())
        .pipe(gulp.dest('build/app'))
)
gulp.watch('client/app/*.css', ['app/css']);

gulp.task('app', [ 'app/js', 'app/html', 'app/css' ])

gulp.task('files', () =>
    gulp.src(['client/**/*', '!client/app/*'])
        .pipe(gulp.dest('build'))
)

gulp.task('default', [ 'app', 'files' ])