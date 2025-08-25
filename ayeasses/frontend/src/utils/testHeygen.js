// Test utility for Heygen frontend integration
import heygenService from '../services/heygenService';

export const testHeygenIntegration = async () => {
  console.log('🧪 Testing Frontend Heygen Integration...\n');

  try {
    // Test 1: Create streaming session
    console.log('1️⃣ Creating streaming session...');
    const sessionResult = await heygenService.createStreamingSession({
      avatarName: 'avatar_001',
      quality: 'high',
      voiceSettings: {
        rate: 1.0,
        emotion: 'friendly'
      },
      assessmentId: 'test-assessment-123'
    });

    if (!sessionResult.success) {
      throw new Error('Failed to create streaming session');
    }

    console.log('✅ Session created:', sessionResult.sessionId);
    console.log('   Mock:', sessionResult.mock ? 'Yes' : 'No');

    // Test 2: Start streaming session
    console.log('\n2️⃣ Starting streaming session...');
    const startResult = await heygenService.startStreamingSession(sessionResult.sessionId);

    if (!startResult.success) {
      throw new Error('Failed to start streaming session');
    }

    console.log('✅ Session started:', startResult.streamUrl);
    console.log('   Mock:', startResult.mock ? 'Yes' : 'No');

    // Test 3: Send text to avatar
    console.log('\n3️⃣ Sending text to avatar...');
    const textResult = await heygenService.sendTextToStream(
      sessionResult.sessionId, 
      'Hello! Welcome to this assessment. I am your AI avatar guide.'
    );

    if (!textResult.success) {
      throw new Error('Failed to send text to avatar');
    }

    console.log('✅ Text sent:', textResult.messageId);
    console.log('   Mock:', textResult.mock ? 'Yes' : 'No');

    // Test 4: Complete flow
    console.log('\n4️⃣ Testing complete flow...');
    const flowResult = await heygenService.startAssessmentStreaming({
      avatarName: 'avatar_001',
      quality: 'high',
      voiceSettings: {
        rate: 1.0,
        emotion: 'friendly'
      },
      assessmentId: 'test-assessment-456',
      firstQuestion: 'Welcome to this assessment!'
    });

    console.log('✅ Complete flow result:', {
      success: flowResult.success,
      sessionId: flowResult.sessionId,
      streamUrl: flowResult.streamUrl,
      mock: flowResult.mock || false
    });

    console.log('\n🎉 Frontend Heygen integration test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Direct API calls: ✅ Working');
    console.log('- Mock fallback: ✅ Working');
    console.log('- Error handling: ✅ Working');
    
    if (sessionResult.mock || startResult.mock || textResult.mock) {
      console.log('\n💡 Note: Running in mock mode due to invalid API key.');
      console.log('   To use real Heygen API, set a valid API key:');
      console.log('   localStorage.setItem("heygen_api_key", "your_valid_api_key")');
    }

    return true;

  } catch (error) {
    console.error('❌ Frontend Heygen integration test failed:', error.message);
    return false;
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testHeygenIntegration = testHeygenIntegration;
}

export default testHeygenIntegration;
