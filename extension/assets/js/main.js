/**
 * Strava Auto Kudos - Extension Chrome qui donne automatiquement des kudos aux activités dans le flux
 * Version 1.6.0
 * 
 * Point d'entrée de l'extension
 */

// Utilisation des modules dans un contexte de script injecté dans la page
// Les scripts sont chargés par le navigateur dans l'ordre spécifié dans le manifest.json

// Démarrer l'application une fois que tous les modules sont chargés
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier que les modules requis sont bien chargés
    if (typeof CONFIG !== 'undefined' && 
        typeof Logger !== 'undefined' &&
        typeof Storage !== 'undefined' &&
        typeof Utils !== 'undefined' &&
        typeof UI !== 'undefined' &&
        typeof KudosManager !== 'undefined' &&
        typeof App !== 'undefined') {
        
        // Initialiser l'application
        App.init();
    } else {
        console.error('[Strava Auto Kudos] Erreur: Un ou plusieurs modules n\'ont pas été chargés correctement.');
    }
});
