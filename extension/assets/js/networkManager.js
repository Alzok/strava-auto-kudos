/**
 * Module de gestion des erreurs réseau
 * @module NetworkManager
 */
console.log("[Strava Auto Kudos] NetworkManager module loading");

// Vérifier si NetworkManager est déjà défini
if (typeof window.NetworkManager === 'undefined') {
    window.NetworkManager = {
        /**
         * Configuration des erreurs réseau
         * @type {Object}
         */
        config: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 30000,
            connectionCheckUrl: 'https://www.strava.com/favicon.ico', // URL légère pour la vérification
            connectionCheckCache: 5000, // Durée de validité du cache en ms
            errorCodes: {
                rateLimit: 429,
                serviceUnavailable: 503,
                gatewayTimeout: 504,
                badGateway: 502,
                tooManyRequests: 429,
                unauthorized: 401,
                forbidden: 403,
                notFound: 404
            },
            // Messages d'erreur spécifiques à Strava
            errorMessages: {
                rateLimit: 'Rate limit exceeded',
                maintenance: 'Strava is currently under maintenance',
                networkError: 'Network error occurred',
                serverError: 'Strava server error',
                unauthorized: 'Unauthorized access'
            },
            // Configuration des retries
            retryConfig: {
                rateLimit: {
                    maxRetries: 5,
                    baseDelay: 5000,
                    maxDelay: 60000,
                    priorityLevel: 'high'
                },
                serverError: {
                    maxRetries: 3,
                    baseDelay: 2000,
                    maxDelay: 30000,
                    priorityLevel: 'medium'
                },
                networkError: {
                    maxRetries: 3,
                    baseDelay: 1000,
                    maxDelay: 15000,
                    priorityLevel: 'low'
                }
            },
            // Seuils de performance
            performanceThresholds: {
                errorRateHigh: 0.2,      // 20% d'erreurs
                errorRateCritical: 0.4,   // 40% d'erreurs
                responseTimeHigh: 2000,   // 2 secondes
                responseTimeCritical: 5000 // 5 secondes
            },
            // Configuration du monitoring
            monitoring: {
                enabled: true,
                interval: 60000, // 1 minute
                maxHistorySize: 100,
                alertThresholds: {
                    errorRate: 0.3,
                    responseTime: 3000,
                    consecutiveFailures: 5
                }
            }
        },

        /**
         * État des performances
         * @type {Object}
         */
        performanceState: {
            requestCount: 0,
            errorCount: 0,
            totalResponseTime: 0,
            avgResponseTime: 0,
            errorRate: 0,
            lastUpdate: Date.now(),
            history: [],
            maxHistorySize: 100,
            monitoringEnabled: false,
            alerts: [],
            lastAlert: 0,
            alertCooldown: 300000 // 5 minutes
        },

        /**
         * Cache de la dernière vérification de connexion
         * @type {Object}
         */
        connectionCache: {
            timestamp: 0,
            isAvailable: false,
            lastError: null,
            consecutiveFailures: 0,
            lastSuccessfulCheck: null,
            checkHistory: [],
            maxHistorySize: 50,
            healthScore: 100,
            lastHealthUpdate: Date.now()
        },

        /**
         * Initialise le monitoring des performances
         */
        initMonitoring() {
            if (this.performanceState.monitoringEnabled) return;
            
            this.performanceState.monitoringEnabled = true;
            setInterval(() => this.monitorPerformance(), this.config.monitoring.interval);
            this.setupXHRInterceptor();
            Logger.info('Monitoring des performances réseau activé');
        },

        /**
         * Configure l'intercepteur de requêtes XHR
         */
        setupXHRInterceptor() {
            const originalXHR = window.XMLHttpRequest;
            const self = this;

            function XHRInterceptor() {
                const xhr = new originalXHR();
                const originalOpen = xhr.open;
                const originalSend = xhr.send;

                xhr.open = function(method, url) {
                    this._method = method;
                    this._url = url;
                    return originalOpen.apply(this, arguments);
                };

                xhr.send = function(data) {
                    const startTime = Date.now();
                    
                    this.addEventListener('loadend', function() {
                        const duration = Date.now() - startTime;
                        const isError = this.status >= 400;
                        
                        // Mettre à jour les statistiques
                        self.updatePerformanceStats(isError, duration);
                        
                        // Analyser la réponse
                        if (isError) {
                            const error = new Error(`XHR Error: ${this.status}`);
                            error.response = {
                                status: this.status,
                                headers: this.getAllResponseHeaders().split('\r\n').reduce((acc, line) => {
                                    const [key, value] = line.split(': ');
                                    if (key && value) acc[key.toLowerCase()] = value;
                                    return acc;
                                }, {}),
                                data: this.responseText
                            };
                            
                            const analysis = self.analyzeError(error);
                            
                            // Gérer les erreurs spécifiques à Strava
                            if (this._url.includes('strava.com')) {
                                if (this.status === 429) {
                                    // Rate limit détecté
                                    const retryAfter = parseInt(this.getResponseHeader('retry-after')) || 60;
                                    Logger.warn(`Rate limit Strava détecté, pause de ${retryAfter}s`);
                                    StateManager.pause(retryAfter * 1000);
                                } else if (this.status === 401 || this.status === 403) {
                                    // Erreur d'authentification
                                    Logger.error('Erreur d\'authentification Strava');
                                    StateManager.pause(300000); // Pause de 5 minutes
                                }
                            }
                        }
                    });

                    return originalSend.apply(this, arguments);
                };

                return xhr;
            }

            window.XMLHttpRequest = XHRInterceptor;
        },

        /**
         * Surveille les performances réseau
         */
        monitorPerformance() {
            const now = Date.now();
            const stats = this.getPerformanceStats();
            
            // Vérifier les seuils d'alerte
            if (stats.errorRate > this.config.monitoring.alertThresholds.errorRate) {
                this.handleAlert('errorRate', stats);
            }
            
            if (stats.avgResponseTime > this.config.monitoring.alertThresholds.responseTime) {
                this.handleAlert('responseTime', stats);
            }
            
            if (this.connectionCache.consecutiveFailures >= this.config.monitoring.alertThresholds.consecutiveFailures) {
                this.handleAlert('consecutiveFailures', stats);
            }

            // Mettre à jour le score de santé
            this.updateHealthScore(stats);
        },

        /**
         * Gère les alertes de performance
         * @param {string} type - Type d'alerte
         * @param {Object} stats - Statistiques actuelles
         */
        handleAlert(type, stats) {
            const now = Date.now();
            if (now - this.performanceState.lastAlert < this.performanceState.alertCooldown) {
                return;
            }

            const alert = {
                type,
                timestamp: now,
                stats,
                severity: this.calculateAlertSeverity(type, stats)
            };

            this.performanceState.alerts.push(alert);
            this.performanceState.lastAlert = now;

            // Limiter le nombre d'alertes
            if (this.performanceState.alerts.length > 10) {
                this.performanceState.alerts.shift();
            }

            // Émettre l'alerte
            this.emitAlert(alert);
        },

        /**
         * Calcule la sévérité d'une alerte
         * @param {string} type - Type d'alerte
         * @param {Object} stats - Statistiques actuelles
         * @returns {string} Niveau de sévérité
         */
        calculateAlertSeverity(type, stats) {
            switch (type) {
                case 'errorRate':
                    return stats.errorRate > this.config.performanceThresholds.errorRateCritical ? 'critical' : 'high';
                case 'responseTime':
                    return stats.avgResponseTime > this.config.performanceThresholds.responseTimeCritical ? 'critical' : 'high';
                case 'consecutiveFailures':
                    return this.connectionCache.consecutiveFailures > 10 ? 'critical' : 'high';
                default:
                    return 'medium';
            }
        },

        /**
         * Émet une alerte
         * @param {Object} alert - L'alerte à émettre
         */
        emitAlert(alert) {
            const message = this.formatAlertMessage(alert);
            Logger.warn(message);
            
            // Émettre l'événement d'alerte
            App.emit('networkAlert', {
                alert,
                stats: this.getPerformanceStats(),
                healthScore: this.connectionCache.healthScore
            });
        },

        /**
         * Formate le message d'alerte
         * @param {Object} alert - L'alerte à formater
         * @returns {string} Message formaté
         */
        formatAlertMessage(alert) {
            const { type, severity, stats } = alert;
            let message = `Alerte réseau (${severity}): `;
            
            switch (type) {
                case 'errorRate':
                    message += `Taux d'erreurs élevé (${(stats.errorRate * 100).toFixed(1)}%)`;
                    break;
                case 'responseTime':
                    message += `Temps de réponse élevé (${stats.avgResponseTime.toFixed(0)}ms)`;
                    break;
                case 'consecutiveFailures':
                    message += `Échecs consécutifs (${this.connectionCache.consecutiveFailures})`;
                    break;
                default:
                    message += 'Problème de performance détecté';
            }
            
            return message;
        },

        /**
         * Met à jour le score de santé
         * @param {Object} stats - Statistiques actuelles
         */
        updateHealthScore(stats) {
            const now = Date.now();
            if (now - this.connectionCache.lastHealthUpdate < this.config.monitoring.interval) {
                return;
            }

            let score = 100;
            
            // Réduire le score en fonction des erreurs
            score -= stats.errorRate * 30;
            
            // Réduire le score en fonction du temps de réponse
            if (stats.avgResponseTime > this.config.performanceThresholds.responseTimeHigh) {
                score -= (stats.avgResponseTime - this.config.performanceThresholds.responseTimeHigh) / 100;
            }
            
            // Réduire le score en fonction des échecs consécutifs
            score -= this.connectionCache.consecutiveFailures * 5;
            
            // Limiter le score entre 0 et 100
            this.connectionCache.healthScore = Math.max(0, Math.min(100, score));
            this.connectionCache.lastHealthUpdate = now;
        },

        /**
         * Récupère les statistiques de performance
         * @returns {Object} Statistiques actuelles
         */
        getPerformanceStats() {
            return {
                requestCount: this.performanceState.requestCount,
                errorCount: this.performanceState.errorCount,
                errorRate: this.performanceState.errorRate,
                avgResponseTime: this.performanceState.avgResponseTime,
                healthScore: this.connectionCache.healthScore,
                consecutiveFailures: this.connectionCache.consecutiveFailures,
                lastSuccessfulCheck: this.connectionCache.lastSuccessfulCheck,
                alerts: [...this.performanceState.alerts]
            };
        },

        /**
         * Vérifie si une erreur est liée au réseau
         * @param {Error} error - L'erreur à analyser
         * @returns {boolean} true si c'est une erreur réseau
         */
        isNetworkError(error) {
            // Vérification des erreurs de type TypeError (connexion impossible)
            if (error instanceof TypeError) {
                return true;
            }

            // Vérification des erreurs HTTP
            if (error.response) {
                const status = error.response.status;
                return Object.values(this.config.errorCodes).includes(status) ||
                       status >= 500 || // Erreurs serveur
                       status === 0; // Erreur CORS ou réseau
            }

            // Vérification des messages d'erreur spécifiques
            const errorMessage = error.message.toLowerCase();
            return errorMessage.includes('network') ||
                   errorMessage.includes('timeout') ||
                   errorMessage.includes('failed to fetch') ||
                   errorMessage.includes('cors') ||
                   errorMessage.includes('offline') ||
                   errorMessage.includes('no internet connection');
        },

        /**
         * Met à jour les statistiques de performance
         * @param {boolean} isError - Si la requête a échoué
         * @param {number} responseTime - Temps de réponse en ms
         */
        updatePerformanceStats(isError, responseTime) {
            const now = Date.now();
            
            // Mettre à jour les compteurs
            this.performanceState.requestCount++;
            if (isError) this.performanceState.errorCount++;
            
            // Mettre à jour les temps de réponse
            this.performanceState.totalResponseTime += responseTime;
            this.performanceState.avgResponseTime = this.performanceState.totalResponseTime / this.performanceState.requestCount;
            
            // Calculer le taux d'erreur
            this.performanceState.errorRate = this.performanceState.errorCount / this.performanceState.requestCount;
            
            // Ajouter à l'historique
            this.performanceState.history.push({
                timestamp: now,
                isError,
                responseTime,
                errorRate: this.performanceState.errorRate
            });
            
            // Limiter la taille de l'historique
            if (this.performanceState.history.length > this.performanceState.maxHistorySize) {
                this.performanceState.history.shift();
            }
            
            // Vérifier les seuils de performance
            this.checkPerformanceThresholds();
        },

        /**
         * Vérifie les seuils de performance et ajuste la configuration si nécessaire
         */
        checkPerformanceThresholds() {
            const { errorRate, avgResponseTime } = this.performanceState;
            const { errorRateHigh, errorRateCritical, responseTimeHigh, responseTimeCritical } = this.config.performanceThresholds;
            
            // Ajuster les configurations de retry en fonction des performances
            if (errorRate > errorRateCritical || avgResponseTime > responseTimeCritical) {
                // Situation critique : augmenter les délais et réduire les retries
                Object.values(this.config.retryConfig).forEach(config => {
                    config.baseDelay *= 2;
                    config.maxRetries = Math.max(1, config.maxRetries - 1);
                });
                
                Logger.warn('Performance critique détectée, ajustement des paramètres de retry');
            } else if (errorRate > errorRateHigh || avgResponseTime > responseTimeHigh) {
                // Situation dégradée : ajuster légèrement les paramètres
                Object.values(this.config.retryConfig).forEach(config => {
                    config.baseDelay *= 1.5;
                });
                
                Logger.info('Performance dégradée détectée, ajustement des délais');
            }
        },

        /**
         * Analyse une erreur pour déterminer son type et sa gravité
         * @param {Error} error - L'erreur à analyser
         * @returns {Object} Informations sur l'erreur
         */
        analyzeError(error) {
            const startTime = Date.now();
            const analysis = {
                isNetworkError: false,
                isRateLimit: false,
                isServerError: false,
                isAuthError: false,
                severity: 'low',
                message: error.message,
                retryable: true,
                retryConfig: this.config.retryConfig.networkError,
                context: {
                    timestamp: startTime,
                    url: error.config?.url || error.response?.url || 'unknown',
                    method: error.config?.method || 'unknown',
                    status: error.response?.status || 0
                }
            };

            // Vérifier si c'est une erreur réseau
            analysis.isNetworkError = this.isNetworkError(error);

            // Analyser la réponse HTTP si disponible
            if (error.response) {
                const status = error.response.status;
                const headers = error.response.headers || {};
                
                // Vérifier les limites de taux
                if (status === this.config.errorCodes.rateLimit) {
                    analysis.isRateLimit = true;
                    analysis.severity = 'high';
                    analysis.message = this.config.errorMessages.rateLimit;
                    analysis.retryConfig = this.config.retryConfig.rateLimit;
                    
                    // Extraire les informations de rate limit
                    const retryAfter = parseInt(headers['retry-after']) || 60;
                    const rateLimitLimit = parseInt(headers['x-ratelimit-limit']);
                    const rateLimitRemaining = parseInt(headers['x-ratelimit-remaining']);
                    const rateLimitReset = parseInt(headers['x-ratelimit-reset']);
                    
                    analysis.context.rateLimit = {
                        retryAfter,
                        limit: rateLimitLimit,
                        remaining: rateLimitRemaining,
                        reset: rateLimitReset
                    };
                }
                
                // Vérifier les erreurs serveur
                if (status >= 500) {
                    analysis.isServerError = true;
                    analysis.severity = 'medium';
                    analysis.message = this.config.errorMessages.serverError;
                    analysis.retryConfig = this.config.retryConfig.serverError;
                }
                
                // Vérifier les erreurs d'authentification
                if (status === this.config.errorCodes.unauthorized || 
                    status === this.config.errorCodes.forbidden) {
                    analysis.isAuthError = true;
                    analysis.severity = 'high';
                    analysis.message = this.config.errorMessages.unauthorized;
                    analysis.retryable = false;
                }

                // Analyser le contenu de la réponse pour plus de détails
                try {
                    const responseData = JSON.parse(error.response.data);
                    if (responseData && typeof responseData === 'object') {
                        analysis.context.responseData = responseData;
                        
                        // Extraire les messages d'erreur spécifiques à Strava
                        if (responseData.message) {
                            analysis.message = responseData.message;
                        }
                        
                        // Détecter les erreurs de maintenance
                        if (responseData.message?.toLowerCase().includes('maintenance')) {
                            analysis.severity = 'critical';
                            analysis.message = this.config.errorMessages.maintenance;
                            analysis.retryable = false;
                        }
                    }
                } catch (e) {
                    // Ignorer les erreurs de parsing JSON
                }
            }

            // Ajouter des informations de contexte supplémentaires
            analysis.context.headers = error.response?.headers || {};
            analysis.context.rateLimitRemaining = parseInt(analysis.context.headers['x-ratelimit-remaining']) || null;
            analysis.context.retryAfter = parseInt(analysis.context.headers['retry-after']) || null;

            // Mettre à jour les statistiques
            const responseTime = Date.now() - startTime;
            this.updatePerformanceStats(true, responseTime);

            return analysis;
        },

        /**
         * Calcule le délai de retry avec backoff exponentiel
         * @param {number} attempt - Le numéro de la tentative
         * @param {Object} errorAnalysis - Analyse de l'erreur
         * @returns {number} Le délai en millisecondes
         */
        calculateDelay(attempt, errorAnalysis) {
            const { baseDelay, maxDelay } = errorAnalysis.retryConfig;
            
            // Ajuster le délai en fonction de la gravité
            let delay = baseDelay * Math.pow(2, attempt);
            
            // Ajouter un jitter aléatoire pour éviter la thundering herd
            delay *= (0.75 + Math.random() * 0.5);
            
            return Math.min(delay, maxDelay);
        },

        /**
         * Exécute une opération avec retry en cas d'erreur réseau
         * @param {Function} operation - L'opération à exécuter
         * @param {Object} options - Options de retry
         * @returns {Promise<any>} Le résultat de l'opération
         */
        async retryWithBackoff(operation, options = {}) {
            const startTime = Date.now();
            let lastError;
            let lastAnalysis;
            let attempt = 0;
            
            const maxRetries = options.maxRetries || this.config.maxRetries;
            const baseDelay = options.baseDelay || this.config.baseDelay;
            
            while (attempt < maxRetries) {
                try {
                    const result = await operation();
                    // Mettre à jour les statistiques de succès
                    this.updatePerformanceStats(false, Date.now() - startTime);
                    return result;
                } catch (error) {
                    lastError = error;
                    lastAnalysis = this.analyzeError(error);
                    
                    if (!lastAnalysis.retryable) {
                        Logger.error(`Erreur non retryable: ${lastAnalysis.message}`, lastAnalysis.context);
                        throw error;
                    }

                    attempt++;
                    if (attempt >= lastAnalysis.retryConfig.maxRetries) {
                        Logger.error(`Nombre maximum de tentatives atteint (${lastAnalysis.retryConfig.maxRetries})`, lastAnalysis.context);
                        throw error;
                    }

                    const delay = this.calculateDelay(attempt, lastAnalysis);
                    Logger.debug(`Erreur réseau détectée (${lastAnalysis.message}), tentative ${attempt}/${lastAnalysis.retryConfig.maxRetries} dans ${delay}ms`, lastAnalysis.context);
                    
                    await Utils.sleep(delay);
                }
            }
            
            throw lastError;
        },

        /**
         * Vérifie si la connexion est disponible
         * @param {boolean} force - Si true, ignore le cache
         * @returns {Promise<boolean>} true si la connexion est disponible
         */
        async checkConnection(force = false) {
            const startTime = Date.now();
            
            // Si force est false, utiliser le cache
            if (!force) {
                const now = Date.now();
                if (now - this.connectionCache.timestamp < this.config.connectionCheckCache) {
                    return this.connectionCache.isAvailable;
                }
            }

            try {
                const response = await fetch(this.config.connectionCheckUrl, {
                    method: 'HEAD',
                    cache: 'no-cache'
                });

                const checkResult = {
                    timestamp: startTime,
                    duration: Date.now() - startTime,
                    success: response.ok,
                    status: response.status
                };

                // Mettre à jour le cache
                this.connectionCache = {
                    ...this.connectionCache,
                    timestamp: startTime,
                    isAvailable: response.ok,
                    lastError: response.ok ? null : new Error('Connection check failed'),
                    consecutiveFailures: response.ok ? 0 : this.connectionCache.consecutiveFailures + 1,
                    lastSuccessfulCheck: response.ok ? startTime : this.connectionCache.lastSuccessfulCheck,
                    checkHistory: [
                        checkResult,
                        ...this.connectionCache.checkHistory.slice(0, this.connectionCache.maxHistorySize - 1)
                    ]
                };

                // Mettre à jour les statistiques
                this.updatePerformanceStats(!response.ok, checkResult.duration);

                // Analyser l'historique des vérifications
                this.analyzeConnectionHistory();

                return response.ok;
            } catch (error) {
                const checkResult = {
                    timestamp: startTime,
                    duration: Date.now() - startTime,
                    success: false,
                    error: error.message
                };

                // Mettre à jour le cache avec l'erreur
                this.connectionCache = {
                    ...this.connectionCache,
                    timestamp: startTime,
                    isAvailable: false,
                    lastError: error,
                    consecutiveFailures: this.connectionCache.consecutiveFailures + 1,
                    checkHistory: [
                        checkResult,
                        ...this.connectionCache.checkHistory.slice(0, this.connectionCache.maxHistorySize - 1)
                    ]
                };

                // Mettre à jour les statistiques
                this.updatePerformanceStats(true, checkResult.duration);

                // Analyser l'historique des vérifications
                this.analyzeConnectionHistory();

                return false;
            }
        },

        /**
         * Analyse l'historique des vérifications de connexion
         */
        analyzeConnectionHistory() {
            const history = this.connectionCache.checkHistory;
            if (history.length === 0) return;

            // Calculer le taux de succès sur les dernières vérifications
            const recentChecks = history.slice(0, 10);
            const successRate = recentChecks.filter(check => check.success).length / recentChecks.length;

            // Calculer le temps moyen de réponse
            const avgDuration = recentChecks.reduce((sum, check) => sum + check.duration, 0) / recentChecks.length;

            // Ajuster la durée du cache en fonction des performances
            if (successRate > 0.8 && avgDuration < 1000) {
                // Bonnes performances : augmenter la durée du cache
                this.config.connectionCheckCache = Math.min(10000, this.config.connectionCheckCache * 1.2);
            } else if (successRate < 0.5 || avgDuration > 2000) {
                // Mauvaises performances : réduire la durée du cache
                this.config.connectionCheckCache = Math.max(2000, this.config.connectionCheckCache * 0.8);
            }

            // Gérer les échecs consécutifs
            if (this.connectionCache.consecutiveFailures >= 3) {
                const pauseDuration = Math.min(30000 * Math.pow(2, this.connectionCache.consecutiveFailures - 3), 300000);
                Logger.warn(`Trop d'échecs de connexion consécutifs (${this.connectionCache.consecutiveFailures}), pause de ${pauseDuration}ms`);
                StateManager.pause(pauseDuration);
            }
        },

        /**
         * Force la vérification de la connexion en ignorant le cache
         * @returns {Promise<boolean>} true si la connexion est disponible
         */
        async forceCheckConnection() {
            return this.checkConnection(true);
        },

        /**
         * Nettoie le cache de connexion
         */
        clearConnectionCache() {
            this.connectionCache = {
                timestamp: 0,
                isAvailable: false,
                lastError: null,
                consecutiveFailures: 0,
                lastSuccessfulCheck: null,
                checkHistory: [],
                maxHistorySize: 50
            };
            Logger.debug('Cache de connexion nettoyé');
        }
    };
    console.log("[Strava Auto Kudos] Module NetworkManager initialisé");
}

// Exporter le module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.NetworkManager;
} 