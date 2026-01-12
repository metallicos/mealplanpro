import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.metallicos.mealplanpro',
  appName: 'MealPlan Pro',
  webDir: 'out',
  server: {
    // Replace this with your actual Vercel URL
    url: 'https://mealplanpro-snowy.vercel.app',
    cleartext: true,
    allowNavigation: ['mealplanpro-snowy.vercel.app']
  }
};

export default config;
