/**
 * Module de gestion du stockage local
 * @module Storage
 */
console.log("[Strava Auto Kudos] Storage module loading");

// Constantes pour la configuration
const STORAGE_CONFIG = {
    MAX_ITEMS: 1000,
    MAX_ITEM_SIZE: 5 * 1024 * 1024, // 5MB
    PREFIX: 'strava_auto_kudos_'
};

// Créer l'objet Storage
const Storage = {
    /**
     * Vérifie si le stockage local est disponible
     * @returns {boolean} true si le stockage est disponible
     */
    isAvailable() {
        try {
            const test = STORAGE_CONFIG.PREFIX + '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            console.log("[Strava Auto Kudos] localStorage est disponible");
            return true;
        } catch (e) {
            console.error("[Strava Auto Kudos] localStorage n'est pas disponible:", e);
            return false;
        }
    },

    /**
     * Vérifie si une valeur peut être stockée
     * @param {*} value - Valeur à vérifier
     * @returns {boolean} true si la valeur peut être stockée
     */
    canStore(value) {
        try {
            const serialized = JSON.stringify(value);
            return serialized.length <= STORAGE_CONFIG.MAX_ITEM_SIZE;
        } catch (e) {
            console.error("[Strava Auto Kudos] Erreur lors de la vérification de la valeur:", e);
            return false;
        }
    },

    /**
     * Récupère une valeur du stockage local
     * @param {string} key - Clé de la valeur à récupérer
     * @returns {*} La valeur stockée ou null si non trouvée
     */
    get(key) {
        try {
            const prefixedKey = STORAGE_CONFIG.PREFIX + key;
            const item = localStorage.getItem(prefixedKey);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error(`[Strava Auto Kudos] Erreur lors de la récupération de ${key}:`, error);
            return null;
        }
    },

    /**
     * Stocke une valeur dans le stockage local
     * @param {string} key - Clé de la valeur à stocker
     * @param {*} value - Valeur à stocker
     * @returns {boolean} true si le stockage a réussi
     */
    set(key, value) {
        try {
            if (!this.canStore(value)) {
                console.error(`[Strava Auto Kudos] La valeur est trop grande pour être stockée: ${key}`);
                return false;
            }

            const prefixedKey = STORAGE_CONFIG.PREFIX + key;
            localStorage.setItem(prefixedKey, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`[Strava Auto Kudos] Erreur lors du stockage de ${key}:`, error);
            return false;
        }
    },

    /**
     * Supprime une valeur du stockage local
     * @param {string} key - Clé de la valeur à supprimer
     * @returns {boolean} true si la suppression a réussi
     */
    remove(key) {
        try {
            const prefixedKey = STORAGE_CONFIG.PREFIX + key;
            localStorage.removeItem(prefixedKey);
            return true;
        } catch (error) {
            console.error(`[Strava Auto Kudos] Erreur lors de la suppression de ${key}:`, error);
            return false;
        }
    },

    /**
     * Vide le stockage local
     * @returns {boolean} true si le nettoyage a réussi
     */
    clear() {
        try {
            // Ne supprimer que les éléments de notre extension
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(STORAGE_CONFIG.PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('[Strava Auto Kudos] Erreur lors du nettoyage du stockage:', error);
            return false;
        }
    },

    /**
     * Récupère toutes les clés stockées par l'extension
     * @returns {string[]} Liste des clés
     */
    getAllKeys() {
        try {
            return Object.keys(localStorage)
                .filter(key => key.startsWith(STORAGE_CONFIG.PREFIX))
                .map(key => key.slice(STORAGE_CONFIG.PREFIX.length));
        } catch (error) {
            console.error('[Strava Auto Kudos] Erreur lors de la récupération des clés:', error);
            return [];
        }
    }
};

// Vérifier la disponibilité du stockage au chargement
if (!Storage.isAvailable()) {
    console.error("[Strava Auto Kudos] Le stockage local n'est pas disponible");
}

// Exposer le module globalement
if (typeof window !== 'undefined') {
    window.Storage = Storage;
}

// Exporter le module pour Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
