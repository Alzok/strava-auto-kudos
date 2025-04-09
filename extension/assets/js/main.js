/**
 * Strava Auto Kudos - Extension Chrome qui donne automatiquement des kudos aux activités dans le flux
 * Version 1.6.0
 * 
 * Point d'entrée de l'extension
 */

// Utilisation des modules dans un contexte de script injecté dans la page
// Les scripts sont chargés par le navigateur dans l'ordre spécifié dans le manifest.json

// Fonction d'initialisation principale
function initializeExtension() {
    // Vérifier que les modules requis sont bien chargés
    // Vérifier si nous sommes sur une page Strava
    const isStravaPage = window.location.href.includes("strava.com");
    if (!isStravaPage) {
        return; // Ne rien faire si pas sur Strava
    }
    
    // Vérifier que les modules critiques sont définis
    if (typeof App === 'undefined' || typeof App.init !== 'function') {
        console.error("[Strava Auto Kudos] App.init is not available. Cannot initialize.");
        return;
    }
    
    App.init();
}

// Fonction pour tenter l'initialisation
let initialized = false;
function tryInitialize() {
    if (initialized) return;
    
    // Tenter d'initialiser seulement si le DOM est prêt
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        initializeExtension();
        initialized = true;
        // Nettoyer les écouteurs/timeouts une fois initialisé
        document.removeEventListener('DOMContentLoaded', tryInitialize);
        window.removeEventListener('load', tryInitialize);
        if (initTimeout) clearTimeout(initTimeout);
    }
}

// Démarrer l'application une fois que tous les modules sont chargés
document.addEventListener('DOMContentLoaded', tryInitialize);

// Alternative: utiliser window.onload comme fallback
window.addEventListener('load', tryInitialize);

// Ajouter un délai pour s'assurer que tout est chargé, même si les autres événements échouent
const initTimeout = setTimeout(() => {
    tryInitialize();
}, 2000); // Délai légèrement réduit
