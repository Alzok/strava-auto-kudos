/**
 * Module de traitement des entrées du flux
 * @module EntryProcessor
 */
console.log("[Strava Auto Kudos] EntryProcessor module loading");

// Créer le module EntryProcessor
const EntryProcessor = {
    /**
     * Configuration du processeur d'entrées
     * @type {Object}
     */
    config: {
        maxRetries: 3,
        retryDelay: 1000,
        performance: {
            maxBatchSize: 10,
            minBatchSize: 2,
            batchSizeAdjustment: 1,
            performanceCheckInterval: 5000,
            successThreshold: 0.8,
            errorThreshold: 0.3,
            maxProcessingTime: 5000,
            minProcessingTime: 100,
            targetSuccessRate: 0.9,
            targetProcessingTime: 2000,
            adaptationRate: 0.2,
            maxConsecutiveErrors: 3,
            cooldownPeriod: 30000,
            cacheDuration: 300000, // 5 minutes
            maxCacheSize: 1000,
            batchOptimizationInterval: 60000, // 1 minute
            performanceHistorySize: 100
        },
        validation: {
            maxContentLength: 1000,
            minContentLength: 10,
            requiredAttributes: ['data-activity-id', 'data-testid'],
            maxAge: 7 * 24 * 60 * 60 * 1000,
            requiredSelectors: ['.entry-content', '.kudos-button'],
            maxNestedLevel: 10,
            contentTypes: ['activity', 'challenge', 'group'],
            maxDuplicates: 3,
            validationCache: {
                enabled: true,
                duration: 60000, // 1 minute
                maxSize: 1000
            }
        },
        cleanup: {
            interval: 3600000,
            maxHistory: 1000,
            maxErrorHistory: 100,
            maxStatsAge: 24 * 3600000,
            cacheCleanupInterval: 300000 // 5 minutes
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
        entryStats: {
            total: 0,
            valid: 0,
            invalid: 0,
            skipped: 0,
            processed: 0,
            errors: 0,
            duplicates: 0,
            cached: 0
        },
        history: [],
        errorHistory: [],
        batchHistory: [],
        consecutiveErrors: 0,
        lastError: null,
        lastSuccess: null,
        avgProcessingTime: 0,
        successRate: 1,
        optimizationHistory: [],
        validationCache: new Map(),
        processingCache: new Map(),
        lastCacheCleanup: Date.now(),
        performanceMetrics: {
            validationTime: [],
            processingTime: [],
            batchSuccessRate: [],
            errorRate: []
        }
    },

    /**
     * Compteur global pour la génération d'ID unique
     * @type {number}
     * @private
     */
    _idCounter: 0,

    /**
     * Initialise le processeur d'entrées
     */
    init() {
        this.startCacheCleanup();
        this.startPerformanceMonitoring();
        Logger.info('EntryProcessor initialisé');
    },

    /**
     * Démarre le nettoyage périodique du cache
     */
    startCacheCleanup() {
        setInterval(() => this.cleanupCache(), this.config.cleanup.cacheCleanupInterval);
    },

    /**
     * Démarre le monitoring des performances
     */
    startPerformanceMonitoring() {
        setInterval(() => this.monitorPerformance(), this.config.performance.batchOptimizationInterval);
    },

    /**
     * Nettoie le cache
     */
    cleanupCache() {
        const now = Date.now();
        const { validationCache, processingCache } = this.performanceState;
        const { maxSize, duration } = this.config.validation.validationCache;

        // Nettoyer le cache de validation
        for (const [key, value] of validationCache.entries()) {
            if (now - value.timestamp > duration) {
                validationCache.delete(key);
            }
        }

        // Nettoyer le cache de traitement
        for (const [key, value] of processingCache.entries()) {
            if (now - value.timestamp > this.config.performance.cacheDuration) {
                processingCache.delete(key);
            }
        }

        // Limiter la taille des caches
        if (validationCache.size > maxSize) {
            const entriesToRemove = Array.from(validationCache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)
                .slice(0, validationCache.size - maxSize);
            entriesToRemove.forEach(([key]) => validationCache.delete(key));
        }

        this.performanceState.lastCacheCleanup = now;
        Logger.debug('Cache nettoyé');
    },

    /**
     * Surveille les performances et ajuste les paramètres si nécessaire
     */
    monitorPerformance() {
        const now = Date.now();
        if (now - this.performanceState.lastCheck < this.config.performance.performanceCheckInterval) {
            return;
        }

        const { successCount, errorCount, processingTime } = this.performanceState;
        const total = successCount + errorCount;
        const successRate = total > 0 ? successCount / total : 0;

        // Ajuster la taille du batch en fonction des performances
        if (successRate < this.config.performance.successThreshold) {
            this.decreaseBatchSize();
        } else if (successRate > this.config.performance.targetSuccessRate) {
            this.increaseBatchSize();
        }

        // Mettre à jour les métriques
        this.updatePerformanceMetrics(successRate, processingTime);

        this.performanceState.lastCheck = now;
    },

    /**
     * Augmente la taille du batch
     */
    increaseBatchSize() {
        const { currentBatchSize } = this.performanceState;
        const { maxBatchSize, batchSizeAdjustment } = this.config.performance;
        
        if (currentBatchSize < maxBatchSize) {
            this.performanceState.currentBatchSize = Math.min(
                currentBatchSize + batchSizeAdjustment,
                maxBatchSize
            );
            Logger.debug(`Taille du batch augmentée à ${this.performanceState.currentBatchSize}`);
        }
    },

    /**
     * Diminue la taille du batch
     */
    decreaseBatchSize() {
        const { currentBatchSize } = this.performanceState;
        const { minBatchSize, batchSizeAdjustment } = this.config.performance;
        
        if (currentBatchSize > minBatchSize) {
            this.performanceState.currentBatchSize = Math.max(
                currentBatchSize - batchSizeAdjustment,
                minBatchSize
            );
            Logger.debug(`Taille du batch diminuée à ${this.performanceState.currentBatchSize}`);
        }
    },

    /**
     * Met à jour les métriques de performance
     * @param {number} successRate - Taux de succès
     * @param {number} processingTime - Temps de traitement
     */
    updatePerformanceMetrics(successRate, processingTime) {
        const { performanceMetrics } = this.performanceState;
        const { performanceHistorySize } = this.config.performance;

        // Ajouter les nouvelles métriques
        performanceMetrics.batchSuccessRate.push(successRate);
        performanceMetrics.processingTime.push(processingTime);
        performanceMetrics.errorRate.push(1 - successRate);

        // Limiter la taille des tableaux
        if (performanceMetrics.batchSuccessRate.length > performanceHistorySize) {
            performanceMetrics.batchSuccessRate.shift();
            performanceMetrics.processingTime.shift();
            performanceMetrics.errorRate.shift();
        }

        // Calculer les moyennes
        this.performanceState.avgProcessingTime = performanceMetrics.processingTime.reduce((a, b) => a + b, 0) / performanceMetrics.processingTime.length;
        this.performanceState.successRate = performanceMetrics.batchSuccessRate.reduce((a, b) => a + b, 0) / performanceMetrics.batchSuccessRate.length;
    },

    /**
     * Traite un lot d'entrées
     * @param {Array<Element>} entries - Les entrées à traiter
     * @returns {Promise<Object>} Résultat du traitement
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
                Logger.error('Erreur lors du traitement de l\'entrée:', error);
            }

            // Ajouter un délai entre chaque entrée
            await Utils.sleep(Utils.randomIntFromInterval(
                StateManager.state.delays.min,
                StateManager.state.delays.max
            ));
        }

        // Mettre à jour les métriques de performance
        const processingTime = Date.now() - startTime;
        this.updateBatchMetrics({
            successCount,
            totalCount: results.length,
            processingTime,
            results
        });

        return {
            success: true,
            processed: results.length,
            successCount,
            results
        };
    },

    /**
     * Met à jour les métriques du lot
     * @param {Object} metrics - Les métriques du lot
     */
    updateBatchMetrics(metrics) {
        const { successCount, totalCount, processingTime, results } = metrics;
        const state = this.performanceState;

        // Mettre à jour les statistiques
        state.entryStats.processed += totalCount;
        state.entryStats.errors += totalCount - successCount;

        // Calculer les métriques de performance
        const successRate = successCount / totalCount;
        const errorRate = (totalCount - successCount) / totalCount;

        // Ajouter aux métriques de performance
        state.performanceMetrics.batchSuccessRate.push(successRate);
        state.performanceMetrics.errorRate.push(errorRate);
        state.performanceMetrics.processingTime.push(processingTime);

        // Limiter la taille des métriques
        const maxSize = this.config.performance.performanceHistorySize;
        Object.keys(state.performanceMetrics).forEach(key => {
            if (state.performanceMetrics[key].length > maxSize) {
                state.performanceMetrics[key] = state.performanceMetrics[key].slice(-maxSize);
            }
        });

        // Mettre à jour l'historique des lots
        state.batchHistory.push({
            timestamp: Date.now(),
            totalCount,
            successCount,
            processingTime,
            successRate,
            errorRate
        });

        // Nettoyer l'historique si nécessaire
        this.cleanupHistory();
    },

    /**
     * Nettoie l'historique des performances
     */
    cleanupHistory() {
        const now = Date.now();
        const maxAge = this.config.cleanup.maxStatsAge;

        this.performanceState.history = this.performanceState.history
            .filter(entry => now - entry.timestamp < maxAge)
            .slice(-this.config.cleanup.maxHistory);

        this.performanceState.errorHistory = this.performanceState.errorHistory
            .filter(entry => now - entry.timestamp < maxAge)
            .slice(-this.config.cleanup.maxErrorHistory);

        this.performanceState.batchHistory = this.performanceState.batchHistory
            .filter(entry => now - entry.timestamp < maxAge)
            .slice(-this.config.cleanup.maxHistory);

        this.performanceState.optimizationHistory = this.performanceState.optimizationHistory
            .filter(entry => now - entry.timestamp < maxAge)
            .slice(-this.config.cleanup.maxHistory);
    },

    /**
     * Traite une entrée du flux
     * @param {Element} entry - L'élément à traiter
     * @returns {Promise<boolean>} true si le traitement a réussi
     */
    async processEntry(entry) {
        try {
            // Vérifier si l'entrée est déjà en cache
            const entryId = this.getEntryId(entry);
            if (this.isCached(entryId)) {
                this.performanceState.entryStats.cached++;
                return true;
            }

            // Valider l'entrée
            const validationResult = this.validateEntry(entry);
            if (!validationResult.isValid) {
                this.performanceState.entryStats.invalid++;
                return false;
            }

            // Traiter l'entrée
            const startTime = Date.now();
            const result = await this.processEntryContent(entry);
            const processingTime = Date.now() - startTime;

            // Mettre à jour les statistiques
            this.updateEntryStats(result, processingTime);

            // Mettre en cache si réussi
            if (result) {
                this.cacheEntry(entryId);
            }

            return result;
        } catch (error) {
            Logger.error('Erreur lors du traitement de l\'entrée:', error);
            this.performanceState.entryStats.errors++;
            return false;
        }
    },

    /**
     * Génère un ID unique pour une entrée
     * @param {Element} entry - L'élément
     * @returns {string} L'ID unique
     */
    getEntryId(entry) {
        const activityId = entry.getAttribute('data-activity-id');
        if (activityId) {
            return `activity_${activityId}`;
        }

        const activityUrl = entry.querySelector('a[href*="/activities/"]')?.href;
        if (activityUrl) {
            const urlId = activityUrl.match(/\/activities\/(\d+)/)?.[1];
            if (urlId) {
                return `activity_${urlId}`;
            }
        }

        const timestamp = Date.now();
        this._idCounter = (this._idCounter + 1) % 1000000;
        const content = entry.textContent || '';
        const contentHash = this.hashString(content);
        return `entry_${timestamp}_${this._idCounter.toString().padStart(6, '0')}_${contentHash}`;
    },

    /**
     * Génère un hash simple pour une chaîne
     * @param {string} str - La chaîne à hasher
     * @returns {string} Hash de la chaîne
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).substring(0, 8);
    },

    /**
     * Vérifie si une entrée est en cache
     * @param {string} entryId - L'ID de l'entrée
     * @returns {boolean} true si l'entrée est en cache
     */
    isCached(entryId) {
        const { validationCache } = this.performanceState;
        const cached = validationCache.get(entryId);
        return cached && Date.now() - cached.timestamp < this.config.validation.validationCache.duration;
    },

    /**
     * Met une entrée en cache
     * @param {string} entryId - L'ID de l'entrée
     */
    cacheEntry(entryId) {
        const { validationCache } = this.performanceState;
        validationCache.set(entryId, { timestamp: Date.now() });
    },

    /**
     * Valide une entrée
     * @param {Element} entry - L'élément à valider
     * @returns {Object} Résultat de la validation
     */
    validateEntry(entry) {
        const result = {
            isValid: false,
            reason: null,
            details: {}
        };

        try {
            // Vérifier la structure de base
            if (!this.validateBasicStructure(entry)) {
                result.reason = 'INVALID_STRUCTURE';
                return result;
            }

            // Vérifier les attributs requis
            const attributeCheck = this.validateAttributes(entry);
            if (!attributeCheck.isValid) {
                result.reason = attributeCheck.reason;
                result.details = attributeCheck.details;
                return result;
            }

            // Vérifier le contenu
            const contentCheck = this.validateContent(entry);
            if (!contentCheck.isValid) {
                result.reason = contentCheck.reason;
                result.details = contentCheck.details;
                return result;
            }

            // Vérifier l'âge
            const ageCheck = this.validateAge(entry);
            if (!ageCheck.isValid) {
                result.reason = ageCheck.reason;
                result.details = ageCheck.details;
                return result;
            }

            // Vérifier les doublons
            const duplicateCheck = this.checkForDuplicates(entry);
            if (!duplicateCheck.isValid) {
                result.reason = duplicateCheck.reason;
                result.details = duplicateCheck.details;
                return result;
            }

            // Vérifier le bouton kudos
            const kudosCheck = this.validateKudosButton(entry);
            if (!kudosCheck.isValid) {
                result.reason = kudosCheck.reason;
                result.details = kudosCheck.details;
                return result;
            }

            result.isValid = true;
            return result;

        } catch (error) {
            result.reason = 'VALIDATION_ERROR';
            result.details.error = error.message;
            return result;
        }
    },

    /**
     * Vérifie la structure de base d'une entrée
     * @param {Element} entry - L'entrée à vérifier
     * @returns {boolean} true si la structure est valide
     */
    validateBasicStructure(entry) {
        if (!entry || !entry.nodeType || entry.nodeType !== 1) {
            return false;
        }

        let depth = 0;
        let current = entry;
        while (current.parentElement && depth < this.config.validation.maxNestedLevel) {
            current = current.parentElement;
            depth++;
        }
        return depth < this.config.validation.maxNestedLevel;
    },

    /**
     * Vérifie les attributs requis
     * @param {Element} entry - L'entrée à vérifier
     * @returns {Object} Résultat de la validation
     */
    validateAttributes(entry) {
        const result = { isValid: true, reason: null, details: {} };
        
        for (const attr of this.config.validation.requiredAttributes) {
            if (!entry.hasAttribute(attr)) {
                result.isValid = false;
                result.reason = 'MISSING_ATTRIBUTE';
                result.details.attribute = attr;
                break;
            }
        }

        return result;
    },

    /**
     * Vérifie le contenu de l'entrée
     * @param {Element} entry - L'entrée à vérifier
     * @returns {Object} Résultat de la validation
     */
    validateContent(entry) {
        const result = { isValid: true, reason: null, details: {} };
        
        const content = entry.textContent || '';
        result.details.length = content.length;

        if (content.length < this.config.validation.minContentLength) {
            result.isValid = false;
            result.reason = 'CONTENT_TOO_SHORT';
            return result;
        }

        if (content.length > this.config.validation.maxContentLength) {
            result.isValid = false;
            result.reason = 'CONTENT_TOO_LONG';
            return result;
        }

        for (const selector of this.config.validation.requiredSelectors) {
            if (!entry.querySelector(selector)) {
                result.isValid = false;
                result.reason = 'MISSING_ELEMENT';
                result.details.selector = selector;
                return result;
            }
        }

        return result;
    },

    /**
     * Vérifie l'âge de l'entrée
     * @param {Element} entry - L'entrée à vérifier
     * @returns {Object} Résultat de la validation
     */
    validateAge(entry) {
        const result = { isValid: true, reason: null, details: {} };
        
        const timestamp = entry.getAttribute('data-timestamp');
        if (timestamp) {
            const age = Date.now() - parseInt(timestamp);
            result.details.age = age;
            
            if (age > this.config.validation.maxAge) {
                result.isValid = false;
                result.reason = 'ENTRY_TOO_OLD';
            }
        }

        return result;
    },

    /**
     * Vérifie les doublons
     * @param {Element} entry - L'entrée à vérifier
     * @returns {Object} Résultat de la validation
     */
    checkForDuplicates(entry) {
        const result = { isValid: true, reason: null, details: {} };
        
        const entryId = this.getEntryId(entry);
        result.details.entryId = entryId;

        if (StateManager.hasProcessed(entryId)) {
            const processCount = StateManager.getProcessCount(entryId);
            result.details.processCount = processCount;

            if (processCount >= this.config.validation.maxDuplicates) {
                result.isValid = false;
                result.reason = 'TOO_MANY_DUPLICATES';
            }
        }

        return result;
    },

    /**
     * Vérifie le bouton kudos
     * @param {Element} entry - L'entrée à vérifier
     * @returns {Object} Résultat de la validation
     */
    validateKudosButton(entry) {
        const result = { isValid: true, reason: null, details: {} };
        
        const kudosButton = DOMManager.getKudosButton(entry);
        if (!kudosButton) {
            result.isValid = false;
            result.reason = 'NO_KUDOS_BUTTON';
            return result;
        }

        if (DOMManager.isKudosFilled(kudosButton)) {
            result.isValid = false;
            result.reason = 'KUDOS_ALREADY_GIVEN';
            return result;
        }

        return result;
    },

    /**
     * Traite le contenu d'une entrée avec retry
     * @param {Element} entry - L'élément à traiter
     * @returns {Promise<boolean>} true si le traitement a réussi
     */
    async processEntryContent(entry) {
        let retryCount = 0;
        const maxRetries = this.config.maxRetries;
        const retryDelay = this.config.retryDelay;

        while (retryCount <= maxRetries) {
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
                    dataTestId: kudosButton.getAttribute('data-testid'),
                    innerHTML: kudosButton.innerHTML
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

                // Si pas de succès, on réessaie
                retryCount++;
                if (retryCount <= maxRetries) {
                    console.log(`[Strava Auto Kudos] Échec du kudos, nouvelle tentative (${retryCount}/${maxRetries})`);
                    await Utils.sleep(retryDelay * retryCount); // Délai exponentiel
                }
            } catch (error) {
                console.error(`[Strava Auto Kudos] Erreur lors du traitement (tentative ${retryCount + 1}/${maxRetries + 1}):`, error.message);
                
                // Gérer les erreurs spécifiques
                if (this.isNetworkError(error)) {
                    console.log("[Strava Auto Kudos] Erreur réseau détectée, pause temporaire");
                    await this.handleNetworkError();
                } else if (this.isStravaError(error)) {
                    console.log("[Strava Auto Kudos] Erreur Strava détectée, pause prolongée");
                    await this.handleStravaError();
                }

                retryCount++;
                if (retryCount <= maxRetries) {
                    await Utils.sleep(retryDelay * retryCount);
                }
            }
        }

        console.log("[Strava Auto Kudos] Échec final du traitement de l'entrée");
        return false;
    },

    /**
     * Vérifie si un bouton est cliquable
     * @param {Element} button - Le bouton à vérifier
     * @returns {boolean} true si le bouton est cliquable
     */
    isButtonClickable(button) {
        if (!button) {
            console.log("[Strava Auto Kudos] Le bouton est null ou undefined");
            return false;
        }
        
        // Vérifier si le bouton est visible
        const style = window.getComputedStyle(button);
        if (style.display === 'none') {
            console.log("[Strava Auto Kudos] Le bouton est masqué (display: none)");
            return false;
        }
        if (style.visibility === 'hidden') {
            console.log("[Strava Auto Kudos] Le bouton est invisible (visibility: hidden)");
            return false;
        }
        if (style.opacity === '0') {
            console.log("[Strava Auto Kudos] Le bouton est transparent (opacity: 0)");
            return false;
        }

        // Vérifier si le bouton est désactivé
        if (button.disabled) {
            console.log("[Strava Auto Kudos] Le bouton est désactivé (disabled)");
            return false;
        }
        if (button.classList.contains('disabled')) {
            console.log("[Strava Auto Kudos] Le bouton a la classe 'disabled'");
            return false;
        }

        // Vérifier si le bouton est dans le viewport
        const rect = button.getBoundingClientRect();
        const isInViewport = (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );

        if (!isInViewport) {
            console.log("[Strava Auto Kudos] Le bouton est hors de l'écran", {
                top: rect.top,
                left: rect.left,
                bottom: rect.bottom,
                right: rect.right,
                windowHeight: window.innerHeight,
                windowWidth: window.innerWidth
            });
            return false;
        }

        console.log("[Strava Auto Kudos] Le bouton est cliquable");
        return true;
    },

    /**
     * Attend la confirmation du kudos avec timeout
     * @param {Element} kudosButton - Le bouton kudos
     * @returns {Promise<boolean>} true si le kudos est confirmé
     */
    async waitForKudosConfirmation(kudosButton) {
        const timeout = 5000; // 5 secondes
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            // Vérifier si l'icône est remplie
            const filledKudos = kudosButton.querySelector('svg[data-testid="filled_kudos"]');
            if (filledKudos) {
                console.log("[Strava Auto Kudos] Confirmation du kudos : icône remplie trouvée");
                return true;
            }

            // Vérifier si le titre a changé
            const title = kudosButton.getAttribute('title');
            if (title && title.includes("Afficher tous les kudos")) {
                console.log("[Strava Auto Kudos] Confirmation du kudos : titre mis à jour");
                return true;
            }

            await Utils.sleep(100);
        }

        console.log("[Strava Auto Kudos] Timeout en attendant la confirmation du kudos");
        return false;
    },

    /**
     * Vérifie si une erreur est une erreur réseau
     * @param {Error} error - L'erreur à vérifier
     * @returns {boolean} true si c'est une erreur réseau
     */
    isNetworkError(error) {
        return error.message.includes('network') || 
               error.message.includes('timeout') ||
               error.message.includes('failed to fetch');
    },

    /**
     * Vérifie si une erreur est une erreur Strava
     * @param {Error} error - L'erreur à vérifier
     * @returns {boolean} true si c'est une erreur Strava
     */
    isStravaError(error) {
        return error.message.includes('Strava') ||
               error.message.includes('rate limit') ||
               error.message.includes('unauthorized');
    },

    /**
     * Gère une erreur réseau
     */
    async handleNetworkError() {
        Logger.warn('Erreur réseau détectée, pause temporaire');
        await StateManager.pause(10000); // Pause de 10 secondes
    },

    /**
     * Gère une erreur Strava
     */
    async handleStravaError() {
        Logger.warn('Erreur Strava détectée, pause prolongée');
        await StateManager.pause(30000); // Pause de 30 secondes
    },

    /**
     * Met à jour les statistiques d'une entrée
     * @param {boolean} success - Si le traitement a réussi
     * @param {number} processingTime - Temps de traitement
     */
    updateEntryStats(success, processingTime) {
        const { entryStats } = this.performanceState;
        entryStats.total++;
        entryStats.processed++;

        if (success) {
            entryStats.valid++;
            this.performanceState.successCount++;
            this.performanceState.consecutiveErrors = 0;
            this.performanceState.lastSuccess = Date.now();
        } else {
            entryStats.invalid++;
            this.performanceState.errorCount++;
            this.performanceState.consecutiveErrors++;
            this.performanceState.lastError = {
                timestamp: Date.now(),
                processingTime
            };

            // Vérifier si on doit mettre en pause
            if (this.performanceState.consecutiveErrors >= this.config.performance.maxConsecutiveErrors) {
                Logger.warn(`Trop d'erreurs consécutives (${this.performanceState.consecutiveErrors}), pause temporaire`);
                StateManager.pause(this.config.performance.cooldownPeriod);
            }
        }

        this.performanceState.processingTime = processingTime;
    }
};

// Exposer le module de manière sécurisée
(function() {
    if (typeof window !== 'undefined') {
        window.EntryProcessor = EntryProcessor;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EntryProcessor;
    }
})(); 