/**
 * Module de templates HTML pour l'interface utilisateur
 * @module Templates
 */
console.log("[Strava Auto Kudos] Initialisation du module Templates");

// Vérifier si Templates est déjà défini
if (typeof window.Templates === 'undefined') {
    window.Templates = {
        /**
         * Template pour la bulle d'assistant
         * @returns {string} HTML de la bulle
         */
        bubble() {
            console.log("[Strava Auto Kudos] Génération du template de la bulle");
            return `
                <div id="strava-auto-kudos-container" class="social_assistant_container">
                    <div class="social_assistant_bulle strava">
                        <button class="social_assistant_button">
                            <span class="button-icon">👍</span>
                        </button>
                        <div class="kudos-counter">0</div>
                        <div class="dropdown" style="display: none;">
                            <div class="stats">
                                <div class="stat-item">
                                    <span class="stat-label">Kudos envoyés:</span>
                                    <span class="stat-value kudos-count">0</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Taux de succès:</span>
                                    <span class="stat-value success-rate">0%</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">État:</span>
                                    <span class="stat-value status">Actif</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Template pour une notification
         * @param {string} message - Le message de la notification
         * @param {string} type - Le type de notification (error, warning, info, debug)
         * @param {number} priority - La priorité de la notification
         * @param {number} duration - La durée d'affichage en ms
         * @returns {string} Le HTML de la notification
         */
        notification: (message, type = 'info', priority = 3, duration = 5000) => {
            const icon = Templates.icons[type] || Templates.icons.info;
            return `
                <div class="notification notification-${type}" 
                     data-priority="${priority}" 
                     data-duration="${duration}">
                    <div class="notification-content">
                        <span class="notification-icon">${icon}</span>
                        <span class="notification-message">${message}</span>
                    </div>
                    <button class="notification-close" title="Fermer">×</button>
                </div>
            `;
        },

        /**
         * Template pour le conteneur de notifications
         * @returns {string} HTML du conteneur
         */
        notificationContainer: () => `
            <div id="strava-auto-kudos-notifications" class="notification-container"></div>
        `,

        /**
         * Template pour le timer de pause
         * @param {string} timeString - Temps restant formaté
         * @returns {string} HTML du timer
         */
        pauseTimer(timeString) {
            return `
                <div id="strava-auto-kudos-timer" class="pause-timer">
                    <span class="timer-icon">⏸️</span>
                    <span class="timer-value">${timeString}</span>
                </div>
            `;
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
            </svg>`,
            info: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>
            </svg>`
        },

        // Templates HTML
        notification: (isEnabled = true) => `
            <div id="strava-auto-kudos-container" class="${isEnabled ? '' : 'paused'}">
                <div id="strava-auto-kudos-bubble" class="social_assistant_bulle strava">
                    <div class="icon-container">
                        ${isEnabled ? Templates.icons.thumbsUp : Templates.icons.pause}
                    </div>
                </div>
                <div class="kudos-counter">0</div>
            </div>
        `,

        timer: (timeString) => `
            <div id="strava-auto-kudos-timer">
                ${timeString}
                <span id="cancel-pause">×</span>
            </div>
        `
    };

    console.log("[Strava Auto Kudos] Module Templates initialisé");
}

// Exporter le module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.Templates;
} 