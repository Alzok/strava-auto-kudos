/**
 * Module pour la gestion des Kudos
 */
// console.log("[Strava Auto Kudos] KudosManager module loading");

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
        if (!CONFIG.state.isEnabled || CONFIG.state.isProcessing) {
            return;
        }
        CONFIG.state.isProcessing = true;
        // console.log('[Strava Auto Kudos] Starting global kudos loop...');
        
        try {
            // Select all potential kudos buttons on the page
            const allKudosButtons = document.querySelectorAll('button[data-testid="kudos_button"]');
            // console.log('[Strava Auto Kudos] Found ' + allKudosButtons.length + ' buttons.');
            
            // Initialize processed buttons Set if it doesn't exist
            if (!CONFIG.state.processedButtons) { 
                CONFIG.state.processedButtons = new Set();
            }

            let processedCount = 0;
            for (const kudosButton of allKudosButtons) {
                 if (!CONFIG.state.isEnabled) break; // Stop if disabled mid-loop

                 // Skip if already processed in this session
                 if (CONFIG.state.processedButtons.has(kudosButton)) {
                     continue; 
                 }
                 
                 processedCount++;
                 const buttonTitle = kudosButton.title || '';
                 
                 // Skip own activities based on title
                 if (buttonTitle === "Afficher tous les kudos") {
                    // console.log('[Strava Auto Kudos] Skipping own kudos button (title match)');
                    CONFIG.state.processedButtons.add(kudosButton); 
                    continue;
                 }

                 // Check for unfilled icon
                 const unfilledKudosIcon = kudosButton.querySelector('svg[data-testid="unfilled_kudos"]');
                 if (!unfilledKudosIcon) {
                     // Already kudosed or invalid button structure
                     CONFIG.state.processedButtons.add(kudosButton); 
                     continue;
                 }

                 // console.log('[Strava Auto Kudos] Found kudosable button:', buttonTitle);
                 
                 // Add random delay
                 const randomDelay = Utils.randomIntFromInterval(200, 800);
                 await Utils.sleep(randomDelay);
                    
                 try {
                     // console.log('[Strava Auto Kudos] Attempting click...');
                     kudosButton.click();
                     await Utils.sleep(100); // Short delay for DOM update

                     // Verify click
                     const stillUnfilled = kudosButton.querySelector('svg[data-testid="unfilled_kudos"]');
                     const isDisabled = kudosButton.disabled;

                     if (!stillUnfilled || isDisabled) {
                         // console.log('[Strava Auto Kudos] Click SUCCESSFUL (verified)');
                         CONFIG.state.processedButtons.add(kudosButton); 
                         KudosManager.handleSuccessfulKudos('btn-' + Date.now(), kudosButton); 
                     } else {
                         // Try waiting a bit longer
                         await Utils.sleep(200);
                         const stillUnfilled2 = kudosButton.querySelector('svg[data-testid="unfilled_kudos"]');
                         const isDisabled2 = kudosButton.disabled;
                         if (!stillUnfilled2 || isDisabled2) {
                             // console.log('[Strava Auto Kudos] Click SUCCESSFUL (verified on 2nd try)');
                             CONFIG.state.processedButtons.add(kudosButton); 
                             KudosManager.handleSuccessfulKudos('btn-' + Date.now(), kudosButton);
                         } else {
                             // console.log('[Strava Auto Kudos] Click FAILED (verified)');
                             CONFIG.state.processedButtons.add(kudosButton); // Mark as processed (failed)
                             CONFIG.state.errorCount++;
                         }
                     }
                 } catch (clickError) {
                     // console.error('[Strava Auto Kudos] Error during click:', clickError); // Keep console.error for actual errors
                     CONFIG.state.processedButtons.add(kudosButton); // Mark as processed (error)
                     CONFIG.state.errorCount++;
                     UI.showErrorNotification();
                     if (CONFIG.state.errorCount > 5) {
                         UI.showLimitExceededAlert();
                         break; // Stop loop if too many errors
                     }
                 }
            } // End for loop
            
            // console.log('[Strava Auto Kudos] Global kudos loop finished. Buttons checked: ' + processedCount);
            
        } catch (error) {
            // console.error('[Strava Auto Kudos] Error in global kudos loop:', error); // Keep console.error
            CONFIG.state.errorCount++;
        } finally {
            CONFIG.state.isProcessing = false;
        }
    },
    
    /**
     * Fonction utilitaire pour traiter un kudos réussi
     * @param {string} entryId - ID de l'entrée
     * @param {HTMLElement} kudosButton - Bouton kudos
     */
    handleSuccessfulKudos: (entryId, kudosButton) => {
        // Kudos réussi, réinitialiser le compteur d'erreurs
        CONFIG.state.errorCount = Math.max(0, CONFIG.state.errorCount - 1);
        
        // Suivre les statistiques pour l'auto-optimisation
        CONFIG.state.kudosAttempts = (CONFIG.state.kudosAttempts || 0) + 1;
        CONFIG.state.kudosSuccesses = (CONFIG.state.kudosSuccesses || 0) + 1;
        
        // CORRECTION: Ajouter vérification et logs
        // console.log('[Strava Auto Kudos] Starting handleSuccessfulKudos for entry:', entryId);
        // console.log('[Strava Auto Kudos] Current kudos count before increment:', CONFIG.state.kudosCount);
        
        // CORRECTION: Forcer la mise à jour du compteur et l'animation
        UI.incrementKudosCount();
        
        // CORRECTION: Ajouter un délai pour l'animation pour qu'elle ne se chevauche pas avec l'incrémentation
        setTimeout(() => {
            // console.log('[Strava Auto Kudos] Triggering success notification');
            UI.showSuccessNotification(kudosButton);
        }, 100);
        
        // Vérifier que le compteur a bien été incrémenté
        // console.log('[Strava Auto Kudos] Current kudos count after increment:', CONFIG.state.kudosCount);
        
        // CORRECTION: Forcer une deuxième vérification du compteur après un délai
        setTimeout(() => {
            // console.log('[Strava Auto Kudos] Final kudos count check:', CONFIG.state.kudosCount);
            // Vérifier visuellement le compteur DOM
            const counter = document.querySelector(`#strava-auto-kudos-container .${CONFIG.classes.counter}`);
            if (counter) {
                // console.log('[Strava Auto Kudos] DOM counter value:', counter.textContent);
            }
        }, 500);
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
                        
                        // Afficher une notification d'erreur sans paramètre
                        UI.showErrorNotification();
                    } else {
                        // Kudos réussi
                        successCount++;
                        CONFIG.state.errorCount = Math.max(0, CONFIG.state.errorCount - 1);
                        
                        // CORRECTION: Logs plus détaillés
                        // console.log('[Strava Auto Kudos] Successfully gave kudos in retry to entry:', item.entryId);
                        
                        // CORRECTION: Forcer une animation directement ici
                        UI.createKudosAnimation(item.kudosButton);
                        
                        // Incrémenter le compteur séparément
                        UI.incrementKudosCount();
                        // console.log('[Strava Auto Kudos] Kudos count after retry increment:', CONFIG.state.kudosCount);
                        
                        // CORRECTION: Ajouter un délai pour l'animation pour qu'elle ne se chevauche pas
                        setTimeout(() => {
                            UI.showSuccessNotification(item.kudosButton);
                        }, 100);
                    }
                } catch (error) {
                    Logger.error(`Erreur lors de la tentative de réessai pour l'entrée ${item.entryId}`, error);
                    
                    if (item.attempts < 5) {
                        item.attempts++;
                        item.timestamp = now;
                        CONFIG.state.failedKudos.push(item);
                    }
                    
                    failCount++;
                    
                    // Afficher une notification d'erreur sans paramètre
                    UI.showErrorNotification();
                    
                    // Augmenter le délai en cas d'erreur
                    await Utils.sleep(maxDelay);
                }
            }
            
            Logger.info(`Réessais terminés: ${successCount} réussis, ${failCount} échoués`);
            
            // Si des échecs subsistent, planifier un autre réessai
            if (CONFIG.state.failedKudos.length > 0) {
                if (CONFIG.state.errorCount > 5) {
                    // Afficher l'alerte de limite dépassée
                    UI.showLimitExceededAlert();
                }
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
    // console.error("[Strava Auto Kudos] KudosManager module not properly defined!"); // Keep console.error
} else {
    // console.log("[Strava Auto Kudos] KudosManager module loaded successfully");
}

// Near the end of kudosManager.js, add an initial delay:
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        KudosManager.loopKudos();
    }, 1000);
});
