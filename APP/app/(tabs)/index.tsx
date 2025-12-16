import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const WEBVIEW_URL = 'http://apps.bbhegdecollege.com:5000';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);

  // Auto-load the webview when component mounts
  useEffect(() => {
    setLoading(true);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <WebView
        source={{ uri: WEBVIEW_URL }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
          setLoading(false);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView HTTP error: ', nativeEvent);
        }}
        // Enable JavaScript
        javaScriptEnabled={true}
        // Enable DOM storage
        domStorageEnabled={true}
        // Allow mixed content (HTTP and HTTPS)
        mixedContentMode="always"
        // Enable third-party cookies
        thirdPartyCookiesEnabled={true}
        // Allow file access
        allowFileAccess={true}
        // Allow universal access from file URLs
        allowUniversalAccessFromFileURLs={true}
        // Start in hardware accelerated mode
        androidHardwareAccelerationDisabled={false}
        // Enable cache
        cacheEnabled={true}
        // Enable incognito mode (optional, set to false to enable cache)
        incognito={false}
        // User agent - optimized for mobile
        userAgent={
          Platform.OS === 'ios'
            ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
            : 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
        }
        // Allow all navigation
        allowsBackForwardNavigationGestures={true}
        // Enable media playback
        mediaPlaybackRequiresUserAction={false}
        // Allow inline media playback
        allowsInlineMediaPlayback={true}
        // Enable shared cookies
        sharedCookiesEnabled={true}
        // Origin whitelist for Android
        originWhitelist={['*']}
        // Start loading immediately
        startInLoadingState={true}
      />
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
});
