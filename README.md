# Strava Auto Kudos

A Chrome extension that automatically gives kudos to activities in your Strava feed.

## Features

- Automatically gives kudos to activities in your Strava feed
- Customizable settings for which activities receive kudos
- Visual indicators showing which activities have received automatic kudos
- Works seamlessly in the background when browsing Strava

## Installation

1. Visit the Chrome Web Store at [Strava Auto Kudos](https://chromewebstore.google.com/detail/strava-auto-kudos/gpifcdlpbfehjkkojfhmlfgplalikdjf)
2. Click "Add to Chrome" to install the extension
3. Once installed, navigate to [Strava](https://www.strava.com) to use the extension

## Usage

After installation, the extension works automatically when you browse Strava:

1. Navigate to your Strava feed
2. The extension will automatically give kudos to activities based on your settings
3. Access the extension settings by clicking the Strava Auto Kudos icon in your browser toolbar

## Code Structure

The extension is organized as follows:

- `manifest.json`: Extension configuration and metadata
- `assets/js/`: JavaScript files that power the extension
  - `config.js`: Configuration options for the extension
  - `logger.js`: Logging functionality
  - `storage.js`: Handles saving and loading user preferences
  - `utils.js`: Helper functions used throughout the extension
  - `ui.js`: User interface components and interaction
  - `kudosManager.js`: Core functionality for giving kudos
  - `app.js`: Main application logic
  - `main.js`: Entry point for the extension
- `assets/css/style.css`: Styling for the extension's UI elements
- `icon16.png`, `icon48.png`, `icon128.png`: Extension icons in various sizes
- `strava.png`: Default action icon

## For Developers

### Extension Architecture

The extension follows a modular architecture:

- Configuration is separated from business logic
- Storage module abstracts Chrome storage API
- UI components are isolated in the UI module
- KudosManager handles the core functionality of giving kudos

### Building from Source

1. Clone the repository
2. Install dependencies: `npm install`
3. Use gulp to build: `gulp build`
4. Load the unpacked extension from the `prod` directory in Chrome's developer mode

## Version

Current version: 1.6.0
