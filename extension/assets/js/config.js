/**
 * Configuration de l'extension
 * @module Config
 */
console.log("[Strava Auto Kudos] Config module loading");

// Vérifier si CONFIG est déjà défini
if (typeof window.CONFIG === 'undefined') {
    window.CONFIG = {
        // Sélecteurs DOM pour les éléments de l'interface
        selectors: {
            // Conteneur principal du flux d'activités
            feedContainer: '.feature-feed, [data-testid="web-feed"], div[class*="feed-container"], div[role="main"] > div > div',
            // Entrée du flux
            feedEntry: '[data-testid="web-feed-entry"], [data-testid*="feed-entry"], .feed-entry, [data-activity-id], article[data-testid], div[data-entry-id]',
            // Bouton kudos
            kudosButton: 'button[data-testid="kudos_button"], button[title*="kudos"], button[title*="Kudos"], .kudos-button, button[aria-label*="kudos"], button[aria-label*="Kudos"]',
            // Bouton kudos actif
            activeKudos: 'button[data-testid="kudos_button"] svg[data-testid="filled_kudos"], button[data-testid="kudos_button"].activated, .kudos-button.activated, button[aria-label*="kudos"].activated, button[aria-label*="Kudos"].activated',
            // Compteur de kudos
            kudosCount: '[data-testid="kudos_count"], .kudos-count, span[title*="kudos"]',
            // Conteneur de l'extension
            container: '#strava-auto-kudos-container',
            // Bouton principal
            button: '.social_assistant_button',
            // Menu déroulant
            dropdown: '.dropdown',
            // Compteur de kudos
            counter: '.kudos-counter',
            // Statistiques
            stats: '.stats',
            // État
            status: '.status'
        },

        // Délais (en millisecondes)
        delays: {
            // Délai entre chaque kudos
            kudos: 1000,
            // Délai minimum entre les kudos
            minKudos: 500,
            // Délai maximum entre les kudos
            maxKudos: 2000,
            // Délai avant de réessayer après une erreur
            error: 5000,
            // Délai avant de réessayer après une pause
            pause: 30000,
            // Délai avant de nettoyer les entrées traitées
            cleanup: 3600000
        },

        // Limites
        limits: {
            // Nombre maximum d'erreurs avant pause
            maxErrors: 5,
            // Nombre maximum de tentatives de kudos par entrée
            maxKudosAttempts: 3,
            // Nombre maximum d'entrées traitées
            maxProcessedEntries: 1000,
            // Âge maximum des entrées à traiter (en heures)
            maxEntryAge: 24,
            // Taille maximale du cache
            maxCacheSize: 1000
        },

        // Configuration des performances
        performance: {
            // Seuil de performance pour les requêtes DOM
            queryThreshold: 100,
            // Seuil de performance pour les mutations
            mutationThreshold: 200,
            // Taux d'erreur maximum
            errorThreshold: 0.2,
            // Taille maximale du cache des sélecteurs
            maxSelectorCache: 100,
            // Durée de vie du cache des sélecteurs
            selectorCacheTimeout: 5000
        }
    };

    console.log("[Strava Auto Kudos] Configuration chargée");
}

// Exporter la configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CONFIG;
}
