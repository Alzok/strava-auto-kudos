const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');
const del = require('del');
const zip = require('gulp-zip');
const fs = require('fs');
const sourcemaps = require('gulp-sourcemaps');
const imagemin = require('gulp-imagemin');

// Chemins des fichiers
const paths = {
    src: {
        js: 'extension/assets/js/*.js',
        css: 'extension/assets/css/*.css',
        images: ['extension/icons/*.png', 'extension/assets/images/*.*'],
        manifest: 'extension/manifest.json'
    },
    dest: {
        build: 'dist',
        js: 'dist/assets/js',
        css: 'dist/assets/css',
        images: 'dist/assets/images'
    }
};

// Nettoyage du dossier de build
gulp.task('clean', () => {
    return del([paths.dest.build]);
});

// Concaténation et minification des scripts avec sourcemaps
gulp.task('scripts', () => {
    return gulp.src([
        'extension/assets/js/config.js',
        'extension/assets/js/utils.js',
        'extension/assets/js/logger.js',
        'extension/assets/js/storage.js',
        'extension/assets/js/domManager.js',
        'extension/assets/js/networkManager.js',
        'extension/assets/js/stateManager.js',
        'extension/assets/js/entryProcessor.js',
        'extension/assets/js/ui.js',
        'extension/assets/js/kudosManager.js',
        'extension/assets/js/app.js'
    ])
    .pipe(sourcemaps.init())
    .pipe(concat('strava-auto-kudos.min.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(paths.dest.js));
});

// Minification du CSS avec sourcemaps
gulp.task('styles', () => {
    return gulp.src(paths.src.css)
        .pipe(sourcemaps.init())
        .pipe(cleanCSS())
        .pipe(concat('style.min.css'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(paths.dest.css));
});

// Optimisation des images pour la production
gulp.task('images', () => {
    return gulp.src(paths.src.images)
        .pipe(imagemin([
            imagemin.gifsicle({interlaced: true}),
            imagemin.mozjpeg({quality: 75, progressive: true}),
            imagemin.optipng({optimizationLevel: 5}),
            imagemin.svgo({
                plugins: [
                    {removeViewBox: true},
                    {cleanupIDs: false}
                ]
            })
        ]))
        .pipe(gulp.dest(paths.dest.images));
});

// Mise à jour du manifest pour la production
gulp.task('update-manifest', () => {
    const manifest = JSON.parse(fs.readFileSync(paths.src.manifest, 'utf8'));
    
    // Mise à jour des chemins pour la production
    manifest.content_scripts[0].css = ['assets/css/style.min.css'];
    manifest.content_scripts[0].js = ['assets/js/strava-auto-kudos.min.js'];
    
    fs.writeFileSync(
        `${paths.dest.build}/manifest.json`,
        JSON.stringify(manifest, null, 2)
    );
});

// Validation du manifest
gulp.task('validate', (done) => {
    const manifest = JSON.parse(fs.readFileSync(paths.src.manifest, 'utf8'));
    
    // Vérification des champs requis
    const requiredFields = ['name', 'version', 'manifest_version', 'description'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`Manifest missing required fields: ${missingFields.join(', ')}`);
    }
    
    done();
});

// Création du zip pour le Chrome Web Store
gulp.task('zip', () => {
    return gulp.src(`${paths.dest.build}/**/*`)
        .pipe(zip('strava-auto-kudos.zip'))
        .pipe(gulp.dest('dist'));
});

// Tâche de build complète
gulp.task('build', gulp.series(
    'clean',
    'validate',
    gulp.parallel('scripts', 'styles', 'images'),
    'update-manifest'
));

// Tâche de packaging pour le Chrome Web Store
gulp.task('package', gulp.series('build', 'zip'));
