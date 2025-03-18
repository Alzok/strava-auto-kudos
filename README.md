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

- Navigate to your Strava feed
- The extension will automatically give kudos to activities based on your settings
- Access the extension settings by clicking the Strava Auto Kudos icon in your browser toolbar

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

# TODO - Strava Auto Kudos Extension Improvements

This document outlines the tasks required to improve the Strava "Auto Kudos" browser extension.

## I. Performance Optimization

- **Task:** Optimize `KudosManager.loopKudos` in `kudosManager.js` to reduce DOM queries. Analyze and potentially cache results of `document.querySelectorAll` calls if they are performed repeatedly.
- **Task:** Improve the efficiency of the delay optimization in `App.initDelayOptimization` in `app.js`. Consider more adaptive algorithms for adjusting delays based on success/error rates.
- **Task:** Review and optimize the use of `setTimeout` and `setInterval` throughout the codebase (e.g., in `App.js`, `KudosManager.js`, `UI.js`). Ensure they are used efficiently and that timeouts are cleared when no longer needed.
- **Task:** Investigate potential memory leaks, especially within `KudosManager.js` and `UI.js`, where DOM manipulation and event listeners are prevalent. Use browser developer tools to profile memory usage.
- **Task:** Optimize CSS selectors in `style.css` and `popup.css` for better performance. Avoid overly specific or complex selectors that can slow down rendering.

## II. Refactoring Strategy

- **Task:** Refactor `KudosManager.loopKudos` to improve readability and maintainability. Break down the large function into smaller, more focused functions. Apply the Single Responsibility Principle.
- **Task:** Refactor the UI update logic in `UI.js` to be more modular. Consider using a state management approach or a more component-based structure to manage UI updates.
- **Task:** Apply consistent error handling throughout the codebase. Refactor error handling in functions like `Storage.save` and `Storage.load` in `storage.js` to provide more informative logging and potentially user feedback.
- **Task:** Review the use of global variables, particularly within `CONFIG.state` in `config.js`. Consider encapsulating state within modules or using a dedicated state management solution to improve code organization and prevent unintended side effects.
- **Task:** Refactor CSS in `style.css` and `popup.css` to improve organization and maintainability. Use a consistent naming convention (e.g., BEM), reduce redundancy, and consider using CSS variables.
- **Task:** Standardize the logging mechanism throughout the extension. Ensure consistent use of `Logger.js` methods with appropriate log levels (debug, info, warn, error).
- **Task:** Improve code modularity by using classes or modules more effectively. Identify areas where functionality can be encapsulated into separate classes with well-defined methods and properties.

## III. Modular Design

- **Task:** Further modularize `UI.js`. Separate concerns like DOM manipulation, animation, and state management into distinct modules or classes.
- **Task:** Explore opportunities to create reusable UI components. For example, the notification elements in `UI.js` could be extracted into a separate module.
- **Task:** Refactor `config.js` to separate configuration settings from application state. Consider using different modules or files to manage these distinct concerns.
- **Task:** Create a dedicated module for managing interactions with the Strava API (if applicable). This would encapsulate API requests, error handling, and data parsing.

## IV. Enhancements to Existing Functionality

- **Task:** Improve the robustness of the element selection in `config.js` and the corresponding logic in `KudosManager.js`. Handle cases where Strava updates its DOM structure. Implement more resilient selectors or DOM traversal techniques.
- **Task:** Enhance the logic for detecting new feed entries in `App.setupMutationObserver` in `app.js`. Consider more specific mutation observer configurations to reduce unnecessary processing.
- **Task:** Refine the logic for preventing duplicate kudos in `KudosManager.loopKudos`. Ensure that the `processedEntries` set in `config.js` is used effectively and that edge cases are handled correctly.
- **Task:** Implement a mechanism to allow users to pause auto-kudos temporarily for specific users. This could involve adding a blacklist or ignore list.
- **Task:** Enhance the error handling and user feedback. Provide more informative error messages to the user and log errors more comprehensively.
- **Task:** Implement a setting to control the speed of kudos giving (e.g., slow, medium, fast) by adjusting the delay ranges in `config.js`.

## V. New Feature Proposals

- **Task:** (Feature) Implement user-configurable options for the extension (e.g., a popup UI). This could include options to:
  - Enable/disable auto-kudos for specific activity types.
  - Set custom delay ranges.
  - Blacklist specific users.
  - Control the speed of kudos giving.
  - Toggle debug logs.
- **Task:** (Feature) Add functionality to provide kudos to comments or other elements on Strava.
- **Task:** (Feature) Implement logging options for users (e.g., enable/disable debug logs, export logs).
- **Task:** (Feature) Provide statistics on the number of kudos given, failed attempts, etc., in the extension's UI.
- **Task:** (Feature) Implement a feature to automatically follow athletes who receive kudos.

## VI. Testing Plan

- **Task:** Implement unit tests for utility functions in `utils.js`.
- **Task:** Implement integration tests for the interaction between `KudosManager.js` and `UI.js`.
- **Task:** Implement end-to-end tests to simulate user workflows, such as enabling/disabling the extension and verifying that kudos are given automatically.
- **Task:** Develop test cases to cover edge cases and error scenarios, such as:
  - Strava's DOM changes.
  - Network errors.
  - Rate limiting.
- **Task:** Implement UI tests to ensure that the extension's user interface elements are functioning correctly and displaying information as expected.

## VII. Security Analysis

- **Task:** Review all data handling and storage operations. Ensure that user data (if any) is handled securely and that there are no potential vulnerabilities related to local storage.
- **Task:** Analyze the extension's permissions in `manifest.json`. Ensure that the extension only requests the minimum necessary permissions.
- **Task:** Sanitize any user inputs or data received from Strava to prevent potential XSS vulnerabilities.
- **Task:** Implement checks to prevent the extension from being used on malicious websites. Verify the Strava domain before injecting content scripts.
- **Task:** Review the extension's update mechanism. Ensure that updates are fetched from a trusted source and that they are applied securely.
- **Task:** Implement measures to protect against potential CSRF attacks. If the extension makes any requests to Strava, ensure that appropriate CSRF tokens are included.