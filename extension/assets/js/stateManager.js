/**
 * Module de gestion de l'état de l'extension
 * @module StateManager
 */
console.log("[Strava Auto Kudos] StateManager module loading");

// Vérifier si StateManager est déjà défini
if (typeof window.StateManager === 'undefined') {
    window.StateManager = {
        /**
         * État de l'extension
         * @type {Object}
         */
        state: {
            enabled: false,
            kudosCount: 0,
            processedEntries: new Set(),
            pauseUntil: null,
            errors: [],
            maxErrors: window.CONFIG.limits.maxErrors || 5,
            lastSync: null,
            delays: {
                min: 100,
                max: 200
            },
            kudosAttempts: 0,
            kudosSuccesses: 0,
            kudosErrors: 0,
            errorCount: 0,
            isProcessing: false,
            maxProcessedEntries: 1000
        },

        /**
         * Initialise le gestionnaire d'état
         */
        init() {
            console.log("[Strava Auto Kudos] Initialisation du StateManager");
            this.loadState();
            this.setupStorageListener();
            this.startPeriodicCleanup();
        },

        /**
         * Charge l'état depuis le stockage local
         */
        loadState() {
            if (!Storage.isAvailable()) {
                console.error("[Strava Auto Kudos] Le stockage local n'est pas disponible");
                return;
            }

            try {
                const savedState = Storage.get('state');
                if (savedState) {
                    this.state = {
                        ...this.state,
                        ...savedState,
                        processedEntries: new Set(savedState.processedEntries || [])
                    };
                    console.log("[Strava Auto Kudos] État chargé:", this.state);
                } else {
                    console.log("[Strava Auto Kudos] Aucun état sauvegardé trouvé");
                }
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors du chargement de l'état:", error);
            }
        },

        /**
         * Configure l'écouteur de changements du stockage
         */
        setupStorageListener() {
            window.addEventListener('storage', (event) => {
                if (event.key === 'state') {
                    this.loadState();
                }
            });
        },

        /**
         * Démarre le nettoyage périodique des entrées traitées
         */
        startPeriodicCleanup() {
            setInterval(() => {
                this.cleanupProcessedEntries();
            }, window.CONFIG.delays.cleanup || 3600000); // Par défaut: 1 heure
        },

        /**
         * Nettoie les entrées traitées anciennes
         */
        cleanupProcessedEntries() {
            const maxEntries = window.CONFIG.limits.maxEntries || 1000;
            if (this.state.processedEntries.size > maxEntries) {
                const entries = Array.from(this.state.processedEntries);
                const toRemove = entries.slice(0, entries.length - maxEntries);
                toRemove.forEach(entry => {
                    this.state.processedEntries.delete(entry);
                });
                this.saveState();
            }
        },

        /**
         * Sauvegarde l'état dans le stockage local
         */
        saveState() {
            Storage.set('state', {
                ...this.state,
                processedEntries: Array.from(this.state.processedEntries)
            });
        },

        /**
         * Active ou désactive l'extension
         * @param {boolean} enabled - Nouvel état
         */
        setEnabled(enabled) {
            this.state.enabled = enabled;
            this.saveState();
            console.log(`[Strava Auto Kudos] Extension ${enabled ? 'activée' : 'désactivée'}`);
        },

        /**
         * Vérifie si l'extension est activée
         * @returns {boolean} État d'activation
         */
        isEnabled() {
            return this.state.enabled;
        },

        /**
         * Incrémente le compteur de kudos
         */
        incrementKudosCount() {
            this.state.kudosCount++;
            this.saveState();
        },

        /**
         * Récupère le nombre de kudos donnés
         * @returns {number} Nombre de kudos
         */
        getKudosCount() {
            return this.state.kudosCount;
        },

        /**
         * Marque une entrée comme traitée
         * @param {string} entryId - Identifiant de l'entrée
         */
        markProcessed(entryId) {
            this.state.processedEntries.add(entryId);
            this.saveState();
        },

        /**
         * Vérifie si une entrée a été traitée
         * @param {string} entryId - Identifiant de l'entrée
         * @returns {boolean} true si l'entrée a été traitée
         */
        hasProcessed(entryId) {
            return this.state.processedEntries.has(entryId);
        },

        /**
         * Met l'extension en pause
         * @param {number} duration - Durée de la pause en ms
         */
        pause(duration) {
            this.state.pauseUntil = Date.now() + duration;
            this.saveState();
            console.log(`[Strava Auto Kudos] Extension en pause pour ${duration}ms`);
        },

        /**
         * Vérifie si l'extension est en pause
         * @returns {boolean} true si l'extension est en pause
         */
        isPaused() {
            if (!this.state.pauseUntil) return false;
            const stillPaused = Date.now() < this.state.pauseUntil;
            if (!stillPaused) {
                this.state.pauseUntil = null;
                this.saveState();
            }
            return stillPaused;
        },

        /**
         * Ajoute une erreur à l'historique
         * @param {Error} error - L'erreur à ajouter
         */
        addError(error) {
            this.state.errors.push({
                message: error.message,
                timestamp: Date.now()
            });
            
            // Nettoyer les anciennes erreurs
            const oneHourAgo = Date.now() - 3600000;
            this.state.errors = this.state.errors.filter(e => e.timestamp > oneHourAgo);
            
            this.saveState();

            // Vérifier si on doit mettre en pause
            if (this.state.errors.length >= this.state.maxErrors) {
                this.pause(window.CONFIG.delays.pause || 30000);
            }
        },

        /**
         * Récupère les erreurs récentes
         * @returns {Array} Liste des erreurs
         */
        getErrors() {
            return [...this.state.errors];
        },

        /**
         * Réinitialise l'état
         */
        reset() {
            this.state = {
                enabled: false,
                kudosCount: 0,
                processedEntries: new Set(),
                pauseUntil: null,
                errors: [],
                maxErrors: window.CONFIG.limits.maxErrors || 5,
                lastSync: null,
                delays: {
                    min: 100,
                    max: 200
                },
                kudosAttempts: 0,
                kudosSuccesses: 0,
                kudosErrors: 0,
                errorCount: 0,
                isProcessing: false,
                maxProcessedEntries: 1000
            };
            this.saveState();
            console.log("[Strava Auto Kudos] État réinitialisé");
        },

        /**
         * Gère une erreur
         * @param {Error} error - L'erreur à gérer
         * @param {string} context - Le contexte de l'erreur
         */
        handleError(error, context) {
            Logger.error(`Erreur dans ${context}:`, error);
            this.incrementErrorCount();
        },

        /**
         * Récupère les délais actuels
         * @returns {Object} Les délais actuels
         */
        getDelays() {
            return this.state.delays;
        },

        /**
         * Met à jour les délais en fonction du taux de succès
         * @param {number} successRate - Le taux de succès
         */
        updateDelays(successRate) {
            const { min, max } = this.state.delays;
            const adjustment = successRate > 0.8 ? -0.1 : successRate < 0.5 ? 0.1 : 0;
            
            this.state.delays = {
                min: Math.max(100, Math.floor(min * (1 + adjustment))),
                max: Math.max(200, Math.floor(max * (1 + adjustment)))
            };
            this.saveState();
        },

        /**
         * Récupère les statistiques des kudos
         * @returns {Object} Les statistiques
         */
        getKudosStats() {
            return {
                total: this.state.kudosAttempts,
                success: this.state.kudosSuccesses,
                error: this.state.kudosErrors,
                successRate: this.state.kudosAttempts > 0 
                    ? this.state.kudosSuccesses / this.state.kudosAttempts 
                    : 0
            };
        },

        /**
         * Récupère le nombre de traitements pour une entrée
         * @param {string} entryId - L'ID de l'entrée
         * @returns {number} Le nombre de traitements
         */
        getProcessCount(entryId) {
            return this.state.processedEntries.get(entryId)?.count || 0;
        },

        /**
         * Vérifie si le traitement est en cours
         * @returns {boolean} true si le traitement est en cours
         */
        isProcessing() {
            return this.state.isProcessing;
        },

        /**
         * Définit l'état de traitement
         * @param {boolean} value - La valeur à définir
         */
        setProcessing(value) {
            this.state.isProcessing = value;
            this.saveState();
        },

        /**
         * Récupère le nombre maximum d'entrées traitées
         * @returns {number} Le nombre maximum
         */
        getMaxProcessedEntries() {
            return this.state.maxProcessedEntries;
        },

        /**
         * Incrémente le compteur d'erreurs
         */
        incrementErrorCount() {
            this.state.errorCount = (this.state.errorCount || 0) + 1;
            this.saveState();
        },

        /**
         * Récupère le nombre d'erreurs
         * @returns {number} Le nombre d'erreurs
         */
        getErrorCount() {
            return this.state.errorCount || 0;
        },

        /**
         * Réinitialise le compteur d'erreurs
         */
        resetErrorCount() {
            this.state.errorCount = 0;
            this.saveState();
        }
    };

    console.log("[Strava Auto Kudos] Module StateManager initialisé");
}

// Exporter le module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.StateManager;
} 