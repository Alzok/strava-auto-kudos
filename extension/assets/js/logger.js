/**
 * Module pour la gestion des logs
 */
const Logger = {
    prefix: '[Strava Auto Kudos]',
    
    info: (message) => {
        console.info(`${Logger.prefix} ${message}`);
    },
    
    error: (message, error) => {
        console.error(`${Logger.prefix} ${message}`, error);
    },
    
    debug: (message, data = null) => {
        console.debug(`${Logger.prefix} ${message}`, data || '');
    }
};

// Exporter le module de logging
if (typeof module !== 'undefined') {
    module.exports = Logger;
}
