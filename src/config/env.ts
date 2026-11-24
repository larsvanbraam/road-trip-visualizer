const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY;

export const env = {
  googleApiKey: googleApiKey ?? '',
  tabName: import.meta.env.VITE_TAB_NAME || 'Stops',
};

/**
 * Names of required environment variables that have not been configured
 */
export const missingEnvVariables = googleApiKey ? [] : ['VITE_GOOGLE_API_KEY'];
