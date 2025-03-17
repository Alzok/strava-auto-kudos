/**
 * Module pour la gestion des logs
 */
console.log("[Strava Auto Kudos] Logger module loading");

const Logger = {
    prefix: '[Strava Auto Kudos]',
    
    info: (message) => {
        console.info(`${Logger.prefix} ${message}`);
    },
    
    error: (message, error = null) => {
        // Si error est null ou undefined, ne pas l'inclure dans le log
        if (error) {
            console.error(`${Logger.prefix} ${message}`, error);
        } else {
            console.error(`${Logger.prefix} ${message}`);
        }
    },
    
    debug: (message, data = null) => {
        // Si data est null ou undefined, ne pas l'inclure dans le log
        if (data) {
            console.debug(`${Logger.prefix} ${message}`, data);
        } else {
            console.debug(`${Logger.prefix} ${message}`);
        }
    },
    
    // Ajout de la méthode warn manquante avec la même logique que error
    warn: (message, data = null) => {
        // Si data est null ou undefined, ne pas l'inclure dans le log
        if (data) {
            console.warn(`${Logger.prefix} ${message}`, data);
        } else {
            console.warn(`${Logger.prefix} ${message}`);
        }
    }
};

// Ajoutez cette fonction au module Logger
if (typeof Logger !== 'undefined') {
    Logger.init = function() {
        console.log("[Strava Auto Kudos] Logger initialized successfully");
    };
    
    // Appelez immédiatement la fonction d'initialisation
    Logger.init();
} else {
    console.error("[Strava Auto Kudos] Logger module undefined!");
}

// Exporter le module de logging
if (typeof module !== 'undefined') {
    module.exports = Logger;
}
