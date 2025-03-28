/**
 * Module de logging centralisé
 * @module Logger
 */

// Vérifier si Logger est déjà défini
if (typeof window.Logger === 'undefined') {
    // Configuration par défaut
    const defaultConfig = {
        logging: {
            level: 'info',
            prefix: '[Strava Auto Kudos]'
        }
    };

    // Utiliser la configuration globale ou la configuration par défaut
    const config = window.CONFIG || defaultConfig;

    window.Logger = {
        /**
         * Niveau de log actuel (debug, info, error)
         * @type {string}
         */
        logLevel: config.logging?.level || 'info',

        /**
         * Préfixe pour tous les logs
         * @type {string}
         */
        prefix: config.logging?.prefix || '[Strava Auto Kudos]',

        /**
         * Log un message de debug
         * @param {string} message - Le message à logger
         * @param {*} [data] - Données optionnelles à logger
         */
        debug(message, data) {
            if (this.logLevel === 'debug') {
                console.debug(`${this.prefix} ${message}`, data || '');
            }
        },

        /**
         * Log un message d'information
         * @param {string} message - Le message à logger
         * @param {*} [data] - Données optionnelles à logger
         */
        info(message, data) {
            if (['debug', 'info'].includes(this.logLevel)) {
                console.info(`${this.prefix} ${message}`, data || '');
            }
        },

        /**
         * Log une erreur
         * @param {string} message - Le message d'erreur
         * @param {Error} [error] - L'objet d'erreur
         */
        error(message, error) {
            console.error(`${this.prefix} ${message}`, error || '');
        },

        /**
         * Log un avertissement
         * @param {string} message - Le message d'avertissement
         * @param {*} [data] - Données optionnelles à logger
         */
        warn(message, data) {
            if (['debug', 'info', 'warn'].includes(this.logLevel)) {
                console.warn(`${this.prefix} ${message}`, data || '');
            }
        },

        /**
         * Définit le niveau de log
         * @param {string} level - Le niveau de log (debug, info, warn, error)
         */
        setLevel(level) {
            if (['debug', 'info', 'warn', 'error'].includes(level)) {
                this.logLevel = level;
                this.info(`Log level set to: ${level}`);
            }
        }
    };
}

// Exporter le module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.Logger;
}
