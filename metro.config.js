const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname)

// Add resolver for PDF.js
config.resolver.alias = {
  ...config.resolver.alias,
  'fs': false,
  'path': false,
  'crypto': false,
}

module.exports = withNativeWind(config, { input: './globals.css' })