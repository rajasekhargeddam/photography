import { defineCloudflareConfig } from '@opennextjs/cloudflare';

const config = {
  ...defineCloudflareConfig({}),
  // Avoid recursively invoking the mode-aware npm build launcher.
  buildCommand: 'node node_modules/next/dist/bin/next build',
};
export default config;
