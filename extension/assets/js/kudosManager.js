/**
 * Module pour la gestion des Kudos
 */
console.log("[Strava Auto Kudos] KudosManager module loading");

const KudosManager = {
    toggleAutoKudos() {
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

    async loopKudos() {
        if (!CONFIG.state.isEnabled || CONFIG.state.isProcessing) return;
        CONFIG.state.isProcessing = true;

        try {
            const entries = this._getAllFeedEntries();
            Logger.debug(`Total feed entries: ${entries.length}`);
            let processedCount = 0;

            for (const entry of entries) {
                if (!CONFIG.state.isEnabled) break;
                await this._processEntry(entry);
                processedCount++;
            }
            Logger.info(`${processedCount} new entries processed`);
            if (CONFIG.state.failedKudos.length && !CONFIG.state.retryActive) {
                this.scheduleRetry();
            }
        } catch (error) {
            Logger.error("Erreur lors de la boucle de kudos", error);
            CONFIG.state.errorCount++;
        } finally {
            CONFIG.state.isProcessing = false;
        }

        // Exemple d'appel depuis loopKudos ou après son exécution
        giveKudosByIcon();
    },

    _getAllFeedEntries() {
        const regularEntries = document.querySelectorAll(CONFIG.selectors.feedEntry);
        const groupItems = document.querySelectorAll(CONFIG.selectors.groupActivityItem);
        return [...regularEntries, ...groupItems];
    },

    async _processEntry(entry) {
        const entryId = entry.id || entry.getAttribute("index") || Math.random().toString();
        if (CONFIG.state.processedEntries.has(entryId)) return;

        CONFIG.state.processedEntries.add(entryId);
        const delays = Utils.getCurrentDelays();
        await Utils.sleep(delays.min);

        const kudosButton = this._findKudosButton(entry);
        if (!kudosButton) return;

        // Avoid giving kudos to one’s own activity:
        if (this._isOwnActivity(entry)) return;

        if (kudosButton.querySelector(CONFIG.selectors.unfilledKudos)) {
            try {
                kudosButton.click();
                await Utils.sleep(100);
                this._verifyKudos(entryId, kudosButton);
            } catch (clickError) {
                Logger.error("Kudos click error", clickError);
                this._handleKudosError(entryId, kudosButton);
            }
        }
    },

    _isOwnActivity(entry) {
        const ownerLink = entry.querySelector(CONFIG.selectors.ownerName);
        const currentUser = document.querySelector(CONFIG.selectors.userMenuLink);
        return ownerLink && currentUser && ownerLink.getAttribute("href") === currentUser.getAttribute("href");
    },

    _verifyKudos(entryId, kudosButton) {
        const stillUnfilled = kudosButton.querySelector(CONFIG.selectors.unfilledKudos);
        if (!stillUnfilled || kudosButton.disabled) {
            this.handleSuccessfulKudos(entryId, kudosButton);
        } else {
            // Double check
            setTimeout(() => {
                const unfilledAgain = kudosButton.querySelector(CONFIG.selectors.unfilledKudos);
                if (unfilledAgain && !kudosButton.disabled) {
                    this._handleKudosError(entryId, kudosButton);
                } else {
                    this.handleSuccessfulKudos(entryId, kudosButton);
                }
            }, 200);
        }
    },

    handleSuccessfulKudos(entryId, kudosButton) {
        CONFIG.state.errorCount = Math.max(0, CONFIG.state.errorCount - 1);
        CONFIG.state.kudosAttempts = (CONFIG.state.kudosAttempts || 0) + 1;
        CONFIG.state.kudosSuccesses = (CONFIG.state.kudosSuccesses || 0) + 1;
        this._notifyKudosSuccess(kudosButton);
        UI.incrementKudosCount();
    },

    _handleKudosError(entryId, kudosButton) {
        CONFIG.state.errorCount++;
        UI.showErrorNotification();
        CONFIG.state.failedKudos.push({
            entryId,
            kudosButton,
            attempts: 1,
            timestamp: Date.now()
        });
        Logger.warn("Kudos error, will retry later:", entryId);
    },

    _notifyKudosSuccess(kudosButton) {
        UI.showSuccessNotification(kudosButton);
    },

    scheduleRetry() {
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

    retryFailedKudos: async function() {
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
                        
                        KudosManager._notifyKudosSuccess(item.kudosButton);
                        UI.incrementKudosCount();
                    }
                } catch (error) {
                    Logger.error(`Erreur lors de la tentative de réessai pour l'entrée ${item.entryId}`, error);
                    KudosManager._handleKudosError(item.entryId, item.kudosButton);
                    
                    failCount++;
                    
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

    handleScroll() {
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

// Simple queue system to smooth out kudos bursts
const kudosQueue = [];
KudosManager.enqueueKudos = function(entry) {
    kudosQueue.push(entry);
};

KudosManager.processQueue = async function() {
    if (!CONFIG.state.isEnabled) return;
    while (kudosQueue.length && CONFIG.state.isEnabled) {
        const nextEntry = kudosQueue.shift();
        await KudosManager.giveKudosToEntry(nextEntry);
    }
};

// Reset errorCount after each successful retry
KudosManager.handleSuccessfulRetry = function() {
    CONFIG.state.errorCount = 0;
    Logger.debug("Reset errorCount after successful retry.");
};

// Ajout d'une fonction pour détecter et cliquer directement sur chaque icône de kudos non remplie
function giveKudosByIcon() {
    const unfilledIcons = document.querySelectorAll('svg[data-testid="unfilled_kudos"][fill="currentColor"]');
    unfilledIcons.forEach((icon) => {
        const kudosButton = icon.closest('button[data-testid="kudos_button"]');
        if (kudosButton) {
            // ...vérifications éventuelles pour ignorer ses propres activités...
            kudosButton.click();
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
