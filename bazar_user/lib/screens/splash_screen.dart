import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../services/api_service.dart';
import 'web_container_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _bounceController;
  late WebViewController _webViewController;
  late Future<String> _urlFuture;
  bool _isPageLoaded = false;
  bool _hasError = false;
  bool _minTimerFinished = false;
  bool _maxTimerFinished = false;
  bool _navigationTriggered = false;

  @override
  void initState() {
    super.initState();

    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ));

    _bounceController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _bounceController.repeat();

    // Pre-initialize WebViewController
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel('HeaderColor', onMessageReceived: _onHeaderColor)
      ..addJavaScriptChannel('AppNotifications', onMessageReceived: _onAppNotification)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            _isPageLoaded = true;
            
            // Apply standard post-load styles
            _webViewController.runJavaScript('''
              var style = document.createElement('style');
              style.innerHTML = '::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }';
              document.head.appendChild(style);
            ''').catchError((_) {});
            
            _extractHeaderColor(_webViewController);
            _checkNavigation();
          },
          onWebResourceError: (error) {
            _hasError = true;
            _checkNavigation();
          },
        ),
      );

    // Start preloading url
    _urlFuture = ApiService.getWebContainerUrl();
    _urlFuture.then((url) {
      if (mounted) {
        if (url.isNotEmpty) {
          _webViewController.loadRequest(Uri.parse(url));
        } else {
          setState(() {
            _hasError = true;
          });
          _checkNavigation();
        }
      }
    }).catchError((_) {
      if (mounted) {
        setState(() {
          _hasError = true;
        });
        _checkNavigation();
      }
    });

    // Enforce minimum splash screen display duration of 2.5 seconds
    Future.delayed(const Duration(milliseconds: 2500), () {
      if (mounted) {
        setState(() {
          _minTimerFinished = true;
        });
        _checkNavigation();
      }
    });

    // Enforce maximum splash screen display duration of 5.0 seconds as a fallback
    Future.delayed(const Duration(milliseconds: 5000), () {
      if (mounted) {
        setState(() {
          _maxTimerFinished = true;
        });
        _checkNavigation();
      }
    });
  }

  void _checkNavigation() {
    if (_navigationTriggered || !mounted) return;

    // Navigate only if the minimum timer is finished AND the webpage has either loaded or errored,
    // OR if the maximum timeout is reached (which acts as a fallback).
    final shouldNavigate = (_minTimerFinished && (_isPageLoaded || _hasError)) || _maxTimerFinished;

    if (!shouldNavigate) return;

    _navigationTriggered = true;

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, _, _) => WebContainerScreen(
          controller: _webViewController,
          urlFuture: _urlFuture,
          initialIsPageLoaded: _isPageLoaded,
          initialHasError: _hasError,
        ),
        transitionDuration: Duration.zero,
      ),
    );
  }

  void _onHeaderColor(JavaScriptMessage message) {
    final colorStr = message.message.trim();
    if (colorStr.isNotEmpty && colorStr.startsWith('#')) {
      final color = Color(
        int.parse(colorStr.substring(1), radix: 16) | 0xFF000000,
      );
      final isLight = _isLightColor(color);
      SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle(
          statusBarColor: color,
          statusBarIconBrightness: isLight ? Brightness.dark : Brightness.light,
          systemNavigationBarColor: color,
          systemNavigationBarDividerColor: color,
          systemNavigationBarIconBrightness: isLight
              ? Brightness.dark
              : Brightness.light,
        ),
      );
    }
  }

  bool _isLightColor(Color color) {
    final luminance = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
    return luminance > 0.5;
  }

  Future<void> _extractHeaderColor(WebViewController controller) async {
    try {
      await controller.runJavaScript('''
        (function() {
          var el = document.querySelector('header') || document.querySelector('[class*="bg-"]');
          if (el) {
            var rgb = getComputedStyle(el).backgroundColor;
            var m = rgb.match(/\\d+/g);
            if (m && m.length >= 3) {
              var hex = '#' + ('0' + parseInt(m[0]).toString(16)).slice(-2) + ('0' + parseInt(m[1]).toString(16)).slice(-2) + ('0' + parseInt(m[2]).toString(16)).slice(-2);
              var style = document.createElement('style');
              style.innerHTML = 'html { background-color: ' + hex + ' !important; min-height: 100% !important; } body { background-color: ' + hex + ' !important; min-height: 100vh !important; }';
              document.head.appendChild(style);
              HeaderColor.postMessage(hex);
            }
          }
        })();
      ''');
    } catch (_) {}
  }

  @override
  void dispose() {
    _bounceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF131921),
      body: Stack(
        children: [
          // Pre-load WebView offstage so it gets attached to the native hierarchy immediately
          Offstage(
            offstage: true,
            child: WebViewWidget(controller: _webViewController),
          ),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'BBHCBazaar',
                  style: TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.w900,
                    color: Colors.white.withValues(alpha: 0.85),
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 40),
                _buildBouncingDots(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBouncingDots() {
    return AnimatedBuilder(
      animation: _bounceController,
      builder: (context, child) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(5, (i) {
            final delay = i * 0.15;
            final t = (_bounceController.value - delay).clamp(0.0, 1.0);
            final bounce = math.sin(t * math.pi * 2);
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 5),
              child: Transform.translate(
                offset: Offset(0, -(bounce * 14).abs()),
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.5),
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }

  void _onAppNotification(JavaScriptMessage message) {
    debugPrint("App notification received during splash: ${message.message}");
  }
}
