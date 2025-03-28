/**
 * Module d'utilitaires
 * @module Utils
 */
console.log("[Strava Auto Kudos] Utils module loading");

// Créer le module Utils
const Utils = {
    /**
     * Crée une fonction debounced
     * @param {Function} func - La fonction à debouncer
     * @param {number} wait - Le délai en millisecondes
     * @returns {Function} La fonction debounced
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Génère un délai aléatoire entre min et max
     * @param {number} min - Délai minimum en ms
     * @param {number} max - Délai maximum en ms
     * @returns {number} Délai aléatoire en ms
     */
    getRandomDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Récupère les délais actuels en fonction de l'état
     * @returns {Object} Délais actuels
     */
    getCurrentDelays() {
        const errorCount = StateManager.getErrorCount();
        const delays = CONFIG.delays.kudos;
        
        // Ajuster les délais en fonction du nombre d'erreurs
        const multiplier = Math.min(1 + (errorCount * 0.1), 2);
        
        return {
            min: Math.floor(delays.min * multiplier),
            max: Math.floor(delays.max * multiplier)
        };
    },

    /**
     * Attend un délai spécifié
     * @param {number} ms - Délai en millisecondes
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Génère un nombre aléatoire dans un intervalle
     * @param {number} min - Valeur minimum
     * @param {number} max - Valeur maximum
     * @returns {number} Nombre aléatoire
     */
    randomIntFromInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Formate une durée en millisecondes
     * @param {number} ms - Durée en millisecondes
     * @returns {string} Durée formatée
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    },

    /**
     * Vérifie si une valeur est un nombre valide
     * @param {*} value - La valeur à vérifier
     * @returns {boolean} true si la valeur est un nombre valide
     */
    isValidNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    },

    /**
     * Limite une valeur dans un intervalle
     * @param {number} value - La valeur à limiter
     * @param {number} min - Valeur minimum
     * @param {number} max - Valeur maximum
     * @returns {number} La valeur limitée
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Vérifie si une chaîne est vide ou ne contient que des espaces
     * @param {string} str - La chaîne à vérifier
     * @returns {boolean} true si la chaîne est vide
     */
    isEmptyString(str) {
        return !str || str.trim().length === 0;
    },

    /**
     * Vérifie si un objet est vide
     * @param {Object} obj - L'objet à vérifier
     * @returns {boolean} true si l'objet est vide
     */
    isEmptyObject(obj) {
        return !obj || Object.keys(obj).length === 0;
    },

    /**
     * Vérifie si une valeur est null ou undefined
     * @param {*} value - La valeur à vérifier
     * @returns {boolean} true si la valeur est null ou undefined
     */
    isNullOrUndefined(value) {
        return value === null || value === undefined;
    },

    /**
     * Vérifie si une valeur est un objet valide
     * @param {*} value - La valeur à vérifier
     * @returns {boolean} true si la valeur est un objet valide
     */
    isValidObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value);
    },

    /**
     * Vérifie si une valeur est un tableau valide
     * @param {*} value - La valeur à vérifier
     * @returns {boolean} true si la valeur est un tableau valide
     */
    isValidArray(value) {
        return Array.isArray(value) && value.length > 0;
    }
};

// Exposer le module de manière sécurisée
(function() {
    if (typeof window !== 'undefined') {
        window.Utils = Utils;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Utils;
    }
})();

console.log("[Strava Auto Kudos] Utils module loaded");
