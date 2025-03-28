# Strava Auto Kudos

Une extension Chrome qui automatise l'envoi de kudos sur Strava de manière intelligente et respectueuse des limites de l'API.

## Fonctionnalités

- 🚀 Envoi automatique de kudos sur les activités du flux
- ⚡ Traitement asynchrone et optimisé des performances
- 🛡️ Gestion robuste des erreurs avec système de pause progressif
- 📊 Statistiques en temps réel des kudos envoyés
- 🔄 Reprise automatique après les pauses
- 🎯 Interface utilisateur intuitive

## Installation

1. Clonez ce dépôt :
```bash
git clone https://github.com/votre-username/strava-auto-kudos.git
```

2. Ouvrez Chrome et accédez à `chrome://extensions/`
3. Activez le "Mode développeur"
4. Cliquez sur "Charger l'extension non empaquetée"
5. Sélectionnez le dossier `extension` du projet

## Architecture

L'extension est structurée en plusieurs modules :

### Core Modules

- **App** : Module principal d'initialisation
- **StateManager** : Gestion centralisée de l'état
- **KudosManager** : Gestion des kudos et des interactions avec Strava
- **ErrorManager** : Gestion des erreurs et des pauses
- **DOMManager** : Abstraction des interactions DOM
- **NotificationManager** : Gestion des notifications
- **UI** : Interface utilisateur
- **Logger** : Système de logging
- **Storage** : Gestion du stockage local
- **Utils** : Fonctions utilitaires

### Configuration

- **CONFIG** : Configuration centralisée (sélecteurs, délais, messages)

## Système de Pause

L'extension utilise un système de pause progressif pour gérer les erreurs :

1. **LIGHT** (30s) : 1-2 erreurs
2. **MEDIUM** (1min) : 3-4 erreurs
3. **HEAVY** (5min) : 5-6 erreurs
4. **CRITICAL** (24h) : 7+ erreurs

## Performance

- Traitement par lots de 5 entrées
- Délais aléatoires entre les kudos (100-300ms)
- Maximum 3 kudos simultanés
- Système de retry (3 tentatives)
- Nettoyage automatique des entrées traitées

## Développement

### Prérequis

- Chrome Browser
- Node.js (optionnel, pour les tests)

### Structure du Projet

```
extension/
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
├── manifest.json
└── README.md
```

### Tests

```bash
# À implémenter
npm test
```

## Contribution

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## Support

Pour toute question ou problème, veuillez ouvrir une issue sur GitHub.

## Changelog

### [1.0.0] - 2024-03-18
- Version initiale
- Système de pause progressif
- Gestion optimisée des performances
- Interface utilisateur améliorée
