const gulp = require('gulp');
const cssc = require('gulp-css-condense');
const babel = require('gulp-babel');

gulp.task('app.js', () =>
    gulp.src('src/www/app/app.js')
        .pipe(babel({ presets: ['env'] }))
        .pipe(gulp.dest('build/app'))
)

gulp.task('html', () =>
    gulp.src('src/www/app/*.html')
        .pipe(gulp.dest('build/app'))
)

gulp.task('css', () =>
    gulp.src('src/www/app/*.css')
        .pipe(cssc())
        .pipe(gulp.dest('build/app'))
)

gulp.task('app', [ 'app.js', 'html', 'css' ])

gulp.task('assets', () =>
    gulp.src(['src/www/**/*', '!src/www/app/*'])
        .pipe(gulp.dest('build'))
)

gulp.task('default', [ 'app', 'assets' ])