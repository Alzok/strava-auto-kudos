/**
 * Module de gestion des notifications
 * @module NotificationManager
 */
console.log("[Strava Auto Kudos] NotificationManager module loading");

// Vérifier si NotificationManager est déjà défini
if (typeof window.NotificationManager === 'undefined') {
    window.NotificationManager = {
        // Configuration des durées de notification
        durations: {
            short: 2000,
            medium: 4000,
            long: 8000
        },

        // Gestion des notifications empilées
        stackNotifications: true,
        maxStackSize: 5,

        // Gestion de la priorité des notifications
        priorities: {
            error: 3,
            success: 2,
            info: 1
        },

        // Gestion des erreurs
        errorHandling: {
            maxRetries: 3,
            retryDelay: 1000,
            errorTypes: {
                DOM: 'DOM_ERROR',
                NETWORK: 'NETWORK_ERROR',
                STORAGE: 'STORAGE_ERROR',
                UNKNOWN: 'UNKNOWN_ERROR'
            }
        },

        // État des performances
        performanceState: {
            lastCheck: 0,
            notificationCount: 0,
            errorCount: 0,
            successCount: 0,
            avgDisplayTime: 0,
            totalDisplayTime: 0,
            displayCount: 0,
            isOptimizing: false
        },

        // Cache des notifications
        notificationCache: {
            active: new Map(),
            history: [],
            maxHistorySize: 100
        },

        /**
         * Crée une notification
         * @param {string} message - Message de la notification
         * @param {string} type - Type de notification (success, error, info)
         * @param {string} duration - Durée d'affichage (short, medium, long)
         * @param {Object} params - Paramètres supplémentaires
         * @param {number} [params.priority] - Priorité de la notification
         * @returns {Element} L'élément de notification créé
         */
        create: (message, type = 'info', duration = 'medium', params = {}) => {
            try {
                // Gérer la pile de notifications
                if (NotificationManager.stackNotifications) {
                    NotificationManager.manageNotificationStack();
                }

                // Créer la notification avec le template
                const notification = document.createElement('div');
                notification.innerHTML = Templates.notification(message, type);
                notification = notification.firstElementChild;
                
                // Ajouter la notification au DOM
                const container = document.getElementById('strava-auto-kudos-notifications') || NotificationManager.createContainer();
                container.appendChild(notification);
                
                // Définir la priorité
                const priority = params.priority || NotificationManager.priorities[type] || 1;
                notification.setAttribute('data-priority', priority);
                notification.style.zIndex = 1000 + priority;
                
                // Ajouter le bouton de fermeture
                const closeButton = notification.querySelector('.notification-close');
                if (closeButton) {
                    closeButton.addEventListener('click', () => NotificationManager.remove(notification));
                }
                
                // Supprimer automatiquement après la durée spécifiée
                const timeout = setTimeout(() => NotificationManager.remove(notification), NotificationManager.durations[duration] || duration);
                notification.setAttribute('data-timeout', timeout);
                
                // Mettre à jour les statistiques
                NotificationManager.updateStats('create', type);
                
                // Ajouter au cache
                NotificationManager.notificationCache.active.set(notification, {
                    type,
                    message,
                    startTime: Date.now(),
                    timeout
                });

                return notification;
            } catch (error) {
                Logger.error('Erreur lors de la création de la notification:', error);
                NotificationManager.handleError(error, NotificationManager.errorHandling.errorTypes.DOM);
                return null;
            }
        },

        /**
         * Gère la pile de notifications
         */
        manageNotificationStack: () => {
            const container = document.getElementById('strava-auto-kudos-notifications');
            if (container) {
                const notifications = container.querySelectorAll('.notification');
                if (notifications.length >= NotificationManager.maxStackSize) {
                    // Supprimer la notification la plus ancienne
                    NotificationManager.remove(notifications[0]);
                }
            }
        },

        /**
         * Crée le conteneur de notifications
         * @returns {Element} Le conteneur de notifications
         */
        createContainer: () => {
            try {
                const container = document.createElement('div');
                container.innerHTML = Templates.notificationContainer();
                container = container.firstElementChild;
                document.body.appendChild(container);
                return container;
            } catch (error) {
                Logger.error('Erreur lors de la création du conteneur de notifications:', error);
                NotificationManager.handleError(error, NotificationManager.errorHandling.errorTypes.DOM);
                return null;
            }
        },

        /**
         * Supprime une notification
         * @param {Element} notification - La notification à supprimer
         */
        remove: (notification) => {
            try {
                if (notification && notification.parentNode) {
                    // Nettoyer le timeout
                    const timeout = notification.getAttribute('data-timeout');
                    if (timeout) {
                        clearTimeout(parseInt(timeout));
                        notification.removeAttribute('data-timeout');
                    }

                    // Mettre à jour les statistiques
                    const cache = NotificationManager.notificationCache.active.get(notification);
                    if (cache) {
                        const displayTime = Date.now() - cache.startTime;
                        NotificationManager.updateStats('remove', cache.type, displayTime);
                        NotificationManager.notificationCache.active.delete(notification);
                        
                        // Ajouter à l'historique
                        NotificationManager.addToHistory({
                            type: cache.type,
                            message: cache.message,
                            displayTime
                        });
                    }

                    // Ajouter l'animation de sortie
                    notification.classList.add('fade-out');
                    
                    // Supprimer après l'animation
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            } catch (error) {
                Logger.error('Erreur lors de la suppression de la notification:', error);
                NotificationManager.handleError(error, NotificationManager.errorHandling.errorTypes.DOM);
            }
        },

        /**
         * Met à jour une notification existante
         * @param {string} message - Message de la notification
         * @param {string} type - Type de notification
         * @param {string} duration - Durée d'affichage
         * @returns {Element} La notification mise à jour ou créée
         */
        updateNotification: (message, type = 'info', duration = 'medium') => {
            try {
                const existingNotification = document.querySelector(`.notification[data-message="${message}"]`);
                if (existingNotification) {
                    // Mettre à jour le type et la durée
                    existingNotification.className = `notification ${type}`;
                    const icon = existingNotification.querySelector('.notification-icon');
                    if (icon) {
                        icon.innerHTML = type === 'error' ? '⚠️' : 
                                       type === 'success' ? '✅' : 'ℹ️';
                    }
                    // Réinitialiser le timer
                    const timeout = existingNotification.getAttribute('data-timeout');
                    if (timeout) {
                        clearTimeout(parseInt(timeout));
                    }
                    const newTimeout = setTimeout(
                        () => NotificationManager.remove(existingNotification),
                        NotificationManager.durations[duration] || duration
                    );
                    existingNotification.setAttribute('data-timeout', newTimeout);
                    return existingNotification;
                }
                return NotificationManager.create(message, type, duration);
            } catch (error) {
                Logger.error('Erreur lors de la mise à jour de la notification:', error);
                NotificationManager.handleError(error, NotificationManager.errorHandling.errorTypes.DOM);
                return null;
            }
        },

        /**
         * Gère les erreurs de notification
         * @param {Error} error - L'erreur à gérer
         * @param {string} errorType - Le type d'erreur
         */
        handleError: (error, errorType) => {
            Logger.error(`Erreur de notification (${errorType}):`, error);
            
            // Afficher une notification d'erreur générique
            NotificationManager.create(
                CONFIG.messages.error.replace('{message}', 'Erreur lors de l\'affichage des notifications'),
                'error',
                'long'
            );
        },

        /**
         * Met à jour les statistiques
         * @param {string} action - L'action effectuée
         * @param {string} type - Le type de notification
         * @param {number} [displayTime] - Le temps d'affichage
         */
        updateStats: (action, type, displayTime = 0) => {
            if (action === 'create') {
                NotificationManager.performanceState.notificationCount++;
                if (type === 'error') {
                    NotificationManager.performanceState.errorCount++;
                } else if (type === 'success') {
                    NotificationManager.performanceState.successCount++;
                }
            } else if (action === 'remove') {
                NotificationManager.performanceState.notificationCount--;
                NotificationManager.performanceState.totalDisplayTime += displayTime;
                NotificationManager.performanceState.displayCount++;
                NotificationManager.performanceState.avgDisplayTime = 
                    NotificationManager.performanceState.totalDisplayTime / NotificationManager.performanceState.displayCount;
            }

            // Optimiser si nécessaire
            if (Date.now() - NotificationManager.performanceState.lastCheck > 60000) { // Toutes les minutes
                NotificationManager.optimize();
            }
        },

        /**
         * Optimise les performances
         */
        optimize: () => {
            if (NotificationManager.performanceState.isOptimizing) return;
            NotificationManager.performanceState.isOptimizing = true;

            try {
                // Nettoyer l'historique si nécessaire
                if (NotificationManager.notificationCache.history.length > NotificationManager.notificationCache.maxHistorySize) {
                    NotificationManager.notificationCache.history = 
                        NotificationManager.notificationCache.history.slice(-NotificationManager.notificationCache.maxHistorySize);
                }

                // Ajuster la taille maximale de la pile en fonction des performances
                const successRate = NotificationManager.performanceState.successCount / 
                    (NotificationManager.performanceState.successCount + NotificationManager.performanceState.errorCount);
                
                if (successRate > 0.9) {
                    NotificationManager.maxStackSize = Math.min(7, NotificationManager.maxStackSize + 1);
                } else if (successRate < 0.7) {
                    NotificationManager.maxStackSize = Math.max(3, NotificationManager.maxStackSize - 1);
                }

                // Ajuster les durées en fonction du temps d'affichage moyen
                if (NotificationManager.performanceState.avgDisplayTime > 5000) {
                    NotificationManager.durations.short = Math.max(1500, NotificationManager.durations.short - 100);
                    NotificationManager.durations.medium = Math.max(3000, NotificationManager.durations.medium - 200);
                    NotificationManager.durations.long = Math.max(6000, NotificationManager.durations.long - 400);
                } else if (NotificationManager.performanceState.avgDisplayTime < 2000) {
                    NotificationManager.durations.short = Math.min(2500, NotificationManager.durations.short + 100);
                    NotificationManager.durations.medium = Math.min(5000, NotificationManager.durations.medium + 200);
                    NotificationManager.durations.long = Math.min(10000, NotificationManager.durations.long + 400);
                }

                NotificationManager.performanceState.lastCheck = Date.now();
            } finally {
                NotificationManager.performanceState.isOptimizing = false;
            }
        },

        /**
         * Ajoute une notification à l'historique
         * @param {Object} notification - Les données de la notification
         */
        addToHistory: (notification) => {
            NotificationManager.notificationCache.history.push({
                ...notification,
                timestamp: Date.now()
            });
        },

        /**
         * Récupère les statistiques de performance
         * @returns {Object} Les statistiques
         */
        getPerformanceStats: () => {
            return {
                notificationCount: NotificationManager.performanceState.notificationCount,
                errorCount: NotificationManager.performanceState.errorCount,
                successCount: NotificationManager.performanceState.successCount,
                avgDisplayTime: NotificationManager.performanceState.avgDisplayTime,
                maxStackSize: NotificationManager.maxStackSize,
                history: [...NotificationManager.notificationCache.history]
            };
        },

        // Notifications spécifiques
        showPauseNotification: (duration) => {
            try {
                const minutes = Math.floor(duration / 60000);
                const seconds = Math.floor((duration % 60000) / 1000);
                const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                NotificationManager.create(
                    CONFIG.messages.pause.replace('{duration}', timeString),
                    'error',
                    'long'
                );
            } catch (error) {
                NotificationManager.handleError(error, NotificationManager.errorHandling.errorTypes.UNKNOWN);
            }
        },

        showResumeNotification: () => {
            try {
                NotificationManager.create(
                    CONFIG.messages.resume,
                    'success',
                    'medium'
                );
            } catch (error) {
                NotificationManager.handleError(error, NotificationManager.errorHandling.errorTypes.UNKNOWN);
            }
        },

        showLimitExceededAlert: (errorCount) => {
            try {
                NotificationManager.create(
                    CONFIG.messages.limitExceeded.replace('{duration}', Math.pow(2, errorCount)),
                    'error',
                    'long'
                );
            } catch (error) {
                NotificationManager.handleError(error, NotificationManager.errorHandling.errorTypes.UNKNOWN);
            }
        },

        showKudosSuccess: (count) => {
            try {
                NotificationManager.create(
                    CONFIG.messages.kudosSuccess.replace('{count}', count),
                    'success',
                    'short'
                );
            } catch (error) {
                NotificationManager.handleError(error, NotificationManager.errorHandling.errorTypes.UNKNOWN);
            }
        },

        showError: (message) => {
            try {
                NotificationManager.create(
                    CONFIG.messages.error.replace('{message}', message),
                    'error',
                    'medium'
                );
            } catch (error) {
                NotificationManager.handleError(error, NotificationManager.errorHandling.errorTypes.UNKNOWN);
            }
        },

        /**
         * Nettoie toutes les notifications
         */
        clearAll: () => {
            try {
                const container = document.getElementById('strava-auto-kudos-notifications');
                if (container) {
                    const notifications = container.querySelectorAll('.notification');
                    notifications.forEach(notification => {
                        NotificationManager.remove(notification);
                    });
                }
            } catch (error) {
                NotificationManager.handleError(error, NotificationManager.errorHandling.errorTypes.DOM);
            }
        }
    };
    console.log("[Strava Auto Kudos] Module NotificationManager initialisé");
}

// Exporter le module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.NotificationManager;
} 