const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const es = require('event-stream');
const print = require('gulp-print');

const bowerFiles = require('main-bower-files');
const bowerFilesManual = [
    'bower_components/socket.io-client/dist/socket.io.slim.min.js'
];

let devMode = process.env.RPNOW_PRODUCTION !== 'production';

const paths = {
    index: './app/index.html',
    scripts: './app/**/*.js',
    partials: ['./app/**/*.html', '!./app/index.html'],
    mdPartials: './app/**/*.md',
    cssStyles: './app/**/*.css',
    sassStyles: './app/**/*.scss',
    assets: ['./app/**/*.*', '!./**/*.html', '!./**/*.css', '!./**/*.scss', '!./**/*.js', '!./**/*.md'],
    distDev: './dist.dev',
    distProd: './dist.prod',
    distVendorDev: './dist.dev/vendor',
    distScriptsProd: './dist.prod/scripts',
    distStylesProd: './dist.prod/styles'
};

let pipes = {};

pipes.orderedVendorScripts = () => plugins.order(['jquery.js', 'angular.js'])
pipes.orderedAppScripts = () => plugins.angularFilesort()

pipes.minifiedFileName = () => plugins.rename(path=>path.extname = '.min' + path.extname)

pipes.mdToHtmlPartials = () => gulp.src(paths.mdPartials)
    .pipe(plugins.markdown())
    .pipe(plugins.rename(path=>path.extname = '.html'))

pipes.partials = () =>
    es.merge(gulp.src(paths.partials), pipes.mdToHtmlPartials())

pipes.validatedPartials = () => pipes.partials()
    // .pipe(plugins.htmlhint({'doctype-first': false}))
    // .pipe(plugins.htmlhint.reporter())

pipes.builtPartialsDev = () => pipes.validatedPartials()
    .pipe(gulp.dest(paths.distDev))

pipes.scriptedPartials = () => pipes.validatedPartials()
    // .pipe(plugins.htmlhint.failReporter())
    .pipe(plugins.htmlmin({collapseWhitespace: true, removeComments: true}))
    .pipe(plugins.ngHtml2js({moduleName: "rpnow", prefix: "/", declareModule: false}))

pipes.validatedAppScripts = () => gulp.src(paths.scripts)
    .pipe(plugins.babel({ presets: ['env'] }))
    // .pipe(plugins.jshint())
    // .pipe(plugins.jshint.reporter('jshint-stylish'))

pipes.builtAppScriptsDev = () => pipes.validatedAppScripts()
    .pipe(gulp.dest(paths.distDev))

pipes.builtAppScriptsProd = () =>
    es.merge(pipes.scriptedPartials(), pipes.validatedAppScripts())
    .pipe(pipes.orderedAppScripts())
    .pipe(plugins.concat('app.min.js'))
    .pipe(plugins.uglify())
    .pipe(gulp.dest(paths.distScriptsProd))

pipes.appStyles = () =>
    es.merge(
        gulp.src(paths.cssStyles),
        gulp.src(paths.sassStyles).pipe(plugins.sass())
    )

pipes.builtAppStylesDev = () => pipes.appStyles()
    .pipe(gulp.dest(paths.distDev))

pipes.builtAppStylesProd = () => pipes.appStyles()
    .pipe(plugins.minifyCss())
    .pipe(plugins.concat('app.min.css'))
    .pipe(gulp.dest(paths.distStylesProd));

pipes.vendorScripts = () => gulp.src([...bowerFiles('**/*.js'), ...bowerFilesManual])

pipes.builtVendorScriptsDev = () => pipes.vendorScripts()
    .pipe(gulp.dest(paths.distVendorDev))

pipes.builtVendorScriptsProd = () => pipes.vendorScripts()
    .pipe(pipes.orderedVendorScripts())
    .pipe(plugins.concat('vendor.min.js'))
    .pipe(plugins.uglify())
    .pipe(gulp.dest(paths.distScriptsProd))

pipes.vendorStyles = () => gulp.src(bowerFiles('**/*.css'))

pipes.builtVendorStylesDev = () =>  pipes.vendorStyles()
    .pipe(gulp.dest(paths.distVendorDev))

pipes.builtVendorStylesProd = () => pipes.vendorStyles()
    .pipe(plugins.minifyCss())
    .pipe(plugins.concat('vendor.min.css'))
    .pipe(gulp.dest(paths.distStylesProd));

pipes.validatedIndex = () => gulp.src(paths.index)
    // .pipe(plugins.htmlhint())
    // .pipe(plugins.htmlhint.reporter())

pipes.builtIndexDev = () => pipes.validatedIndex()
    .pipe(gulp.dest(paths.distDev)) // write first to get relative path for inject
    .pipe(plugins.inject(
        pipes.builtVendorScriptsDev().pipe(pipes.orderedVendorScripts()),
        {relative: true, name: 'bower'}))
    .pipe(plugins.inject(
        pipes.builtAppScriptsDev().pipe(pipes.orderedAppScripts()),
        {relative: true}))
    .pipe(plugins.inject(pipes.builtAppStylesDev(), {relative: true}))
    .pipe(plugins.inject(pipes.builtVendorStylesDev(), {relative: true, name:'bower'}))
    .pipe(gulp.dest(paths.distDev))

pipes.builtIndexProd = () => pipes.validatedIndex()
    .pipe(gulp.dest(paths.distProd)) // write first to get relative path for inject
    .pipe(plugins.inject(pipes.builtVendorScriptsProd(), {relative: true, name: 'bower'}))
    .pipe(plugins.inject(pipes.builtAppScriptsProd(), {relative: true}))
    .pipe(plugins.inject(pipes.builtVendorStylesProd(), {relative: true, name: 'bower'}))
    .pipe(plugins.inject(pipes.builtAppStylesProd(), {relative: true}))
    .pipe(plugins.htmlmin({collapseWhitespace: true, removeComments: true}))
    .pipe(gulp.dest(paths.distProd))

pipes.assetsDev = () => gulp.src(paths.assets)
    .pipe(gulp.dest(paths.distDev))

pipes.assetsProd = () => gulp.src(paths.assets)
    .pipe(gulp.dest(paths.distProd))

pipes.builtAppDev = () => es.merge(
    pipes.builtIndexDev(),
    pipes.builtPartialsDev(),
    pipes.assetsDev()
)

pipes.builtAppProd = () => es.merge(
    pipes.builtIndexProd(),
    pipes.assetsProd()
)

// builds a complete dev environment
gulp.task('build-dev', pipes.builtAppDev);

// builds a complete prod environment
gulp.task('build-prod', pipes.builtAppProd);

// clean, build, and watch live changes to the dev environment
gulp.task('watch-dev', ['build-dev'], function() {
    [
        [paths.index, pipes.builtIndexDev],
        [paths.scripts, pipes.builtAppScriptsDev],
        [paths.partials, pipes.builtPartialsDev],
        [paths.mdPartials, pipes.builtPartialsDev],
        [paths.cssStyles, pipes.builtAppStylesDev],
        [paths.sassStyles, pipes.builtAppStylesDev],
        [paths.assets, pipes.assetsDev]
    ]
        .forEach(([path, pipe]) => gulp.watch(path, pipe))
});

// clean, build, and watch live changes to the prod environment
gulp.task('watch-prod', ['build-prod'], function() {
    [
        [paths.index, pipes.builtIndexProd],
        [paths.scripts, pipes.builtAppScriptsProd],
        [paths.partials, pipes.builtAppScriptsProd],
        [paths.mdPartials, pipes.builtAppScriptsProd],
        [paths.cssStyles, pipes.builtAppStylesProd],
        [paths.sassStyles, pipes.builtAppStylesProd],
        [paths.assets, pipes.assetsProd]
    ]
        .forEach(([path, pipe]) => gulp.watch(path, pipe))
});
