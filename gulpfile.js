const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');
const del = require('del');
const zip = require('gulp-zip');
const merge = require('merge-stream');

// Clean the prod directory
gulp.task('clean', function() {
    return del(['prod/**/*']);
});

// Process JS files: concat and minify
gulp.task('scripts', function() {
    return gulp.src([
        'extension/assets/js/config.js',
        'extension/assets/js/logger.js',
        'extension/assets/js/storage.js',
        'extension/assets/js/utils.js',
        'extension/assets/js/ui.js',
        'extension/assets/js/kudosManager.js',
        'extension/assets/js/app.js',
        'extension/assets/js/main.js'
    ])
    .pipe(concat('strava-auto-kudos.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('prod/assets/js'));
});

// Process CSS files: concat and minify
gulp.task('styles', function() {
    return gulp.src('extension/assets/css/style.css')
        .pipe(concat('style.min.css'))
        .pipe(cleanCSS())
        .pipe(gulp.dest('prod/assets/css'));
});

// Copy other files
gulp.task('copy', function() {
    const manifest = gulp.src('extension/manifest.json')
        .pipe(gulp.dest('prod'));
    
    const images = gulp.src([
        'extension/*.png',
    ], { base: 'extension' })
        .pipe(gulp.dest('prod'));
    
    return merge(manifest, images);
});

// Update manifest.json to use the minified files
gulp.task('update-manifest', function(done) {
    const fs = require('fs');
    const manifest = JSON.parse(fs.readFileSync('./prod/manifest.json'));
    
    // Update content scripts to use the minified files
    manifest.content_scripts[0].js = ['assets/js/strava-auto-kudos.min.js'];
    manifest.content_scripts[0].css = ['assets/css/style.min.css'];
    
    fs.writeFileSync('./prod/manifest.json', JSON.stringify(manifest, null, 2));
    done();
});

// Create a zip file for submission to the Chrome Web Store
gulp.task('zip', function() {
    return gulp.src('prod/**')
        .pipe(zip('strava-auto-kudos.zip'))
        .pipe(gulp.dest('./'));
});

// Build task
gulp.task('build', gulp.series(
    'clean',
    gulp.parallel('scripts', 'styles', 'copy'),
    'update-manifest'
));

// Default task
gulp.task('default', gulp.series('build'));

// Package for submission to Chrome Web Store
gulp.task('package', gulp.series('build', 'zip'));
