const msal = require('@azure/msal-node');

/**
 * Configuration for MSAL Node
 * You will need to fill in CLIENT_ID, TENANT_ID, and CLIENT_SECRET in your .env file
 */
const msalConfig = {
  auth: {
    clientId: process.env.CLIENT_ID || "YOUR_CLIENT_ID",
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID || "common"}`,
    clientSecret: process.env.CLIENT_SECRET || "YOUR_CLIENT_SECRET",
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: msal.LogLevel.Info,
    },
  },
};

const cca = new msal.ConfidentialClientApplication(msalConfig);

const getAuthCodeUrl = (role) => {
  const authCodeUrlParameters = {
    scopes: ["user.read", "mail.send", "Calendars.ReadWrite"],
    redirectUri: process.env.REDIRECT_URI || "http://localhost:3000/api/auth/redirect",
    state: role, // Pass the role through the state parameter
  };

  return cca.getAuthCodeUrl(authCodeUrlParameters);
};

const acquireTokenByCode = (code) => {
  const tokenRequest = {
    code: code,
    scopes: ["user.read", "mail.send", "Calendars.ReadWrite"],
    redirectUri: process.env.REDIRECT_URI || "http://localhost:3000/api/auth/redirect",
  };

  return cca.acquireTokenByCode(tokenRequest);
};

module.exports = { getAuthCodeUrl, acquireTokenByCode };
