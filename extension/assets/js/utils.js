/**
 * Module pour les utilitaires
 */
const Utils = {
    /**
     * Génère un nombre entier aléatoire entre min et max
     * @param {number} min - Valeur minimum
     * @param {number} max - Valeur maximum
     * @returns {number} - Nombre aléatoire
     */
    randomIntFromInterval: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min);
    },
    
    /**
     * Temporisation avec promesse
     * @param {number} ms - Délai en millisecondes
     * @returns {Promise} - Promesse résolue après le délai
     */
    sleep: (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    /**
     * Vérifie si l'utilisateur est proche du bas de la page
     * @returns {boolean} - True si l'utilisateur est proche du bas
     */
    isNearBottom: () => {
        return (window.innerHeight + window.scrollY) >= 
            (document.documentElement.scrollHeight - CONFIG.state.scrollThreshold);
    },
    
    /**
     * Vérifie si nous sommes sur la page du tableau de bord
     * @returns {boolean} - True si nous sommes sur le dashboard
     */
    isDashboardPage: () => {
        return window.location.href.startsWith(CONFIG.urls.baseDashboard);
    },
    
    /**
     * Retourne les délais actuels en fonction de l'état des erreurs
     * @returns {Object} - Objet avec min et max delay
     */
    getCurrentDelays: () => {
        // Utiliser des délais plus longs si des erreurs sont détectées
        if (CONFIG.state.errorCount > 3) {
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

// Exporter le module utilitaire
if (typeof module !== 'undefined') {
    module.exports = Utils;
}
