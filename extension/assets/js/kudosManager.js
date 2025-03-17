/**
 * Module pour la gestion des Kudos
 */
const KudosManager = {
    /**
     * Active ou désactive la fonctionnalité Auto Kudos
     */
    toggleAutoKudos: () => {
        Logger.debug('Toggle Auto Kudos called');
        
        try {
            // Inverser l'état actuel
            CONFIG.state.isEnabled = !CONFIG.state.isEnabled;
            
            // Sauvegarder l'état dans localStorage
            Storage.save(CONFIG.storage.enabled, CONFIG.state.isEnabled);
            
            // Mettre à jour l'interface
            UI.updateBulleStatus(CONFIG.state.isEnabled);
            
            if (CONFIG.state.isEnabled) {
                Logger.info('Auto Kudos activé');
                // Si activé, on lance immédiatement le processus
                KudosManager.loopKudos();
            } else {
                Logger.info('Auto Kudos désactivé');
            }
        } catch (error) {
            Logger.error('Erreur lors du toggle auto kudos', error);
        }
    },
    
    /**
     * Charge plus d'entrées dans le flux en redirigeant vers l'URL avec plus d'entrées
     */
    loadMore: () => {
        Logger.debug('Chargement de plus d\'entrées via URL');
        
        try {
            // Réinitialiser la liste des entrées traitées avant de charger une nouvelle page
            CONFIG.state.processedEntries.clear();
            window.location = CONFIG.urls.dashboard;
        } catch (error) {
            Logger.error('Erreur lors du chargement de plus d\'entrées', error);
        }
    },
    
    /**
     * Donne des kudos aux entrées du flux
     * Cette fonction sera appelée à chaque chargement initial et à chaque détection de nouvelles entrées
     */
    loopKudos: async () => {
        // Ne pas exécuter si l'extension est désactivée
        if (!CONFIG.state.isEnabled) {
            return;
        }
        
        // Éviter les exécutions simultanées
        if (CONFIG.state.isProcessing) {
            Logger.debug('Traitement déjà en cours, ignoré');
            return;
        }
        
        CONFIG.state.isProcessing = true;
        Logger.debug('Début de la boucle de kudos');
        
        try {
            // Récupère l'URL du profil de l'utilisateur courant
            const userMenuLink = document.querySelector(CONFIG.selectors.userMenuLink);
            
            if (!userMenuLink) {
                Logger.debug('Lien du menu utilisateur non trouvé');
                CONFIG.state.isProcessing = false;
                return;
            }
            
            const currentUserHref = userMenuLink.getAttribute('href');
            Logger.debug(`URL de l'utilisateur courant: ${currentUserHref}`);
            
            // Récupère toutes les entrées du flux
            const feedEntries = document.querySelectorAll(CONFIG.selectors.feedEntry);
            Logger.debug(`Nombre total d'entrées dans le flux: ${feedEntries.length}`);
            
            let newEntriesCount = 0;
            
            // Déterminer les délais à utiliser
            const delays = Utils.getCurrentDelays();
            
            for (const entry of feedEntries) {
                // Vérifier si l'extension est toujours active
                if (!CONFIG.state.isEnabled) {
                    Logger.debug('Extension désactivée pendant le traitement, arrêt de la boucle');
                    break;
                }
                
                const entryId = entry.id || entry.getAttribute('index') || Math.random().toString();
                
                // Ignorer les entrées déjà traitées
                if (CONFIG.state.processedEntries.has(entryId)) {
                    continue;
                }
                
                // Marquer l'entrée comme traitée
                CONFIG.state.processedEntries.add(entryId);
                newEntriesCount++;
                
                // Attendre un temps aléatoire pour simuler un comportement humain
                const delay = Utils.randomIntFromInterval(delays.min, delays.max);
                await Utils.sleep(delay);
                
                // Récupère l'URL du propriétaire de l'entrée
                const ownerNameElement = entry.querySelector(CONFIG.selectors.ownerName);
                
                if (!ownerNameElement) {
                    Logger.debug('Élément nom du propriétaire non trouvé dans cette entrée', entry);
                    continue;
                }
                
                const ownerHref = ownerNameElement.getAttribute('href');
                
                // Ne pas donner kudos à ses propres entrées
                if (ownerHref === currentUserHref) {
                    Logger.debug('Entrée appartenant à l\'utilisateur courant, ignorée');
                    continue;
                }
                
                // Trouver le bouton kudos
                const kudosButton = entry.querySelector(CONFIG.selectors.kudosButton);
                
                if (!kudosButton) {
                    Logger.debug('Bouton kudos non trouvé dans cette entrée', entry);
                    continue;
                }
                
                // Vérifier si le kudos n'est pas déjà donné
                const unfilledKudosIcon = kudosButton.querySelector(CONFIG.selectors.unfilledKudos);
                
                if (unfilledKudosIcon) {
                    try {
                        Logger.debug(`Tentative de kudos pour l'entrée ${entryId}`);
                        kudosButton.click();
                        
                        // Attendre un peu pour vérifier si l'action a réussi
                        await Utils.sleep(200);
                        
                        // Vérifier si le bouton a changé d'état
                        const stillUnfilled = kudosButton.querySelector(CONFIG.selectors.unfilledKudos);
                        
                        if (stillUnfilled) {
                            // Possible erreur, ajouter à la liste des entrées à réessayer
                            Logger.debug(`Échec potentiel du kudos pour l'entrée ${entryId}, ajout à la file d'attente`);
                            
                            CONFIG.state.failedKudos.push({
                                entryId,
                                kudosButton,
                                attempts: 1,
                                timestamp: Date.now()
                            });
                            
                            CONFIG.state.errorCount++;
                            
                            // Afficher une notification d'erreur
                            UI.showErrorNotification(kudosButton);
                            
                            // Si trop d'erreurs consécutives, augmenter le délai et arrêter la boucle actuelle
                            if (CONFIG.state.errorCount > 5) {
                                Logger.info('Trop d\'erreurs détectées, pause temporaire');
                                break;
                            }
                        } else {
                            // Kudos réussi, réinitialiser le compteur d'erreurs
                            CONFIG.state.errorCount = Math.max(0, CONFIG.state.errorCount - 1);
                            
                            // Incrémenter le compteur de kudos
                            UI.incrementKudosCount();
                            
                            // Afficher une notification de succès
                            UI.showSuccessNotification(kudosButton);
                        }
                    } catch (clickError) {
                        // Erreur lors du clic, possible erreur 429
                        Logger.error('Erreur lors du clic sur le bouton kudos', clickError);
                        
                        CONFIG.state.errorCount++;
                        
                        // Afficher une notification d'erreur
                        UI.showErrorNotification(kudosButton);
                        
                        // Ajouter l'entrée à réessayer plus tard
                        CONFIG.state.failedKudos.push({
                            entryId,
                            kudosButton,
                            attempts: 1,
                            timestamp: Date.now()
                        });
                        
                        // Si trop d'erreurs, on fait une pause
                        if (CONFIG.state.errorCount > 5) {
                            Logger.info('Trop d\'erreurs détectées, pause temporaire');
                            break;
                        }
                    }
                } else {
                    Logger.debug(`Kudos déjà donné pour l'entrée ${entryId}`);
                }
            }
            
            Logger.info(`Processus terminé, ${newEntriesCount} nouvelles entrées traitées`);
            
            // Planifier une tentative de traitement des kudos en échec si nécessaire
            if (CONFIG.state.failedKudos.length > 0 && !CONFIG.state.retryActive) {
                KudosManager.scheduleRetry();
            }
        } catch (error) {
            Logger.error('Erreur lors de la boucle de kudos', error);
            CONFIG.state.errorCount++;
        } finally {
            CONFIG.state.isProcessing = false;
        }
    },
    
    /**
     * Planifie un réessai pour les kudos échoués
     */
    scheduleRetry: () => {
        if (CONFIG.state.retryActive || CONFIG.state.failedKudos.length === 0) {
            return;
        }
        
        // Marquer comme actif pour éviter les doublons
        CONFIG.state.retryActive = true;
        
        // Attendre plus longtemps si on a détecté beaucoup d'erreurs
        const delay = CONFIG.state.errorCount > 5 ? CONFIG.kudosDelay.recoveryDelay : CONFIG.kudosDelay.backoffMax * 2;
        
        Logger.debug(`Planification d'un réessai dans ${delay}ms pour ${CONFIG.state.failedKudos.length} kudos`);
        
        setTimeout(() => {
            KudosManager.retryFailedKudos();
        }, delay);
    },
    
    /**
     * Réessaie les kudos qui ont échoué précédemment
     */
    retryFailedKudos: async () => {
        CONFIG.state.retryActive = true;
        
        try {
            Logger.debug(`Tentative de réessai pour ${CONFIG.state.failedKudos.length} kudos`);
            
            if (CONFIG.state.failedKudos.length === 0 || !CONFIG.state.isEnabled) {
                CONFIG.state.retryActive = false;
                return;
            }
            
            const now = Date.now();
            const delays = Utils.getCurrentDelays();
            const maxDelay = delays.max * 2; // Délai plus long pour les réessais
            
            // Copier la liste pour éviter les problèmes de modification pendant l'itération
            const failedKudos = [...CONFIG.state.failedKudos];
            CONFIG.state.failedKudos = [];
            
            let successCount = 0;
            let failCount = 0;
            
            for (const item of failedKudos) {
                // Vérifier si l'extension est toujours active
                if (!CONFIG.state.isEnabled) {
                    // Remettre les éléments non traités dans la file d'attente
                    CONFIG.state.failedKudos.push(...failedKudos.slice(failedKudos.indexOf(item)));
                    break;
                }
                
                try {
                    // Vérifier si le bouton est toujours valide
                    if (!document.body.contains(item.kudosButton)) {
                        Logger.debug(`Bouton kudos non trouvé pour l'entrée ${item.entryId}, probablement page rechargée`);
                        continue;
                    }
                    
                    // Vérifier si le kudos n'a pas déjà été donné entre temps
                    const unfilledKudosIcon = item.kudosButton.querySelector(CONFIG.selectors.unfilledKudos);
                    
                    if (!unfilledKudosIcon) {
                        Logger.debug(`Kudos déjà donné pour l'entrée ${item.entryId}`);
                        successCount++;
                        continue;
                    }
                    
                    // Attendre un délai aléatoire
                    await Utils.sleep(Utils.randomIntFromInterval(delays.min, maxDelay));
                    
                    // Tenter à nouveau de donner le kudos
                    item.kudosButton.click();
                    
                    // Attendre pour vérifier si l'action a réussi
                    await Utils.sleep(200);
                    
                    // Vérifier à nouveau
                    const stillUnfilled = item.kudosButton.querySelector(CONFIG.selectors.unfilledKudos);
                    
                    if (stillUnfilled) {
                        // Toujours en échec
                        item.attempts++;
                        item.timestamp = now;
                        
                        if (item.attempts < 5) {
                            // Remettre dans la file d'attente si moins de 5 tentatives
                            CONFIG.state.failedKudos.push(item);
                        }
                        
                        failCount++;
                        
                        // Afficher une notification d'erreur
                        UI.showErrorNotification(item.kudosButton);
                    } else {
                        // Kudos réussi
                        successCount++;
                        CONFIG.state.errorCount = Math.max(0, CONFIG.state.errorCount - 1);
                        
                        // Incrémenter le compteur de kudos
                        UI.incrementKudosCount();
                        
                        // Afficher une notification de succès
                        UI.showSuccessNotification(item.kudosButton);
                    }
                } catch (error) {
                    Logger.error(`Erreur lors de la tentative de réessai pour l'entrée ${item.entryId}`, error);
                    
                    if (item.attempts < 5) {
                        item.attempts++;
                        item.timestamp = now;
                        CONFIG.state.failedKudos.push(item);
                    }
                    
                    failCount++;
                    
                    // Afficher une notification d'erreur
                    UI.showErrorNotification(item.kudosButton);
                    
                    // Augmenter le délai en cas d'erreur
                    await Utils.sleep(maxDelay);
                }
            }
            
            Logger.info(`Réessais terminés: ${successCount} réussis, ${failCount} échoués`);
            
            // Si des échecs subsistent, planifier un autre réessai
            if (CONFIG.state.failedKudos.length > 0) {
                setTimeout(() => {
                    CONFIG.state.retryActive = false;
                    KudosManager.scheduleRetry();
                }, CONFIG.state.errorCount > 5 ? CONFIG.kudosDelay.recoveryDelay : CONFIG.kudosDelay.backoffMax * 3);
            } else {
                CONFIG.state.retryActive = false;
            }
        } catch (error) {
            Logger.error('Erreur lors du réessai des kudos', error);
            CONFIG.state.retryActive = false;
        }
    },
    
    /**
     * Gestionnaire d'événement de défilement
     * Détecte quand l'utilisateur est proche du bas de la page et traite les nouvelles entrées
     */
    handleScroll: () => {
        // Utiliser un debounce pour éviter des appels trop fréquents
        if (CONFIG.state.scrollTimeout) {
            clearTimeout(CONFIG.state.scrollTimeout);
        }
        
        CONFIG.state.scrollTimeout = setTimeout(() => {
            if (Utils.isNearBottom() && CONFIG.state.isEnabled) {
                Logger.debug('Bas de page détecté, recherche de nouvelles entrées');
                KudosManager.loopKudos();
            }
        }, 200);
    }
};

// Exporter le module de gestion des kudos
if (typeof module !== 'undefined') {
    module.exports = KudosManager;
}
