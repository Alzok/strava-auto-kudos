/**
 * Module pour le stockage local
 */
const Storage = {
    /**
     * Enregistre une valeur dans le stockage local
     * @param {string} key - Clé de stockage
     * @param {any} value - Valeur à stocker
     */
    save: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            Logger.error("Erreur lors de l'enregistrement dans le stockage local", error);
        }
    },
    
    /**
     * Charge une valeur depuis le stockage local
     * @param {string} key - Clé de stockage
     * @param {any} defaultValue - Valeur par défaut si non trouvé
     * @returns {any} - Valeur stockée ou valeur par défaut
     */
    load: (key, defaultValue = null) => {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? JSON.parse(value) : defaultValue;
        } catch (error) {
            Logger.error("Erreur lors du chargement depuis le stockage local", error);
            return defaultValue;
        }
    }
};

// Exporter le module de stockage
if (typeof module !== 'undefined') {
    module.exports = Storage;
}
