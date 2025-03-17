/**
 * Module contenant des fonctions utilitaires
 */
console.log("[Strava Auto Kudos] Utils module loading");

const Utils = {
    /**
     * Génère un entier aléatoire entre min et max inclus
     * @param {number} min - Valeur minimale
     * @param {number} max - Valeur maximale
     * @returns {number} - Un entier aléatoire entre min et max
     */
    randomIntFromInterval: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min);
    },
    
    /**
     * Crée une promesse qui se résout après un délai donné
     * @param {number} ms - Délai en millisecondes
     * @returns {Promise} - Une promesse qui se résout après le délai
     */
    sleep: (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    /**
     * Vérifie si l'utilisateur est proche du bas de la page
     * @returns {boolean} - True si l'utilisateur est proche du bas de la page
     */
    isNearBottom: () => {
        return (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - CONFIG.state.scrollThreshold);
    },
    
    /**
     * Vérifie si l'URL actuelle correspond à une page du dashboard Strava
     * @returns {boolean} - True si c'est une page de dashboard
     */
    isDashboardPage: () => {
        return window.location.href.startsWith(CONFIG.urls.baseDashboard);
    },
    
    /**
     * Obtient les délais actuels à utiliser en fonction du nombre d'erreurs
     * @returns {Object} - Les délais min et max à utiliser
     */
    getCurrentDelays: () => {
        // Si beaucoup d'erreurs, augmenter les délais
        if (CONFIG.state.errorCount > 5) {
            return {
                min: CONFIG.kudosDelay.backoffMin,
                max: CONFIG.kudosDelay.backoffMax
            };
        }
        return {
            min: CONFIG.kudosDelay.min,
            max: CONFIG.kudosDelay.max
        };
    }
};

// Vérifions si le module est correctement défini
if (typeof Utils !== 'undefined') {
    console.log("[Strava Auto Kudos] Utils module loaded successfully");
} else {
    console.error("[Strava Auto Kudos] Utils module not properly defined!");
}

// Exporter le module d'utilitaires
if (typeof module !== 'undefined') {
    module.exports = Utils;
}
