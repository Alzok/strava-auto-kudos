/**
 * Module de gestion des kudos
 * @module KudosManager
 */
console.log("[Strava Auto Kudos] KudosManager module loading");

// Vérifier si KudosManager est déjà défini
if (typeof window.KudosManager === 'undefined') {
    window.KudosManager = {
        /**
         * Configuration du gestionnaire de kudos
         * @type {Object}
         */
        config: {
            batchSize: 5,
            minDelay: 100,
            maxDelay: 300,
            maxConcurrent: 3,
            retryDelay: 1000,
            maxRetries: 3,
            domCheckInterval: 1000, // Intervalle de vérification du DOM
            maxDomChecks: 5, // Nombre maximum de vérifications du DOM
            performance: {
                maxBatchSize: 10,
                minBatchSize: 2,
                batchSizeAdjustment: 1,
                performanceCheckInterval: 5000,
                successThreshold: 0.8,
                errorThreshold: 0.3
            },
            errorHandling: {
                maxConsecutiveErrors: 5,
                errorCooldown: 30000, // 30 secondes
                errorTypes: {
                    DOM: 'DOM_ERROR',
                    NETWORK: 'NETWORK_ERROR',
                    RATE_LIMIT: 'RATE_LIMIT_ERROR',
                    SERVER: 'SERVER_ERROR',
                    UNKNOWN: 'UNKNOWN_ERROR'
                },
                errorSeverity: {
                    LOW: 1,
                    MEDIUM: 2,
                    HIGH: 3,
                    CRITICAL: 4
                }
            }
        },

        /**
         * État des performances
         * @type {Object}
         */
        performanceState: {
            lastCheck: 0,
            currentBatchSize: 5,
            successCount: 0,
            errorCount: 0,
            processingTime: 0,
            isOptimizing: false,
            consecutiveErrors: 0,
            lastError: null,
            errorHistory: [],
            maxErrorHistory: 10
        },

        /**
         * Initialise le gestionnaire de kudos
         */
        init() {
            console.log("[Strava Auto Kudos] Initialisation du gestionnaire de kudos");
            
            // Vérifier si l'extension est activée
            if (!StateManager.isEnabled()) {
                console.log("[Strava Auto Kudos] Extension désactivée, pas de traitement");
                return;
            }

            // Attendre que le DOM soit chargé
            if (document.readyState === 'loading') {
                console.log("[Strava Auto Kudos] DOM en cours de chargement, attente...");
                document.addEventListener('DOMContentLoaded', () => this.startProcessing());
            } else {
                console.log("[Strava Auto Kudos] DOM déjà chargé, démarrage immédiat");
                this.startProcessing();
            }
        },

        async startProcessing() {
            console.log("[Strava Auto Kudos] Démarrage du traitement");
            
            // Attendre que les entrées soient chargées
            console.log("[Strava Auto Kudos] Attente du chargement des entrées du flux...");
            await this.waitForDOM();
            
            // Démarrer le traitement
            console.log("[Strava Auto Kudos] Lancement du traitement des entrées");
            await this.processEntries();
        },

        /**
         * Analyse une erreur et détermine son type et sa sévérité
         * @param {Error} error - L'erreur à analyser
         * @returns {Object} Informations sur l'erreur
         */
        analyzeError(error) {
            const errorInfo = {
                type: this.config.errorHandling.errorTypes.UNKNOWN,
                severity: this.config.errorHandling.errorSeverity.LOW,
                message: error.message || 'Erreur inconnue',
                timestamp: Date.now(),
                retryable: true
            };

            // Déterminer le type d'erreur
            if (error.name === 'NetworkError' || error.message.includes('network')) {
                errorInfo.type = this.config.errorHandling.errorTypes.NETWORK;
                errorInfo.severity = this.config.errorHandling.errorSeverity.MEDIUM;
            } else if (error.message.includes('429') || error.message.includes('rate limit')) {
                errorInfo.type = this.config.errorHandling.errorTypes.RATE_LIMIT;
                errorInfo.severity = this.config.errorHandling.errorSeverity.HIGH;
                errorInfo.retryable = false;
            } else if (error.message.includes('500') || error.message.includes('server')) {
                errorInfo.type = this.config.errorHandling.errorTypes.SERVER;
                errorInfo.severity = this.config.errorHandling.errorSeverity.MEDIUM;
            } else if (error.message.includes('DOM') || error.message.includes('element')) {
                errorInfo.type = this.config.errorHandling.errorTypes.DOM;
                errorInfo.severity = this.config.errorHandling.errorSeverity.LOW;
            }

            return errorInfo;
        },

        /**
         * Gère une erreur et met à jour l'état en conséquence
         * @param {Error} error - L'erreur à gérer
         * @param {string} context - Le contexte de l'erreur
         */
        handleError(error, context) {
            const errorInfo = this.analyzeError(error);
            
            // Mettre à jour l'historique des erreurs
            this.performanceState.errorHistory.push(errorInfo);
            if (this.performanceState.errorHistory.length > this.config.errorHandling.maxErrorHistory) {
                this.performanceState.errorHistory.shift();
            }

            // Mettre à jour les compteurs
            this.performanceState.errorCount++;
            this.performanceState.consecutiveErrors++;
            this.performanceState.lastError = errorInfo;

            // Logger l'erreur avec le contexte
            Logger.error(`Erreur dans ${context}:`, {
                type: errorInfo.type,
                severity: errorInfo.severity,
                message: errorInfo.message,
                consecutiveErrors: this.performanceState.consecutiveErrors
            });

            // Gérer les erreurs consécutives
            if (this.performanceState.consecutiveErrors >= this.config.errorHandling.maxConsecutiveErrors) {
                this.handleConsecutiveErrors();
            }

            // Émettre un événement d'erreur
            App.emit('kudosError', {
                error: errorInfo,
                context,
                stats: this.getPerformanceStats()
            });
        },

        /**
         * Gère les erreurs consécutives
         */
        handleConsecutiveErrors() {
            const now = Date.now();
            const lastErrorTime = this.performanceState.lastError?.timestamp || 0;
            
            // Si on est dans la période de cooldown, on met en pause
            if (now - lastErrorTime < this.config.errorHandling.errorCooldown) {
                const pauseDuration = this.config.errorHandling.errorCooldown;
                StateManager.pause(pauseDuration);
                NotificationManager.showError(`Trop d'erreurs consécutives. Pause de ${Utils.formatDuration(pauseDuration)}`);
            }

            // Réduire la taille du batch
            this.performanceState.currentBatchSize = Math.max(
                this.config.performance.minBatchSize,
                this.performanceState.currentBatchSize - this.config.performance.batchSizeAdjustment
            );
        },

        /**
         * Réinitialise le compteur d'erreurs consécutives
         */
        resetConsecutiveErrors() {
            this.performanceState.consecutiveErrors = 0;
            this.performanceState.lastError = null;
        },

        /**
         * Récupère les statistiques de performance
         * @returns {Object} Les statistiques
         */
        getPerformanceStats() {
            return {
                successCount: this.performanceState.successCount,
                errorCount: this.performanceState.errorCount,
                consecutiveErrors: this.performanceState.consecutiveErrors,
                currentBatchSize: this.performanceState.currentBatchSize,
                processingTime: this.performanceState.processingTime,
                errorHistory: [...this.performanceState.errorHistory]
            };
        },

        /**
         * Active ou désactive les kudos automatiques
         * @param {boolean} enabled - L'état souhaité
         */
        async toggleAutoKudos(enabled) {
            try {
                // Si on désactive, on arrête immédiatement
                if (!enabled) {
                    StateManager.setEnabled(false);
                    return;
                }

                // Si on active, on vérifie d'abord l'état de pause
                if (StateManager.isPaused()) {
                    Logger.info('Extension en pause, activation différée');
                    return;
                }

                // Vérifier la connexion réseau
                if (!await NetworkManager.checkConnection()) {
                    Logger.warn('Pas de connexion réseau, activation impossible');
                    NotificationManager.showError('Pas de connexion réseau');
                    return;
                }

                // Vérifier que le DOM est prêt
                if (!await this.waitForDOM()) {
                    Logger.warn('DOM non prêt, activation impossible');
                    NotificationManager.showError('Page non chargée correctement');
                    return;
                }

                StateManager.setEnabled(true);
                await this.loopKudos();
            } catch (error) {
                Logger.error('Erreur lors de l\'activation des kudos:', error);
                StateManager.handleError(error, 'toggle auto kudos');
                NotificationManager.showError('Erreur lors de l\'activation des kudos');
            }
        },

        /**
         * Attend que le DOM soit prêt
         * @returns {Promise<boolean>} true si le DOM est prêt
         */
        async waitForDOM() {
            let checks = 0;
            const maxChecks = 20; // Augmenter le nombre de vérifications
            const checkInterval = 500; // Réduire l'intervalle pour des vérifications plus fréquentes

            console.log("[Strava Auto Kudos] Attente du chargement des entrées du flux...");
            
            while (checks < maxChecks) {
                const entries = DOMManager.getFeedEntries();
                if (entries && entries.length > 0) {
                    console.log(`[Strava Auto Kudos] ${entries.length} entrées trouvées`);
                    return true;
                }
                
                console.log("[Strava Auto Kudos] Aucune entrée trouvée, nouvelle tentative...");
                await Utils.sleep(checkInterval);
                checks++;
            }
            
            console.warn("[Strava Auto Kudos] Timeout en attendant le chargement des entrées");
            return false;
        },

        /**
         * Charge plus d'entrées dans le flux
         * @returns {Promise<boolean>} true si de nouvelles entrées ont été chargées
         */
        async loadMore() {
            if (!StateManager.isEnabled() || StateManager.isPaused()) return false;

            try {
                return await NetworkManager.retryWithBackoff(async () => {
                    const feedContainer = DOMManager.getFeedContainer();
                    if (!feedContainer) {
                        Logger.warn('Conteneur du flux non trouvé');
                        return false;
                    }

                    const scrollHeight = feedContainer.scrollHeight;
                    feedContainer.scrollTo(0, scrollHeight);
                    await Utils.sleep(1000);

                    const newScrollHeight = feedContainer.scrollHeight;
                    if (newScrollHeight <= scrollHeight) {
                        Logger.debug('Aucune nouvelle entrée chargée');
                        return false;
                    }

                    Logger.debug('Nouvelles entrées chargées');
                    return true;
                });
            } catch (error) {
                Logger.error('Erreur lors du chargement des entrées:', error);
                return false;
            }
        },

        /**
         * Traite les entrées par lots
         * @param {Array<Element>} entries - Les entrées à traiter
         * @returns {Promise<void>}
         */
        async processBatch(entries) {
            if (!entries.length) return { success: true, processed: 0 };

            const startTime = Date.now();
            const batchSize = Math.min(this.performanceState.currentBatchSize, entries.length);
            const batch = entries.slice(0, batchSize);
            const results = [];
            let successCount = 0;

            // Traiter les entrées en parallèle avec un délai entre chaque
            for (const entry of batch) {
                if (!StateManager.isEnabled() || StateManager.isPaused()) break;

                const entryId = this.getEntryId(entry);
                if (StateManager.hasProcessed(entryId)) continue;

                try {
                    const result = await this.processEntry(entry);
                    results.push(result);
                    if (result) successCount++;
                } catch (error) {
                    results.push(false);
                    console.error('Erreur lors du traitement de l\'entrée:', error);
                }

                // Ajouter un délai entre chaque entrée
                await Utils.sleep(Utils.randomIntFromInterval(
                    StateManager.state.delays.min,
                    StateManager.state.delays.max
                ));
            }

            // Mettre à jour les métriques de performance
            const processingTime = Date.now() - startTime;
            this.updatePerformanceMetrics(successCount > 0, processingTime);

            return {
                success: true,
                processed: results.length,
                successCount,
                results
            };
        },

        /**
         * Traite une entrée individuelle
         * @param {Element} entry - L'entrée à traiter
         * @returns {Promise<boolean>} true si le traitement a réussi
         */
        async processEntry(entry) {
            try {
                console.log("[Strava Auto Kudos] Début du traitement d'une entrée");
                
                // Récupérer le bouton kudos avec le sélecteur data-testid
                const kudosButton = entry.querySelector('button[data-testid="kudos_button"]');
                if (!kudosButton) {
                    console.log("[Strava Auto Kudos] Bouton kudos non trouvé dans l'entrée");
                    throw new Error('Bouton kudos non trouvé');
                }

                console.log("[Strava Auto Kudos] Bouton kudos trouvé, analyse détaillée:");
                console.log("[Strava Auto Kudos] Classes du bouton:", kudosButton.className);
                console.log("[Strava Auto Kudos] Attributs du bouton:", {
                    disabled: kudosButton.disabled,
                    title: kudosButton.getAttribute('title'),
                    dataTestId: kudosButton.getAttribute('data-testid')
                });

                // Vérifier si déjà kudos en cherchant l'icône remplie
                const filledKudos = kudosButton.querySelector('svg[data-testid="filled_kudos"]');
                if (filledKudos) {
                    console.log("[Strava Auto Kudos] Kudos déjà donné pour cette entrée (icône remplie trouvée)");
                    return true;
                }

                // Vérifier si le bouton est cliquable
                if (!this.isButtonClickable(kudosButton)) {
                    console.log("[Strava Auto Kudos] Bouton non cliquable (peut-être hors de l'écran ou masqué)");
                    throw new Error('Bouton non cliquable');
                }

                console.log("[Strava Auto Kudos] Tentative de clic sur le bouton kudos");
                // Simuler le clic sur le bouton
                kudosButton.click();

                // Attendre la confirmation avec timeout
                console.log("[Strava Auto Kudos] Attente de la confirmation du kudos");
                const success = await this.waitForKudosConfirmation(kudosButton);
                if (success) {
                    console.log("[Strava Auto Kudos] Kudos confirmé avec succès");
                    return true;
                }

                console.log("[Strava Auto Kudos] Échec de la confirmation du kudos");
                return false;
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors du traitement de l'entrée:", error);
                return false;
            }
        },

        /**
         * Met à jour les métriques de performance
         * @param {boolean} success - Si le traitement a réussi
         * @param {number} processingTime - Temps de traitement en ms
         */
        updatePerformanceMetrics(success, processingTime) {
            const now = Date.now();
            if (success) {
                this.performanceState.successCount++;
            } else {
                this.performanceState.errorCount++;
            }
            this.performanceState.processingTime += processingTime;

            if (now - this.performanceState.lastCheck >= this.config.performance.performanceCheckInterval) {
                this.optimizeBatchSize();
                this.performanceState.lastCheck = now;
                this.performanceState.successCount = 0;
                this.performanceState.errorCount = 0;
                this.performanceState.processingTime = 0;
            }
        },

        /**
         * Optimise la taille des lots en fonction des performances
         */
        optimizeBatchSize() {
            if (this.performanceState.isOptimizing) return;
            this.performanceState.isOptimizing = true;

            const totalAttempts = this.performanceState.successCount + this.performanceState.errorCount;
            if (totalAttempts < 10) {
                this.performanceState.isOptimizing = false;
                return;
            }

            const successRate = this.performanceState.successCount / totalAttempts;
            const avgProcessingTime = this.performanceState.processingTime / totalAttempts;

            if (successRate >= this.config.performance.successThreshold && avgProcessingTime < 1000) {
                // Augmenter la taille du lot si les performances sont bonnes
                this.performanceState.currentBatchSize = Math.min(
                    this.performanceState.currentBatchSize + this.config.performance.batchSizeAdjustment,
                    this.config.performance.maxBatchSize
                );
                Logger.debug(`Performance optimale, augmentation de la taille du lot à ${this.performanceState.currentBatchSize}`);
            } else if (successRate <= this.config.performance.errorThreshold || avgProcessingTime > 2000) {
                // Réduire la taille du lot si les performances sont mauvaises
                this.performanceState.currentBatchSize = Math.max(
                    this.performanceState.currentBatchSize - this.config.performance.batchSizeAdjustment,
                    this.config.performance.minBatchSize
                );
                Logger.debug(`Performance dégradée, réduction de la taille du lot à ${this.performanceState.currentBatchSize}`);
            }

            this.performanceState.isOptimizing = false;
        },

        /**
         * Gère l'événement de défilement
         */
        handleScroll: Utils.debounce(async () => {
            if (!StateManager.isEnabled() || StateManager.isPaused()) return;
            
            try {
                const feedContainer = DOMManager.getFeedContainer();
                if (!feedContainer) {
                    Logger.warn('Conteneur du flux non trouvé lors du défilement');
                    return;
                }

                const { scrollTop, scrollHeight, clientHeight } = feedContainer;
                if (scrollHeight - scrollTop - clientHeight < 100) {
                    await KudosManager.loadMore();
                }
            } catch (error) {
                Logger.error('Erreur lors du défilement:', error);
            }
        }, 500),

        /**
         * Boucle principale de traitement des kudos
         */
        async loopKudos() {
            if (!StateManager.isEnabled() || StateManager.isPaused()) return;

            try {
                StateManager.setProcessing(true);
                const entries = Array.from(DOMManager.getFeedEntries())
                    .filter(entry => EntryProcessor.isValidEntry(entry));
                
                if (entries.length === 0) {
                    Logger.info('Aucune entrée valide trouvée');
                    return;
                }

                Logger.info(`${entries.length} entrées valides trouvées`);
                
                for (let i = 0; i < entries.length; i += this.performanceState.currentBatchSize) {
                    // Vérifier l'état de pause à chaque lot
                    if (StateManager.isPaused()) {
                        Logger.info('Traitement mis en pause');
                        break;
                    }

                    // Vérifier la connexion réseau
                    if (!await NetworkManager.checkConnection()) {
                        Logger.warn('Connexion réseau perdue, pause du traitement');
                        StateManager.pause(30000); // Pause de 30 secondes
                        break;
                    }

                    const batch = entries.slice(i, i + this.performanceState.currentBatchSize);
                    await this.processBatch(batch);
                }
            } catch (error) {
                Logger.error('Erreur lors du traitement des kudos:', error);
                StateManager.handleError(error, 'envoi des kudos');
                NotificationManager.showError('Erreur lors du traitement des kudos');
            } finally {
                StateManager.setProcessing(false);
            }
        },

        async processEntries() {
            console.log("[Strava Auto Kudos] Début du traitement des entrées");
            
            if (!StateManager.isEnabled()) {
                console.log("[Strava Auto Kudos] Extension désactivée, arrêt du traitement");
                return;
            }

            if (StateManager.isPaused()) {
                console.log("[Strava Auto Kudos] Extension en pause, arrêt du traitement");
                return;
            }

            const entries = DOMManager.getFeedEntries();
            console.log(`[Strava Auto Kudos] ${entries.length} entrées trouvées à traiter`);

            if (!entries.length) {
                console.log("[Strava Auto Kudos] Aucune entrée à traiter");
                return;
            }

            try {
                // Utiliser EntryProcessor pour traiter les entrées
                const result = await EntryProcessor.processBatch(Array.from(entries));
                console.log(`[Strava Auto Kudos] Résultat du traitement:`, {
                    traitées: result.processed,
                    réussies: result.successCount,
                    total: entries.length
                });

                // Mettre à jour le compteur
                if (result.successCount > 0) {
                    const newCount = StateManager.state.kudosCount + result.successCount;
                    StateManager.updateKudosCount(newCount);
                    UI.updateKudosCounter(newCount);
                }
            } catch (error) {
                console.error("[Strava Auto Kudos] Erreur lors du traitement des entrées:", error);
                await StateManager.pause(5000); // Pause de 5 secondes en cas d'erreur
            }

            console.log("[Strava Auto Kudos] Traitement des entrées terminé");
        }
    };
    console.log("[Strava Auto Kudos] Module KudosManager initialisé");
}

// Exporter le module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.KudosManager;
}
