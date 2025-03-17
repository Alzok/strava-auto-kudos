/**
 * Module pour la gestion du stockage local
 */
console.log("[Strava Auto Kudos] Storage module loading");

const Storage = {
    /**
     * Sauvegarde une valeur dans le stockage local
     * @param {string} key - Clé de stockage
     * @param {any} value - Valeur à stocker
     */
    save: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('[Strava Auto Kudos] Error saving to storage:', error);
        }
    },
    
    /**
     * Charge une valeur depuis le stockage local
     * @param {string} key - Clé de stockage
     * @param {any} defaultValue - Valeur par défaut si la clé n'existe pas
     * @returns {any} - La valeur stockée ou la valeur par défaut
     */
    load: (key, defaultValue) => {
        try {
            const item = localStorage.getItem(key);
            return item !== null ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('[Strava Auto Kudos] Error loading from storage:', error);
            return defaultValue;
        }
    },
    
    /**
     * Supprime une valeur du stockage local
     * @param {string} key - Clé à supprimer
     */
    remove: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('[Strava Auto Kudos] Error removing from storage:', error);
        }
    }
};

// Vérifions si le module est correctement défini
if (typeof Storage !== 'undefined') {
    console.log("[Strava Auto Kudos] Storage module loaded successfully");
} else {
    console.error("[Strava Auto Kudos] Storage module not properly defined!");
}

// Exporter le module de stockage
if (typeof module !== 'undefined') {
    module.exports = Storage;
}
