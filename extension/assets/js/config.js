/**
 * Configuration globale pour les paramètres ajustables
 */
console.log("[Strava Auto Kudos] Config module loading");
const CONFIG = {
    // Délai entre les kudos (en ms)
    kudosDelay: {
        min: 100,   // Réduit de 300 à 100 ms
        max: 300,   // Réduit de 700 à 300 ms
        // Délais utilisés en cas d'erreurs 429
        backoffMin: 1000,
        backoffMax: 2000,
        // Délai de récupération après trop de requêtes
        recoveryDelay: 30000
    },
    // Sélecteurs CSS pour les éléments de la page
    selectors: {
        userMenuLink: ".user-menu a.nav-link.selection",
        feedEntry: 'div[data-testid="web-feed-entry"]',
        groupActivityList: '.------packages-core-feed-feature-feed-src-features-GroupActivity-GroupActivity-module__listEntries--t1Zbp',
        groupActivityItem: '.------packages-core-feed-feature-feed-src-features-GroupActivity-GroupActivity-module__listEntries--t1Zbp > li',
        ownerName: "a[data-testid='owners-name']",
        kudosButton: "button[data-testid='kudos_button']",
        unfilledKudos: "svg[data-testid='unfilled_kudos']",
        filledKudos: "svg[data-testid='filled_kudos']",
        feedContainer: ".feature-feed"
    },
    // Classes pour les éléments UI
    classes: {
        bulle: "social_assistant_bulle strava",
        run: "run",
        counter: "kudos-counter",
        floatingNotification: "floating-notification",
        success: "success",
        error: "error"
    },
    // URLs
    urls: {
        dashboard: "https://www.strava.com/dashboard?num_entries=500",
        baseDashboard: "https://www.strava.com/dashboard"
    },
    // État de l'application
    state: {
        processedEntries: new Set(),
        failedKudos: [],
        isProcessing: false,
        isEnabled: true,
        retryActive: false,
        errorCount: 0,
        kudosCount: 0,
        scrollTimeout: null,
        scrollThreshold: 200 // pixels from bottom to trigger loading more
    },
    // Clés pour le stockage local
    storage: {
        enabled: "strava_auto_kudos_enabled",
        kudosCount: "strava_auto_kudos_count",
        pauseUntil: "strava_auto_kudos_pause_until" // Timestamp jusqu'auquel l'extension est en pause
    },
    // Icônes SVG
    icons: {
        thumbsUp: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' data-testid='unfilled_kudos' height='16' width='16'>
            <path d='M15 6.633C15 5.848 14.394 5 13.416 5h-3.362c.208-.742.374-1.599.262-2.188-.24-1.257-1.57-2.044-1.835-2.189a1 1 0 00-1.469.725l-.307 1.996-2.44 4.522-3.124 1.201a1 1 0 00-.567 1.311l1.833 4.5a1 1 0 001.305.548L7.197 14h4.613c.833 0 1.549-.656 1.664-1.52l.275-1.923c.531-.406.83-.979.83-1.602 0-.274-.062-.572-.166-.83.378-.378.587-.901.587-1.492zM3.333 14.5L1.5 10l2.047-.787 1.816 4.456-2.03.831zm10.18-6.931a.502.502 0 00-.121.756c.075.086.187.381.187.63 0 .473-.35.761-.558.891a.503.503 0 00-.231.354l-.307 2.144c-.049.367-.345.656-.673.656H7l-.712.291L4.48 8.855l.49-.188 2.697-5L8 1.5s1.169.641 1.333 1.5c.164.859-.667 3-.667 3h4.749c.361 0 .585.329.585.633 0 .241-.063.681-.487.936z' id='actions_kudo_normal_xsmall_svg__Icons'></path>
        </svg>`,
        pause: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" height="16" width="16">
            <path d="M4.5 2C3.67 2 3 2.67 3 3.5v9c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-9C6 2.67 5.33 2 4.5 2zm7 0c-.83 0-1.5.67-1.5 1.5v9c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-9c0-.83-.67-1.5-1.5-1.5z" fill="white"/>
        </svg>`,
        floatingSuccess: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
        </svg>`,
        floatingError: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M18.3 5.71c-.39-.39-1.02-.39-1.41 0L12 10.59 7.11 5.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.59 12 5.7 16.89c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l4.89 4.89c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z" fill="currentColor"/>
        </svg>`
    }
};

// Exporter la configuration pour l'utiliser dans d'autres modules
if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
