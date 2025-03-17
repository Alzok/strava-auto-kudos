/**
 * Module pour la gestion des Kudos
 */
console.log("[Strava Auto Kudos] KudosManager module loading");

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
            
            // Récupérer d'abord toutes les entrées normales
            const regularEntries = document.querySelectorAll(CONFIG.selectors.feedEntry);
            
            // Récupérer ensuite toutes les entrées d'activités groupées
            const groupedActivities = [];
            document.querySelectorAll(CONFIG.selectors.groupActivityItem).forEach(item => {
                groupedActivities.push(item);
            });
            
            // Combiner toutes les entrées
            const allEntries = [...regularEntries, ...groupedActivities];
            
            Logger.debug(`Nombre total d'entrées dans le flux: ${allEntries.length} (${regularEntries.length}, ${groupedActivities.length} groupées)`);
            
            let newEntriesCount = 0;
            
            // Déterminer les délais à utiliser
            const delays = Utils.getCurrentDelays();
            
            // Traitement dans l'ordre original des activités (sans randomisation)
            for (const entry of allEntries) {
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
                
                // Attendre un temps minimal pour éviter d'être bloqué
                const delay = CONFIG.state.errorCount > 0 
                    ? Utils.randomIntFromInterval(delays.min, delays.max) 
                    : Math.min(50, delays.min); // Délai ultra-court si pas d'erreurs précédentes
                await Utils.sleep(delay);
                
                // Trouver le bouton kudos - méthode plus robuste pour les activités groupées
                let kudosButton;
                
                // Pour les activités groupées, chercher le bouton kudos directement dans l'entrée
                if (entry.closest(CONFIG.selectors.groupActivityList)) {
                    kudosButton = entry.querySelector(CONFIG.selectors.kudosButton);
                    Logger.debug('Entrée groupée détectée, bouton kudos trouvé:', kudosButton ? 'oui' : 'non');
                } else {
                    // Pour les entrées normales, méthode standard
                    kudosButton = entry.querySelector(CONFIG.selectors.kudosButton);
                    Logger.debug('Entrée normale, bouton kudos trouvé:', kudosButton ? 'oui' : 'non');
                }
                
                // Si on n'a pas trouvé le bouton, on ignore cette entrée
                if (!kudosButton) {
                    Logger.debug('Bouton kudos non trouvé dans cette entrée', entry);
                    continue;
                }
                
                // Récupère l'URL du propriétaire de l'entrée - plus robuste
                let ownerNameElement;
                if (entry.closest(CONFIG.selectors.groupActivityList)) {
                    // Pour les activités groupées
                    ownerNameElement = entry.querySelector(CONFIG.selectors.ownerName);
                } else {
                    // Pour les entrées normales
                    ownerNameElement = entry.querySelector(CONFIG.selectors.ownerName) || 
                                      entry.closest(CONFIG.selectors.feedEntry)?.querySelector(CONFIG.selectors.ownerName);
                }
                
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
                
                // Vérifier si le kudos n'est pas déjà donné
                const unfilledKudosIcon = kudosButton.querySelector(CONFIG.selectors.unfilledKudos);
                
                if (unfilledKudosIcon) {
                    try {
                        Logger.debug(`Tentative de kudos pour l'entrée ${entryId}`);
                        
                        // Approche ultra-rapide pour cliquer sur le bouton
                        try {
                            // Clic direct sans événements complexes pour maximiser la vitesse
                            kudosButton.click();
                            console.log('[Strava Auto Kudos] Clicked kudos button directly:', kudosButton);
                        } catch (e) {
                            // En cas d'échec, essayer avec un événement MouseEvent plus complet
                            const clickEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window
                            });
                            kudosButton.dispatchEvent(clickEvent);
                            console.log('[Strava Auto Kudos] Used dispatchEvent for click fallback');
                        }
                        
                        // Vérification très rapide si l'action a réussi
                        await Utils.sleep(100); // Très court délai de vérification
                        
                        // Vérifier si le bouton a changé d'état
                        const stillUnfilled = kudosButton.querySelector(CONFIG.selectors.unfilledKudos);
                        
                        // CORRECTION: tenir compte du bouton qui devient disabled dès le clic direct
                        if (!stillUnfilled || kudosButton.disabled) {
                            KudosManager.handleSuccessfulKudos(entryId, kudosButton);
                        } else {
                            await Utils.sleep(200);
                            const stillUnfilledSecondCheck = kudosButton.querySelector(CONFIG.selectors.unfilledKudos);
                            if (stillUnfilledSecondCheck && !kudosButton.disabled) {
                                // Vraiment en échec, ajouter à la liste des entrées à réessayer
                                Logger.debug(`Échec du kudos pour l'entrée ${entryId}`);
                                
                                CONFIG.state.failedKudos.push({
                                    entryId,
                                    kudosButton,
                                    attempts: 1,
                                    timestamp: Date.now()
                                });
                                
                                CONFIG.state.errorCount++;
                                
                                // Si trop d'erreurs, ralentir considérablement
                                if (CONFIG.state.errorCount > 5) {
                                    Logger.info('Trop d\'erreurs détectées, ralentissement significatif');
                                    // Afficher l'alerte de limite dépassée
                                    UI.showLimitExceededAlert();
                                    await Utils.sleep(1000); // Pause marquée
                                }
                            } else {
                                // Finalement réussi après une attente plus longue
                                KudosManager.handleSuccessfulKudos(entryId, kudosButton);
                            }
                        }
                    } catch (clickError) {
                        // Erreur lors du clic, possible erreur 429
                        Logger.error('Erreur lors du clic sur le bouton kudos', clickError);
                        
                        CONFIG.state.errorCount++;
                        
                        // Afficher une notification d'erreur sans paramètre
                        UI.showErrorNotification();
                        
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
                            // Afficher l'alerte de limite dépassée
                            UI.showLimitExceededAlert();
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

        // Exemple d'appel depuis loopKudos ou après son exécution
        giveKudosByIcon();
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
        console.log('[Strava Auto Kudos] Starting handleSuccessfulKudos for entry:', entryId);
        console.log('[Strava Auto Kudos] Current kudos count before increment:', CONFIG.state.kudosCount);
        
        // CORRECTION: Forcer la mise à jour du compteur et l'animation
        UI.incrementKudosCount();
        
        // CORRECTION: Ajouter un délai pour l'animation pour qu'elle ne se chevauche pas avec l'incrémentation
        setTimeout(() => {
            console.log('[Strava Auto Kudos] Triggering success notification');
            UI.showSuccessNotification(kudosButton);
        }, 100);
        
        // Vérifier que le compteur a bien été incrémenté
        console.log('[Strava Auto Kudos] Current kudos count after increment:', CONFIG.state.kudosCount);
        
        // CORRECTION: Forcer une deuxième vérification du compteur après un délai
        setTimeout(() => {
            console.log('[Strava Auto Kudos] Final kudos count check:', CONFIG.state.kudosCount);
            // Vérifier visuellement le compteur DOM
            const counter = document.querySelector(`#strava-auto-kudos-container .${CONFIG.classes.counter}`);
            if (counter) {
                console.log('[Strava Auto Kudos] DOM counter value:', counter.textContent);
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
                        console.log('[Strava Auto Kudos] Successfully gave kudos in retry to entry:', item.entryId);
                        
                        // CORRECTION: Forcer une animation directement ici
                        UI.createKudosAnimation(item.kudosButton);
                        
                        // Incrémenter le compteur séparément
                        UI.incrementKudosCount();
                        console.log('[Strava Auto Kudos] Kudos count after retry increment:', CONFIG.state.kudosCount);
                        
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

// Ajout d'une fonction pour détecter et cliquer directement sur chaque icône de kudos non remplie
function giveKudosByIcon() {
    const unfilledIcons = document.querySelectorAll('svg[data-testid="unfilled_kudos"][fill="currentColor"]');
    unfilledIcons.forEach((icon) => {
        const kudosButton = icon.closest('button[data-testid="kudos_button"]');
        if (kudosButton) {
            // ...vérifications éventuelles pour ignorer ses propres activités...
            kudosButton.click();
            KudosManager.handleSuccessfulKudos(`icon-${Math.random()}`, kudosButton);
        }
    });
}

// Exporter le module de gestion des kudos
if (typeof module !== 'undefined') {
    module.exports = KudosManager;
}

// Ajoutez ces lignes à la fin du fichier
if (typeof KudosManager !== 'undefined') {
    console.log("[Strava Auto Kudos] KudosManager module loaded successfully");
} else {
    console.error("[Strava Auto Kudos] KudosManager module not properly defined!");
}

// Supprimer la condition de scroll pour donner les kudos immédiatement
setInterval(() => {
    if (CONFIG.state.isEnabled) {
        Logger.debug('Periodic kudos check triggered');
        KudosManager.loopKudos();
    }
}, 200);

// Near the end of kudosManager.js, add an initial delay:
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        KudosManager.loopKudos();
    }, 1000);
});
