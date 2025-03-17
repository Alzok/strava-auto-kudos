/**
 * Module pour la gestion de l'interface utilisateur
 */
console.log("[Strava Auto Kudos] UI module loading");

const UI = {
    /**
     * Crée la bulle d'assistance flottante dans l'interface
     */
    createBulle: () => {
        console.log("[Strava Auto Kudos] Creating UI bubble");
        try {
            // Supprimer tous les conteneurs existants pour éviter les duplications
            const existingContainers = document.querySelectorAll('#strava-auto-kudos-container');
            existingContainers.forEach(container => {
                console.log("[Strava Auto Kudos] Removing existing container to avoid duplication");
                container.remove();
            });
            
            // Réinitialiser le compteur de kudos pour la session actuelle
            CONFIG.state.kudosCount = 0;
            console.log("[Strava Auto Kudos] Reset kudos count to 0 for current session");
            
            // Vérifier que le body existe
            if (!document.body) {
                console.error('[Strava Auto Kudos] document.body is not available yet!');
                // Réessayer après un délai
                setTimeout(UI.createBulle, 1000);
                return null;
            }
            
            // Vérifier l'état de pause temporaire
            const pauseUntil = parseInt(Storage.load(CONFIG.storage.pauseUntil, 0));
            const now = Date.now();
            if (pauseUntil > now) {
                CONFIG.state.pauseUntil = pauseUntil;
                CONFIG.state.isEnabled = false;
                console.log(`[Strava Auto Kudos] Extension en pause temporaire jusqu'à ${new Date(pauseUntil).toLocaleTimeString()}`);
            }
            
            // Créer le conteneur pour la bulle et le compteur
            const container = document.createElement('div');
            container.id = "strava-auto-kudos-container";
            
            // Créer la bulle 
            const bulle = document.createElement('div');
            bulle.className = CONFIG.classes.bulle;
            bulle.id = "strava-auto-kudos-bubble";
            
            // Ajouter l'icône à la bulle en fonction de l'état
            const iconDiv = document.createElement('div');
            iconDiv.className = "icon-container";
            // CORRECTION: Afficher le pouce quand actif, icône de pause quand en pause
            iconDiv.innerHTML = CONFIG.state.isEnabled ? CONFIG.icons.thumbsUp : CONFIG.icons.pause;
            bulle.appendChild(iconDiv);
            
            // Ajouter la classe d'animation si activé et pas en pause temporaire
            if (CONFIG.state.isEnabled && !CONFIG.state.pauseUntil) {
                bulle.classList.add(CONFIG.classes.run);
            } else if (CONFIG.state.pauseUntil > now) {
                // Si en pause temporaire, griser la bulle
                bulle.classList.add('paused');
                bulle.style.opacity = '0.6';
            }
            
            // Ajouter l'événement de clic pour activer/désactiver
            bulle.addEventListener('click', () => {
                console.log("[Strava Auto Kudos] Bubble clicked, toggling auto kudos");
                
                // Si en pause temporaire à cause d'un rate limit, ne pas permettre l'activation
                if (CONFIG.state.pauseUntil > Date.now() && CONFIG.state.errorCount > 5) {
                    console.log("[Strava Auto Kudos] Extension en pause forcée, impossible d'activer");
                    // Rappeler à l'utilisateur pourquoi l'extension est en pause
                    UI.showLimitExceededAlert();
                    return;
                }
                
                // Si en pause temporaire et on clique, annuler la pause
                if (CONFIG.state.pauseUntil > Date.now()) {
                    UI.cancelAutoPause();
                } else {
                    KudosManager.toggleAutoKudos();
                    // Sauvegarder l'état dans la session
                    sessionStorage.setItem('strava_auto_kudos_state', CONFIG.state.isEnabled ? 'active' : 'paused');
                }
            });
            
            // Créer le compteur
            const counter = document.createElement('div');
            counter.className = CONFIG.classes.counter;
            counter.textContent = CONFIG.state.kudosCount;
            console.log("[Strava Auto Kudos] New counter created with value:", CONFIG.state.kudosCount);
            
            // Créer une zone pour les notifications flottantes
            const notifArea = document.createElement('div');
            notifArea.id = "strava-auto-kudos-notifications";
            
            // Assembler les éléments
            container.appendChild(notifArea);  // Zone de notification au-dessus
            container.appendChild(counter);    // Compteur 
            container.appendChild(bulle);      // Bulle en dessous
            
            // Ajouter le conteneur au body
            document.body.appendChild(container);
            
            // Si l'extension est en pause, afficher le timer
            if (pauseUntil > now) {
                UI.showCountdownTimer(pauseUntil);
            }
            
            console.log("[Strava Auto Kudos] UI bubble created successfully and added to DOM");
            
            return bulle;
        } catch (error) {
            console.error('[Strava Auto Kudos] Error creating UI bubble:', error);
            return null;
        }
    },
    
    /**
     * Vérifie si la bulle existe et la crée si nécessaire
     * @returns {HTMLElement} - L'élément bulle
     */
    ensureBulleExists: () => {
        // Vérifier d'abord les duplications de conteneurs et les corriger
        const containers = document.querySelectorAll('#strava-auto-kudos-container');
        
        if (containers.length > 1) {
            console.warn('[Strava Auto Kudos] Multiple containers detected, cleaning up...');
            // Supprimer tous les conteneurs sauf le premier
            for (let i = 1; i < containers.length; i++) {
                containers[i].remove();
            }
        }
        
        // Rechercher la bulle
        let bulle = document.querySelector(`#strava-auto-kudos-bubble`);
        
        if (!bulle) {
            console.log('[Strava Auto Kudos] No bubble found, creating a new one');
            bulle = UI.createBulle();
        }
        
        return bulle;
    },

    /**
     * Met à jour le statut visuel de la bulle
     * @param {boolean} enabled - État d'activation
     */
    updateBulleStatus: (enabled) => {
        console.log(`[Strava Auto Kudos] Updating UI bubble status: ${enabled ? 'enabled' : 'disabled'}`);
        try {
            const bulle = UI.ensureBulleExists();
            
            if (!bulle) {
                console.error('[Strava Auto Kudos] Bulle not found for status update');
                return;
            }
            
            // Mettre à jour la classe active
            if (enabled) {
                bulle.classList.add(CONFIG.classes.run);
            } else {
                bulle.classList.remove(CONFIG.classes.run);
            }
            
            // Mettre à jour l'icône - CORRECTION: pouce quand actif, pause quand inactif
            const iconDiv = bulle.querySelector('.icon-container');
            if (iconDiv) {
                iconDiv.innerHTML = enabled ? CONFIG.icons.thumbsUp : CONFIG.icons.pause;
            }
            
            // Mettre à jour la classe paused
            if (enabled) {
                bulle.classList.remove('paused');
            } else {
                bulle.classList.add('paused');
            }
        } catch (error) {
            console.error('[Strava Auto Kudos] Error updating UI bubble status:', error);
        }
    },
    
    /**
     * Crée ou met à jour le compteur de Kudos
     */
    updateKudosCounter: () => {
        const bulle = UI.ensureBulleExists();
        let counter = document.querySelector(`#strava-auto-kudos-container .${CONFIG.classes.counter}`);
        
        if (!counter) {
            counter = document.createElement('div');
            counter.className = CONFIG.classes.counter;
            const container = document.getElementById('strava-auto-kudos-container');
            if (container) {
                container.appendChild(counter);
            }
        }
        
        counter.textContent = CONFIG.state.kudosCount > 999 ? '999+' : CONFIG.state.kudosCount;
    },
    
    /**
     * Incrémente le compteur de kudos et met à jour l'interface
     */
    incrementKudosCount: () => {
        try {
            // Incrémenter le compteur pour cette session uniquement
            CONFIG.state.kudosCount += 1;
            
            console.log(`[Strava Auto Kudos] Incrementing kudos counter to:`, CONFIG.state.kudosCount);
            
            // CORRECTION: Problème identifié - le sélecteur CSS ne correspond pas exactement
            // Vérifier le sélecteur exact et afficher le compteur trouvé
            const allCounters = document.querySelectorAll('#strava-auto-kudos-container > div');
            console.log('[Strava Auto Kudos] All child divs in container:', allCounters.length);
            
            const counter = document.querySelector(`#strava-auto-kudos-container .${CONFIG.classes.counter}`);
            console.log('[Strava Auto Kudos] Counter element found?', counter ? 'Yes' : 'No', counter);
            
            if (counter) {
                // Forcer l'affichage de la nouvelle valeur
                const displayValue = CONFIG.state.kudosCount > 999 ? '999+' : CONFIG.state.kudosCount;
                counter.textContent = displayValue;
                
                // Faire clignoter le compteur pour montrer qu'il a été mis à jour
                counter.style.transition = 'transform 0.2s';
                counter.style.transform = 'scale(1.3)';
                
                // CORRECTION: Assurer que le compteur est visible
                counter.style.display = 'block';
                counter.style.visibility = 'visible';
                counter.style.opacity = '1';
                
                setTimeout(() => {
                    counter.style.transform = 'scale(1)';
                }, 200);
                
                console.log('[Strava Auto Kudos] Counter UI updated to:', displayValue);
            } else {
                console.error('[Strava Auto Kudos] Counter element not found, recreating counter');
                
                // CORRECTION: Créer un nouveau compteur si non trouvé au lieu de recréer toute la bulle
                const container = document.getElementById('strava-auto-kudos-container');
                if (container) {
                    const newCounter = document.createElement('div');
                    newCounter.className = CONFIG.classes.counter;
                    newCounter.textContent = CONFIG.state.kudosCount;
                    newCounter.style.display = 'block';
                    
                    // Ajouter en position correcte (avant la bulle qui est le dernier élément)
                    const bulle = document.querySelector('#strava-auto-kudos-bubble');
                    if (bulle && bulle.parentNode === container) {
                        container.insertBefore(newCounter, bulle);
                    } else {
                        container.appendChild(newCounter);
                    }
                    
                    console.log('[Strava Auto Kudos] New counter created:', newCounter);
                }
            }
        } catch (error) {
            console.error('[Strava Auto Kudos] Error incrementing kudos count:', error);
        }
    },
    
    /**
     * Crée une animation de kudos à partir d'un élément
     * @param {HTMLElement} element - Élément kudos depuis lequel l'animation démarre
     */
    createKudosAnimation: (element) => {
        try {
            console.log('[Strava Auto Kudos] Creating kudos animation, element provided:', !!element);
            
            // CORRECTION: Forcer la création de plusieurs animations pour plus de visibilité
            const notificationsCount = 2; // Toujours créer 2 animations
            
            for (let i = 0; i < notificationsCount; i++) {
                let startX, startY;
                
                // Si on a l'élément d'origine (bouton kudos)
                if (element && document.body.contains(element)) {
                    const rect = element.getBoundingClientRect();
                    startX = rect.left + rect.width / 2;
                    startY = rect.top;
                    console.log('[Strava Auto Kudos] Animation start from kudos button:', startX, startY);
                } else {
                    // CORRECTION: Position de départ fixe depuis le centre inférieur de l'écran
                    startX = window.innerWidth / 2;
                    startY = window.innerHeight - 100;
                    console.log('[Strava Auto Kudos] Animation start from fixed position:', startX, startY);
                }
                
                // CORRECTION: Variation plus importante pour mieux voir les animations multiples
                startX += (Math.random() - 0.5) * 100;
                
                // Variation horizontale pour un effet cascade
                const xVariation = i * 20; 
                startX += xVariation;

                // Créer l'élément de notification avec style inline forcé
                const notification = document.createElement('div');
                notification.textContent = "+1";
                
                // CORRECTION: Appliquer tous les styles directement pour éviter les conflits CSS
                const styles = {
                    position: 'fixed',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: '2147483647',
                    opacity: '1',
                    fontSize: '20px', // Augmenter la taille pour plus de visibilité
                    fontWeight: 'bold',
                    color: '#fc5200',
                    padding: '4px 8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '4px',
                    pointerEvents: 'none'
                };
                
                // Appliquer tous les styles
                Object.assign(notification.style, styles);
                
                // Au lieu de document.body, on place l'animation dans la zone de notifications
                const notifArea = document.getElementById('strava-auto-kudos-notifications');
                if (notifArea) {
                    notifArea.appendChild(notification);
                } else {
                    document.body.appendChild(notification);
                }
                
                console.log(`[Strava Auto Kudos] Animation ${i+1} element created:`, notification);
                
                // CORRECTION: Animation avec requestAnimationFrame pour fiabilité maximale
                const startTime = Date.now();
                const duration = 2000;
                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    if (elapsed < duration) {
                        const progress = elapsed / duration;
                        const ty = -120 * progress; // Déplacement vertical plus important
                        const scale = 1.2 - 0.5 * progress;
                        const opacity = progress < 0.2 ? 
                                        progress * 5 : // Apparition rapide 
                                        1 - (progress - 0.2) * 1.25; // Disparition progressive
                        
                        notification.style.transform = `translateX(-50%) translateY(${ty}px) scale(${scale})`;
                        notification.style.opacity = opacity.toString();
                        
                        requestAnimationFrame(animate);
                    } else {
                        // Nettoyer à la fin
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                            console.log(`[Strava Auto Kudos] Animation ${i+1} removed`);
                        }
                    }
                };
                
                // Démarrer l'animation
                requestAnimationFrame(animate);
            }
        } catch (error) {
            console.error('[Strava Auto Kudos] Error creating kudos animation:', error);
        }
    },

    /**
     * Crée une notification flottante
     * @param {boolean} isSuccess - True si succès, false si erreur
     * @param {number} x - Position horizontale
     * @param {number} y - Position verticale
     */
    createFloatingNotification: (isSuccess, x, y) => {
        // Créer l'élément de notification
        const notification = document.createElement('div');
        notification.className = `${CONFIG.classes.floatingNotification} ${isSuccess ? CONFIG.classes.success : CONFIG.classes.error}`;
        
        // Ajouter l'icône appropriée
        notification.innerHTML = isSuccess ? CONFIG.icons.floatingSuccess : CONFIG.icons.floatingError;
        
        // Positionner la notification
        notification.style.left = `${x}px`;
        notification.style.top = `${y}px`;
        
        // Ajouter au DOM
        document.body.appendChild(notification);
        
        // Supprimer après l'animation
        setTimeout(() => {
            // CORRECTION: Vérifier le parent avant de supprimer
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 1600); // Un peu plus que la durée de l'animation (1.5s)
    },

    /**
     * Fonction interne pour afficher une notification
     * @private
     * @param {string} type - Type de notification ('success' ou 'error')
     * @param {HTMLElement} [element] - Élément à partir duquel l'animation démarre (pour success)
     */
    _displayNotification: (type, element) => {
        try {
            // CORRECTION: Toujours créer l'animation, peu importe le type ou l'élément
            if (type === 'success') {
                console.log('[Strava Auto Kudos] Display success notification called');
                // Toujours forcer l'animation, même sans élément
                UI.createKudosAnimation(element);
                return;
            }
        } catch (error) {
            console.error('[Strava Auto Kudos] Error displaying notification:', error);
        }
    },

    /**
     * Affiche une notification de succès
     * @param {HTMLElement} [kudosButton] - Le bouton kudos qui a été cliqué
     */
    showSuccessNotification: (kudosButton) => {
        UI._displayNotification('success', kudosButton);
    },
    
    /**
     * Affiche une notification d'erreur
     */
    showErrorNotification: () => {
        UI._displayNotification('error');
    },
    
    /**
     * Fonction pour réinitialiser le compteur de kudos de la session actuelle
     */
    resetSessionKudosCount: () => {
        CONFIG.state.kudosCount = 0;
    },
    
    /**
     * Affiche une alerte quand Strava limite le nombre d'interactions
     */
    showLimitExceededAlert: () => {
        try {
            // Vérifier si une alerte est déjà affichée
            if (document.querySelector('#strava-rate-limit-alert')) {
                return; // Ne pas afficher plusieurs alertes
            }
            
            // Mettre en pause l'extension automatiquement pour 5 minutes
            UI.pauseExtensionTemporarily(5 * 60 * 1000);
            
            // Créer l'élément d'alerte avec la classe CSS
            const alertElement = document.createElement('div');
            alertElement.id = 'strava-rate-limit-alert';
            alertElement.className = 'strava-auto-kudos-alert';
            
            // Icône d'avertissement
            const iconSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="strava-auto-kudos-alert-icon">
                    <path d="M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z"/>
                </svg>
            `;
            
            // Message mis à jour pour inclure l'information sur la pause
            alertElement.innerHTML = `
                ${iconSvg}
                <div>
                    <strong>Uhoh! Can't give Kudos anymore!</strong>
                    <div>Strava limits the number of requests. You've sent too many kudos! Auto-Kudos is now paused for 5 minutes.</div>
                </div>
            `;
            
            // Ajouter le bouton de fermeture
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '×';
            closeButton.className = 'strava-auto-kudos-alert-close';
            closeButton.addEventListener('click', function() {
                alertElement.remove();
            });
            
            alertElement.appendChild(closeButton);
            document.body.appendChild(alertElement);
            
            // Auto-fermeture après 30 secondes (augmenté de 15s à 30s)
            setTimeout(() => {
                if (alertElement.parentNode) {
                    alertElement.remove();
                }
            }, 30000);
            
            console.log("[Strava Auto Kudos] Rate limit alert displayed, extension paused for 5 minutes");
        } catch (error) {
            console.error("[Strava Auto Kudos] Error showing rate limit alert:", error);
        }
    },
    
    /**
     * Vérifie s'il y a une pause temporaire active
     */
    checkForActivePause: () => {
        const pauseUntil = parseInt(Storage.load(CONFIG.storage.pauseUntil, 0));
        const now = Date.now();
        
        if (pauseUntil > now) {
            // L'extension est en pause
            CONFIG.state.pauseUntil = pauseUntil;
            CONFIG.state.isEnabled = false;
            UI.updateBulleStatus(false);
            UI.showCountdownTimer(pauseUntil);
            console.log(`[Strava Auto Kudos] Extension en pause jusqu'à ${new Date(pauseUntil).toLocaleTimeString()}`);
        }
    },
    
    /**
     * Met en pause l'extension pour une durée spécifiée
     * @param {number} duration - Durée de la pause en millisecondes (par défaut 5 minutes)
     */
    pauseExtensionTemporarily: (duration = 5 * 60 * 1000) => {
        // Calculer l'heure de fin de pause
        const pauseUntil = Date.now() + duration;
        
        // Sauvegarder l'heure de fin de pause
        CONFIG.state.pauseUntil = pauseUntil;
        Storage.save(CONFIG.storage.pauseUntil, pauseUntil);
        
        // Désactiver l'extension
        CONFIG.state.isEnabled = false;
        Storage.save(CONFIG.storage.enabled, false);
        
        // Mettre à jour l'interface
        UI.updateBulleStatus(false);
        
        // Afficher le timer avec compte à rebours
        UI.showCountdownTimer(pauseUntil);
        
        console.log(`[Strava Auto Kudos] Extension auto-paused until ${new Date(pauseUntil).toLocaleTimeString()}`);
    },
    
    /**
     * Annule une pause temporaire en cours
     */
    cancelAutoPause: () => {
        // Supprimer l'heure de fin de pause
        CONFIG.state.pauseUntil = 0;
        Storage.save(CONFIG.storage.pauseUntil, 0);
        
        // Supprimer le timer s'il existe
        const timerElement = document.getElementById('strava-auto-kudos-timer');
        if (timerElement) {
            timerElement.remove();
        }
        
        // Réactiver l'extension
        CONFIG.state.isEnabled = true;
        Storage.save(CONFIG.storage.enabled, true);
        UI.updateBulleStatus(true);
        
        // Réinitialiser également le compteur d'erreurs pour permettre une nouvelle tentative
        CONFIG.state.errorCount = 0;
        
        console.log('[Strava Auto Kudos] Auto-pause cancelled, extension reactivated');
    },
    
    /**
     * Affiche un timer avec compte à rebours
     * @param {number} endTime - Timestamp de fin du compte à rebours
     */
    showCountdownTimer: (endTime) => {
        // Supprimer l'ancien timer s'il existe
        const existingTimer = document.getElementById('strava-auto-kudos-timer');
        if (existingTimer) {
            existingTimer.remove();
        }
        
        // Créer le timer
        const timerElement = document.createElement('div');
        timerElement.id = 'strava-auto-kudos-timer';
        
        // Ajouter au DOM
        document.body.appendChild(timerElement);
        
        // Mettre à jour le timer toutes les secondes
        const updateTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, endTime - now);
            
            if (remaining <= 0) {
                // Temps écoulé, réactiver l'extension
                timerElement.remove();
                UI.cancelAutoPause();
                return;
            }
            
            // Calculer minutes et secondes
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            
            // Afficher le temps restant
            timerElement.innerHTML = `Pause: ${minutes}m ${seconds}s <span id="cancel-pause">✕</span>`;
            
            // Ajouter événement pour annuler la pause
            const cancelBtn = document.getElementById('cancel-pause');
            if (cancelBtn) {
                cancelBtn.onclick = (e) => {
                    e.stopPropagation();
                    UI.cancelAutoPause();
                };
            }
            
            // Continuer la mise à jour
            setTimeout(updateTimer, 1000);
        };
        
        // Démarrer la mise à jour
        updateTimer();
    },

    // Ajouter cette fonction pour charger l'état de la session au démarrage
    loadSessionState: function() {
        const sessionState = sessionStorage.getItem('strava_auto_kudos_state');
        if (sessionState === 'paused') {
            CONFIG.state.isEnabled = false;
            Storage.save(CONFIG.storage.enabled, false);
        } else if (sessionState === 'active' || sessionState === null) {
            CONFIG.state.isEnabled = true;
            Storage.save(CONFIG.storage.enabled, true);
        }
        
        // Mettre à jour l'interface
        UI.updateBulleStatus(CONFIG.state.isEnabled);
    }
};

// Ajouter cette propriété à l'objet UI
let errorAlreadyDisplayed = false;

// Remplacer la méthode showAlert
UI.showAlert = function() {
    // Ne pas afficher l'alerte si elle a déjà été montrée et pas fermée
    if (errorAlreadyDisplayed) return;
    
    errorAlreadyDisplayed = true;
    
    // Créer l'élément d'alerte avec la classe CSS
    const alertElement = document.createElement('div');
    alertElement.className = 'strava-auto-kudos-alert';
    
    // Icône d'avertissement
    const iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="strava-auto-kudos-alert-icon">
            <path d="M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z"/>
        </svg>
    `;
    
    // Message mis à jour pour inclure l'information sur la pause
    alertElement.innerHTML = `
        ${iconSvg}
        <div>
            <strong>Uhoh! Can't give Kudos anymore!</strong>
            <div>Strava limits the number of requests. You've sent too many kudos! Auto-Kudos is now paused for 5 minutes.</div>
        </div>
    `;
    
    // Ajouter le bouton de fermeture
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.className = 'strava-auto-kudos-alert-close';
    closeButton.addEventListener('click', function() {
        alertElement.remove();
    });
    
    alertElement.appendChild(closeButton);
    document.body.appendChild(alertElement);
    
    // Auto-supprimer après 30 secondes (augmenté de 10s à 30s)
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.remove();
        }
    }, 30000);
};

// Modifier la méthode togglePause pour inverser la logique des icônes
UI.togglePause = function() {
    const isPaused = Storage.getItem('isPaused') === 'true';
    const newPausedState = !isPaused;
    
    Storage.setItem('isPaused', newPausedState);
    
    // Mettre à jour l'icône
    const bulle = document.querySelector('.' + CONFIG.classes.bulle);
    if (bulle) {
        if (newPausedState) {
            // Si maintenant en pause, afficher l'icône de pause
            bulle.innerHTML = `<div class="icon-container">${CONFIG.icons.pause}</div>`;
            bulle.classList.add('paused');
        } else {
            // Si maintenant actif, afficher l'icône du pouce
            bulle.innerHTML = `<div class="icon-container">${CONFIG.icons.thumbsUp}</div>`;
            bulle.classList.remove('paused');
        }
    }
    
    return newPausedState;
};

// Mettre à jour la méthode initUI pour définir la bonne icône au démarrage
UI.initUI = function() {
    // ...existing code...
    
    // Vérifier si l'extension est en pause
    const isPaused = Storage.getItem('isPaused') === 'true';
    
    // Créer la bulle avec l'icône appropriée
    const bulle = document.createElement('div');
    bulle.className = CONFIG.classes.bulle;
    if (isPaused) {
        bulle.innerHTML = `<div class="icon-container">${CONFIG.icons.pause}</div>`;
        bulle.classList.add('paused');
    } else {
        bulle.innerHTML = `<div class="icon-container">${CONFIG.icons.thumbsUp}</div>`;
    }
    
    // ...existing code...
};

// Modifier la fonction showPauseTimer pour utiliser les classes CSS
UI.showPauseTimer = function(duration) {
    const endTime = Date.now() + duration;
    
    // Créer l'élément de timer
    const timerElement = document.createElement('div');
    timerElement.id = 'strava-auto-kudos-timer';
    
    // Mettre à jour le timer toutes les secondes
    const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        
        if (remaining <= 0) {
            // Temps écoulé, réactiver l'extension
            timerElement.remove();
            UI.cancelAutoPause();
            return;
        }
        
        // Calculer minutes et secondes
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        // Afficher le temps restant
        timerElement.innerHTML = `Pause: ${minutes}m ${seconds}s <span id="cancel-pause">✕</span>`;
        
        // ...existing code...
    };
    
    // ...existing code...
    
    // Réinitialiser le flag d'erreur lorsque la pause est terminée
    UI.cancelAutoPause = function() {
        clearTimeout(UI.pauseTimeout);
        clearInterval(UI.timerInterval);
        
        UI.isPaused = false;
        Storage.setItem('isPaused', false);
        
        // Mise à jour de l'icône
        const bulle = document.querySelector('.' + CONFIG.classes.bulle);
        if (bulle) {
            bulle.innerHTML = `<div class="icon-container">${CONFIG.icons.thumbsUp}</div>`;
            bulle.classList.remove('paused');
        }
        
        // Réinitialiser le flag d'erreur pour permettre de nouveaux messages après une pause
        errorAlreadyDisplayed = false;
    };
    
    // ...existing code...
};

// Remplacer la ligne qui provoque l'erreur
// module.exports = UI;

// Par cette vérification conditionnelle
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}

if (typeof module !== 'undefined') {
    console.error("[Strava Auto Kudos] UI module not properly defined!");
} else {
    console.log("[Strava Auto Kudos] UI module loaded successfully");
}