/**
 * Module pour la gestion du stockage local
 */
console.log("[Strava Auto Kudos] Storage module loading");

const Storage = {
    /**
     * Sauvegarde une valeur dans le stockage local
     * @param {string} key - Clé de stockage
     * @param {*} value - Valeur à stocker
     */
    save: (key, value) => {
        try {
            // Convertir les objets et tableaux en chaînes JSON
            const valueToSave = typeof value === 'object' ? JSON.stringify(value) : value;
            localStorage.setItem(key, valueToSave);
            
            // Vérifier que la valeur a bien été sauvegardée
            const savedValue = localStorage.getItem(key);
            const expectedValue = valueToSave.toString();
            
            if (savedValue !== expectedValue) {
                console.warn('[Strava Auto Kudos] Storage verification failed. Expected:', expectedValue, 'Got:', savedValue);
            } else {
                console.log('[Strava Auto Kudos] Storage saved successfully:', key, '=', value);
            }
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
            
            if (item === null) {
                return defaultValue;
            }
            
            // Tentative de parsing JSON
            try {
                return JSON.parse(item);
            } catch (e) {
                // Si c'est un nombre en format string
                if (!isNaN(item)) {
                    return Number(item);
                }
                
                // Sinon retourner la valeur telle quelle
                return item;
            }
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
