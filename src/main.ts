/**
 * Entry point for every page.
 *
 * Reflect metadata is imported first because tsyringe reads the design
 * metadata TypeScript emits for constructor parameters on first use.
 */

import 'reflect-metadata';

import { ThemeController } from './ui/theme.js';
import { TranslatorApp } from './translator/app.js';
import { ErrorPageApp } from './error/app.js';

ThemeController.start();

TranslatorApp.startIfPresent();
ErrorPageApp.startIfPresent();
