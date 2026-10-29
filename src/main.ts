/**
 * Entry point for every page.
 *
 * Loaded as a native ES module, so the browser resolves the imports itself.
 * The templates carry a small inline script that sets the theme before the
 * first paint; everything else starts from here.
 */

import { ThemeController } from './ui/theme.js';
import { TranslatorApp } from './translator/app.js';
import { ErrorPageApp } from './error/app.js';

ThemeController.start();

TranslatorApp.startIfPresent();
ErrorPageApp.startIfPresent();
