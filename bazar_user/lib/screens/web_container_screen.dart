import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../services/api_service.dart';

class _ShimmerPlaceholder extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;

  const _ShimmerPlaceholder({
    required this.width,
    required this.height,
    this.borderRadius = 8,
  });

  @override
  State<_ShimmerPlaceholder> createState() => _ShimmerPlaceholderState();
}

class _ShimmerPlaceholderState extends State<_ShimmerPlaceholder>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final double value = _controller.value;
        final Alignment begin = Alignment(-2.0 + (value * 4.0), -1.0);
        final Alignment end = Alignment(-1.0 + (value * 4.0), 1.0);

        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: LinearGradient(
              begin: begin,
              end: end,
              colors: const [
                Color(0xFF1C2431),
                Color(0xFF283446),
                Color(0xFF1C2431),
              ],
            ),
          ),
        );
      },
    );
  }
}
class _Particle {
  double x, y, vx, vy, life;
  _Particle(this.x, this.y, this.vx, this.vy, this.life);
}

class _JumperGame extends StatefulWidget {
  const _JumperGame();

  @override
  State<_JumperGame> createState() => _JumperGameState();
}

class _JumperGameState extends State<_JumperGame> {
  static const double _groundY = 170;
  static const double _serverH = 22;
  static const double _serverW = 28;
  static const double _poleH = 44;
  static const double _poleW = 14;
  static const double _gravity = 1100;
  static const double _jumpVelocity = -390;
  static const double _baseSpeed = 180;

  double _playerTop = _groundY - _serverH;
  double _playerVy = 0;
  bool _isJumping = false;
  double _obstacleX = 500;
  double _speed = _baseSpeed;
  int _score = 0;
  int _highScore = 0;
  bool _gameOver = false;
  bool _started = false;
  late Timer _timer;
  final List<_Particle> _particles = [];
  double _breakTimer = 0;

  double get _playerBottom => _playerTop + _serverH;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 16), (_) => _update());
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  void _spawnBreakParticles() {
    final cx = 40.0 + _serverW / 2;
    final cy = _playerTop + _serverH / 2;
    for (int i = 0; i < 10; i++) {
      final angle = math.Random().nextDouble() * math.pi * 2;
      final power = 60 + math.Random().nextDouble() * 180;
      _particles.add(_Particle(
        cx,
        cy,
        math.cos(angle) * power,
        math.sin(angle) * power - 80,
        0.6 + math.Random().nextDouble() * 0.5,
      ));
    }
  }

  void _update() {
    if (!_started) {
      setState(() {});
      return;
    }

    final dt = 0.016;

    if (!_gameOver) {
      _speed = _baseSpeed + (_score * 2).clamp(0, 150);

      _playerVy += _gravity * dt;
      _playerTop += _playerVy * dt;
      if (_playerTop >= _groundY - _serverH) {
        _playerTop = _groundY - _serverH;
        _playerVy = 0;
        _isJumping = false;
      }

      _obstacleX -= _speed * dt;
      if (_obstacleX < -_poleW) {
        _obstacleX = 300 + math.Random().nextDouble() * 200;
      }

      _score++;
      if (_score > _highScore) _highScore = _score;

      final playerL = 40.0;
      final playerR = 40.0 + _serverW;
      final playerT = _playerTop;
      final playerB = _playerBottom;
      final obsL = _obstacleX;
      final obsR = _obstacleX + _poleW;
      final obsT = _groundY - _poleH;
      final obsB = _groundY;

      if (playerR > obsL &&
          playerL < obsR &&
          playerB > obsT &&
          playerT < obsB) {
        _gameOver = true;
        _spawnBreakParticles();
      }
    }

    for (int i = _particles.length - 1; i >= 0; i--) {
      final p = _particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt;
      p.life -= dt;
      if (p.life <= 0) _particles.removeAt(i);
    }

    if (_gameOver) _breakTimer += dt;

    setState(() {});
  }

  void _jump() {
    if (_gameOver) {
      setState(() {
        _gameOver = false;
        _playerTop = _groundY - _serverH;
        _playerVy = 0;
        _isJumping = false;
        _obstacleX = 300 + math.Random().nextDouble() * 200;
        _score = 0;
        _speed = _baseSpeed;
        _started = true;
        _particles.clear();
        _breakTimer = 0;
      });
      return;
    }
    if (!_started) {
      setState(() {
        _started = true;
        _obstacleX = 300 + math.Random().nextDouble() * 200;
      });
    }
    if (!_isJumping) {
      _playerVy = _jumpVelocity;
      _isJumping = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _jump,
      child: SizedBox(
        height: 200,
        child: Stack(
          children: [
            Container(
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.1),
                ),
              ),
            ),
            Positioned(
              top: 8, left: 12,
              child: Text(
                'Score: $_score',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.6),
                  fontSize: 12, fontWeight: FontWeight.w600,
                ),
              ),
            ),
            Positioned(
              top: 8, right: 12,
              child: Text(
                'Best: $_highScore',
                style: TextStyle(
                  color: Colors.orange.withValues(alpha: 0.7),
                  fontSize: 12, fontWeight: FontWeight.w600,
                ),
              ),
            ),
            if (!_gameOver) ...[
              Positioned(left: 40, top: _playerTop, child: _buildServer()),
              Positioned(left: _obstacleX, top: _groundY - _poleH, child: _buildPole()),
            ],
            if (_gameOver)
              ..._particles.map((p) => Positioned(
                    left: p.x, top: p.y,
                    child: Container(
                      width: 5, height: 5,
                      decoration: BoxDecoration(
                        color: Colors.orange.withValues(alpha: p.life),
                        borderRadius: BorderRadius.circular(1),
                      ),
                    ),
                  )),
            Positioned(
              left: 0, right: 0, top: _groundY,
              child: Container(height: 1, color: Colors.white.withValues(alpha: 0.15)),
            ),
            if (!_started)
              Positioned(
                left: 0, right: 0, top: 0, bottom: 0,
                child: Center(
                  child: Text(
                    'Tap to Jump',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.4), fontSize: 14,
                    ),
                  ),
                ),
              ),
            if (_gameOver && _breakTimer > 0.3)
              Positioned(
                left: 0, right: 0, top: 0, bottom: 0,
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'SERVER DOWN',
                        style: TextStyle(
                          color: Colors.red.withValues(alpha: 0.8),
                          fontSize: 14, fontWeight: FontWeight.w800,
                          letterSpacing: 2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Score: $_score',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.6), fontSize: 11,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'tap',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.3), fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildServer() {
    return Container(
      width: _serverW,
      height: _serverH,
      decoration: BoxDecoration(
        color: const Color(0xFF2a2a2a),
        borderRadius: BorderRadius.circular(3),
        border: Border.all(color: Colors.orange.withValues(alpha: 0.5)),
      ),
      padding: const EdgeInsets.all(2),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 4, height: 3,
                decoration: BoxDecoration(
                  color: Colors.greenAccent.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
              const SizedBox(width: 3),
              Container(
                width: 4, height: 3,
                decoration: BoxDecoration(
                  color: Colors.greenAccent.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
            ],
          ),
          const Spacer(),
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 2,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 2,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 3, height: 2,
                decoration: BoxDecoration(
                  color: Colors.yellow.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPole() {
    return Column(
      children: [
        Container(
          width: _poleW, height: 6,
          decoration: BoxDecoration(
            color: Colors.red.withValues(alpha: 0.7),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(2)),
          ),
        ),
        Container(
          width: _poleW - 4, height: _poleH - 6,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.35),
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(1)),
          ),
        ),
      ],
    );
  }
}

class WebContainerScreen extends StatefulWidget {
  final WebViewController controller;
  final Future<String> urlFuture;
  final bool initialIsPageLoaded;
  final bool initialHasError;

  const WebContainerScreen({
    super.key,
    required this.controller,
    required this.urlFuture,
    required this.initialIsPageLoaded,
    required this.initialHasError,
  });

  @override
  State<WebContainerScreen> createState() => _WebContainerScreenState();
}

class _WebContainerScreenState extends State<WebContainerScreen> {
  late WebViewController _controller;
  bool _isLoading = true;
  bool _loadError = false;
  Timer? _retryTimer;
  OverlayEntry? _notificationOverlayEntry;
  Timer? _notificationDismissTimer;
  String? _fcmToken;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller;

    // Remove splash screen stub and register active callback for notifications
    _controller.removeJavaScriptChannel('AppNotifications').then((_) {
      _controller.addJavaScriptChannel('AppNotifications', onMessageReceived: _handleAppNotification);
    }).catchError((_) {});

    _isLoading = !widget.initialIsPageLoaded;
    _loadError = widget.initialHasError;

    // Request notification permission and print FCM token after entering the screen
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _requestFirebaseMessagingPermission();
    });

    // Attach navigation delegate to handle subsequent updates
    _controller.setNavigationDelegate(
      NavigationDelegate(
        onPageStarted: (_) {
          if (mounted) setState(() => _isLoading = true);
        },
        onPageFinished: (_) {
          if (mounted) setState(() => _isLoading = false);
          _hideScrollbar();
          _extractHeaderColor();
          if (_fcmToken != null) {
            _controller.runJavaScript("window.flutterFCMToken = '$_fcmToken';");
            _controller.runJavaScript("if (typeof window.onFlutterFCMTokenReceived === 'function') { window.onFlutterFCMTokenReceived('$_fcmToken'); }");
          }
        },
        onWebResourceError: (error) {
          if (mounted) {
            setState(() {
              _isLoading = false;
              _loadError = true;
            });
          }
        },
      ),
    );

    if (_loadError) {
      _startRetryTimer();
    } else if (_isLoading) {
      // In case the URL fetch is still resolving
      widget.urlFuture.then((url) {
        if (mounted) {
          if (url.isEmpty) {
            setState(() {
              _isLoading = false;
              _loadError = true;
            });
            _startRetryTimer();
          }
        }
      }).catchError((_) {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _loadError = true;
          });
          _startRetryTimer();
        }
      });

      // Guard against race conditions if page loads during screen transition
      _controller.runJavaScriptReturningResult("document.readyState").then((result) {
        if (result == '"complete"' || result == 'complete') {
          if (mounted) {
            setState(() {
              _isLoading = false;
            });
          }
        }
      }).catchError((_) {});
    } else {
      // Already preloaded, perform initial configurations immediately
      _hideScrollbar();
      _extractHeaderColor();
    }
  }

  @override
  void dispose() {
    _retryTimer?.cancel();
    _notificationDismissTimer?.cancel();
    _notificationOverlayEntry?.remove();
    super.dispose();
  }

  void _startRetryTimer() {
    _retryTimer?.cancel();
    _retryTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      _checkServer();
    });
  }

  Future<void> _checkServer() async {
    if (!mounted || !_loadError) return;
    try {
      final url = await ApiService.getWebContainerUrl();
      if (mounted && _loadError) {
        if (url.isNotEmpty) {
          _retryTimer?.cancel();
          setState(() {
            _loadError = false;
            _isLoading = true;
          });
          _controller.loadRequest(Uri.parse(url));
        }
      }
    } catch (_) {}
  }

  Future<void> _extractHeaderColor() async {
    await _controller.runJavaScript('''
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
  }

  Future<void> _hideScrollbar() async {
    await _controller.runJavaScript('''
      var style = document.createElement('style');
      style.innerHTML = '::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }';
      document.head.appendChild(style);
    ''');
  }

  Future<void> _fetchUrl() async {
    setState(() {
      _isLoading = true;
      _loadError = false;
    });
    try {
      final url = await ApiService.getWebContainerUrl();
      if (mounted) {
        if (url.isEmpty) {
          setState(() {
            _isLoading = false;
            _loadError = true;
          });
          _startRetryTimer();
        } else {
          _controller.loadRequest(Uri.parse(url));
        }
      }
    } on ServerNotReachableException {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _loadError = true;
        });
        _startRetryTimer();
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _loadError = true;
        });
        _startRetryTimer();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    Widget child;
    if (_loadError) {
      child = _buildErrorScreen(key: const ValueKey('error'));
    } else if (_isLoading) {
      child = _buildSkeletonScreen(key: const ValueKey('skeleton'));
    } else {
      child = SafeArea(
        key: const ValueKey('webview'),
        child: WebViewWidget(controller: _controller),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF131921),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        switchInCurve: Curves.easeInOut,
        switchOutCurve: Curves.easeInOut,
        child: child,
      ),
    );
  }

  Widget _buildSkeletonScreen({required Key key}) {
    return SafeArea(
      key: key,
      child: Column(
        children: [
          // Header skeleton
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const _ShimmerPlaceholder(width: 32, height: 32, borderRadius: 16),
                Row(
                  children: const [
                    _ShimmerPlaceholder(width: 80, height: 16, borderRadius: 4),
                    SizedBox(width: 8),
                    _ShimmerPlaceholder(width: 30, height: 16, borderRadius: 4),
                  ],
                ),
                const _ShimmerPlaceholder(width: 32, height: 32, borderRadius: 16),
              ],
            ),
          ),
          const Divider(color: Color(0xFF1E2633), height: 1),
          Expanded(
            child: SingleChildScrollView(
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Search bar skeleton
                  const _ShimmerPlaceholder(
                    width: double.infinity,
                    height: 48,
                    borderRadius: 24,
                  ),
                  const SizedBox(height: 20),
                  // Banner skeleton
                  const _ShimmerPlaceholder(
                    width: double.infinity,
                    height: 160,
                    borderRadius: 12,
                  ),
                  const SizedBox(height: 24),
                  // Category row skeleton
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: List.generate(4, (index) => Column(
                      children: const [
                        _ShimmerPlaceholder(width: 56, height: 56, borderRadius: 28),
                        SizedBox(height: 8),
                        _ShimmerPlaceholder(width: 48, height: 12, borderRadius: 4),
                      ],
                    )),
                  ),
                  const SizedBox(height: 28),
                  // Section Title
                  const _ShimmerPlaceholder(width: 120, height: 18, borderRadius: 4),
                  const SizedBox(height: 16),
                  // Grid of items
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            _ShimmerPlaceholder(
                              width: double.infinity,
                              height: 140,
                              borderRadius: 8,
                            ),
                            SizedBox(height: 8),
                            _ShimmerPlaceholder(width: 100, height: 14, borderRadius: 4),
                            SizedBox(height: 6),
                            _ShimmerPlaceholder(width: 60, height: 12, borderRadius: 4),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            _ShimmerPlaceholder(
                              width: double.infinity,
                              height: 140,
                              borderRadius: 8,
                            ),
                            SizedBox(height: 8),
                            _ShimmerPlaceholder(width: 110, height: 14, borderRadius: 4),
                            SizedBox(height: 6),
                            _ShimmerPlaceholder(width: 50, height: 12, borderRadius: 4),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorScreen({required Key key}) {
    return SafeArea(
      key: key,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
        child: Column(
          children: [
            const SizedBox(height: 20),
            Icon(
              Icons.error_outline,
              size: 56,
              color: Colors.red.withValues(alpha: 0.8),
            ),
            const SizedBox(height: 16),
            const Text(
              'Server under maintenance',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Please try again later',
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Play while you wait',
              style: TextStyle(
                fontSize: 12,
                color: Colors.white.withValues(alpha: 0.35),
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 10),
            const _JumperGame(),
            const SizedBox(height: 24),
            SizedBox(
              width: 180,
              child: TextButton.icon(
                onPressed: () {
                  setState(() => _loadError = false);
                  _fetchUrl();
                },
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Try Again'),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white,
                  backgroundColor: Colors.red.withValues(alpha: 0.2),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Auto-retrying every 12s',
              style: TextStyle(
                fontSize: 11,
                color: Colors.white.withValues(alpha: 0.25),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleAppNotification(JavaScriptMessage message) {
    try {
      final data = jsonDecode(message.message);
      final type = data['type'];
      
      if (type == 'permission_granted') {
        _requestFirebaseMessagingPermission();
        _requestNativeNotificationPermission();
        return;
      }
      
      final title = data['title'] ?? 'Notification';
      final body = data['message'] ?? '';
      final thumbnail = data['thumbnail'];
      
      _showOverlayNotification(title: title, body: body, thumbnailUrl: thumbnail);
    } catch (e) {
      debugPrint("Error parsing app notification: $e");
    }
  }

  Future<void> _requestFirebaseMessagingPermission() async {
    try {
      NotificationSettings settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );
      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        String? token = await FirebaseMessaging.instance.getToken();
        debugPrint("======================================");
        debugPrint("FCM TOKEN:");
        debugPrint(token);
        debugPrint("======================================");
        if (mounted) {
          setState(() {
            _fcmToken = token;
          });
          if (_fcmToken != null) {
            _controller.runJavaScript("window.flutterFCMToken = '$_fcmToken';");
            _controller.runJavaScript("if (typeof window.onFlutterFCMTokenReceived === 'function') { window.onFlutterFCMTokenReceived('$_fcmToken'); }");
          }
        }
      }
    } catch (e) {
      debugPrint("Failed to request Firebase Messaging permission: $e");
    }
  }

  void _requestNativeNotificationPermission() async {
    const platform = MethodChannel('com.example.bazar_user/notifications');
    try {
      await platform.invokeMethod('requestNotificationPermission');
    } on PlatformException catch (e) {
      debugPrint("Failed to request native notification permission: ${e.message}");
    }
  }

  void _showOverlayNotification({required String title, required String body, String? thumbnailUrl}) {
    _notificationDismissTimer?.cancel();
    if (_notificationOverlayEntry != null) {
      try {
        _notificationOverlayEntry!.remove();
      } catch (_) {}
      _notificationOverlayEntry = null;
    }

    final overlayState = Overlay.of(context);
    
    _notificationOverlayEntry = OverlayEntry(
      builder: (context) => _NotificationBanner(
        title: title,
        body: body,
        thumbnailUrl: thumbnailUrl,
        onDismiss: () {
          if (_notificationOverlayEntry != null) {
            try {
              _notificationOverlayEntry!.remove();
            } catch (_) {}
            _notificationOverlayEntry = null;
          }
        },
      ),
    );

    overlayState.insert(_notificationOverlayEntry!);

    _notificationDismissTimer = Timer(const Duration(seconds: 6), () {
      if (_notificationOverlayEntry != null) {
        try {
          _notificationOverlayEntry!.remove();
        } catch (_) {}
        _notificationOverlayEntry = null;
      }
    });
  }
}

class _NotificationBanner extends StatefulWidget {
  final String title;
  final String body;
  final String? thumbnailUrl;
  final VoidCallback onDismiss;

  const _NotificationBanner({
    required this.title,
    required this.body,
    this.thumbnailUrl,
    required this.onDismiss,
  });

  @override
  State<_NotificationBanner> createState() => _NotificationBannerState();
}

class _NotificationBannerState extends State<_NotificationBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<Offset> _offsetAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _offsetAnimation = Tween<Offset>(
      begin: const Offset(0, -1.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutQuint,
    ));

    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _dismiss() {
    _animController.reverse().then((_) {
      widget.onDismiss();
    });
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final topPadding = mediaQuery.padding.top + 10;
    
    return Positioned(
      top: topPadding,
      left: 12,
      right: 12,
      child: SlideTransition(
        position: _offsetAnimation,
        child: Material(
          color: Colors.transparent,
          child: GestureDetector(
            onTap: _dismiss,
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF1E2633),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF2B384E), width: 1),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.4),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Icon or Product Thumbnail
                  if (widget.thumbnailUrl != null && widget.thumbnailUrl!.isNotEmpty)
                    Container(
                      width: 48,
                      height: 48,
                      margin: const EdgeInsets.only(right: 12),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        image: DecorationImage(
                          image: NetworkImage(widget.thumbnailUrl!),
                          fit: BoxFit.cover,
                          onError: (err, stack) {
                            // Handled internally
                          },
                        ),
                      ),
                    )
                  else
                    Container(
                      width: 48,
                      height: 48,
                      margin: const EdgeInsets.only(right: 12),
                      decoration: BoxDecoration(
                        color: Colors.orange.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.notifications_active_rounded,
                        color: Colors.orange,
                        size: 26,
                      ),
                    ),
                  
                  // Message Body
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          widget.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 3),
                        Text(
                          widget.body,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.75),
                            fontSize: 12,
                            height: 1.3,
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  
                  // Close Button
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white60, size: 18),
                    onPressed: _dismiss,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    splashRadius: 18,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
