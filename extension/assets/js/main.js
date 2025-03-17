/**
 * Strava Auto Kudos - Extension Chrome qui donne automatiquement des kudos aux activités dans le flux
 * Version 1.6.0
 * 
 * Point d'entrée de l'extension
 */

// Utilisation des modules dans un contexte de script injecté dans la page
// Les scripts sont chargés par le navigateur dans l'ordre spécifié dans le manifest.json

console.log("[Strava Auto Kudos] Main script loading");
console.log("[Strava Auto Kudos] Document ready state:", document.readyState);

// Fonction d'initialisation principale
function initializeExtension() {
    console.log("[Strava Auto Kudos] Initializing extension");
    
    // Vérifier que les modules requis sont bien chargés
    console.log("[Strava Auto Kudos] Checking required modules:");
    console.log("- CONFIG module:", ((typeof CONFIG !== 'undefined') ? "Loaded" : "MISSING"));
    console.log("- Logger module:", ((typeof Logger !== 'undefined') ? "Loaded" : "MISSING"));
    console.log("- Storage module:", ((typeof Storage !== 'undefined') ? "Loaded" : "MISSING (important)"));
    console.log("- Utils module:", ((typeof Utils !== 'undefined') ? "Loaded" : "MISSING (important)"));
    console.log("- UI module:", ((typeof UI !== 'undefined') ? "Loaded" : "MISSING (important)"));
    console.log("- KudosManager module:", ((typeof KudosManager !== 'undefined') ? "Loaded" : "MISSING"));
    console.log("- App module:", ((typeof App !== 'undefined') ? "Loaded" : "MISSING"));

    // Vérifier si nous sommes sur une page Strava
    const isStravaPage = window.location.href.includes("strava.com");
    console.log("[Strava Auto Kudos] Is Strava page:", isStravaPage, "URL:", window.location.href);

    if (isStravaPage && 
        typeof CONFIG !== 'undefined' && 
        typeof Logger !== 'undefined' &&
        typeof Storage !== 'undefined' &&
        typeof Utils !== 'undefined' &&
        typeof UI !== 'undefined' &&
        typeof KudosManager !== 'undefined' &&
        typeof App !== 'undefined') {
        
        console.log("[Strava Auto Kudos] All modules loaded correctly, starting initialization");
        try {
            // Initialiser l'application
            if (typeof App !== 'undefined' && typeof App.init === 'function') {
                console.log("[Strava Auto Kudos] App.init() called");
                App.init();
            } else {
                console.error("[Strava Auto Kudos] App.init is not available!");
            }
        } catch (error) {
            console.error("[Strava Auto Kudos] Initialization error:", error);
        }
    } else {
        console.error('[Strava Auto Kudos] Erreur: Un ou plusieurs modules n\'ont pas été chargés correctement.');
        
        // Essayons quand même d'initialiser si les modules essentiels sont présents
        if (isStravaPage && typeof CONFIG !== 'undefined' && typeof Logger !== 'undefined' && typeof App !== 'undefined') {
            console.log("[Strava Auto Kudos] Tentative d'initialisation avec les modules disponibles");
            try {
                App.init();
            } catch (error) {
                console.error("[Strava Auto Kudos] Emergency initialization failed:", error);
            }
        }
    }
}

// Démarrer l'application une fois que tous les modules sont chargés
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Strava Auto Kudos] DOMContentLoaded event triggered");
    initializeExtension();
});

// Alternative: utiliser window.onload comme fallback
window.onload = function() {
    console.log("[Strava Auto Kudos] window.onload event triggered");
    initializeExtension(); // Exécuter sans condition pour s'assurer que ça se lance
};

// Ajouter un délai pour s'assurer que tout est chargé, même si les autres événements échouent
setTimeout(() => {
    console.log("[Strava Auto Kudos] Timeout initialization triggered");
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initializeExtension();
    }
}, 2000); // 2 secondes de délai

// Ajout d'une vérification de l'état du chargement de la page
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log("[Strava Auto Kudos] Document already " + document.readyState + ", initializing immediately");
    setTimeout(initializeExtension, 500); // Small delay to ensure all scripts are properly loaded
}
