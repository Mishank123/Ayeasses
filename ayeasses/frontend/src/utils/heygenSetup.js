// Heygen API Key Setup Utility
export const heygenSetup = {
  // Set API key in localStorage
  setApiKey: (apiKey) => {
    localStorage.setItem('heygen_api_key', apiKey);
    console.log('✅ Heygen API key set successfully');
    return true;
  },

  // Get current API key
  getApiKey: () => {
    return localStorage.getItem('heygen_api_key');
  },

  // Test API key format
  testApiKey: (apiKey) => {
    if (!apiKey) {
      console.error('❌ No API key provided');
      return false;
    }

    // Check if it's base64 encoded
    let decodedKey = apiKey;
    try {
      decodedKey = Buffer.from(apiKey, 'base64').toString('utf-8');
      console.log('🔍 Decoded from base64:', decodedKey.substring(0, 10) + '...');
    } catch (error) {
      console.log('🔍 Using as-is (not base64):', apiKey.substring(0, 10) + '...');
    }

    // Check Heygen format
    if (decodedKey.startsWith('hg_')) {
      console.log('✅ Valid Heygen API key format detected');
      return true;
    } else {
      console.error('❌ Invalid Heygen API key format. Should start with "hg_"');
      return false;
    }
  },

  // Clear API key
  clearApiKey: () => {
    localStorage.removeItem('heygen_api_key');
    console.log('🗑️ Heygen API key cleared');
  },

  // Get instructions
  getInstructions: () => {
    console.log(`
🎯 Heygen API Key Setup Instructions:

1. Go to https://app.heygen.com/
2. Sign in to your account
3. Go to Settings → API Keys
4. Create a new API key
5. Copy the key (should start with "hg_")
6. Run: heygenSetup.setApiKey("your_api_key_here")

Example:
heygenSetup.setApiKey("hg_live_abc123...")

To test your key:
heygenSetup.testApiKey("your_api_key_here")

To clear the key:
heygenSetup.clearApiKey()
    `);
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.heygenSetup = heygenSetup;
}

export default heygenSetup;
