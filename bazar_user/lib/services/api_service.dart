import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ServerNotReachableException implements Exception {
  final String message;

  ServerNotReachableException([this.message = 'Server is not reachable']);

  @override
  String toString() => message;
}

class ApiService {
  static const String _baseUrl = 'http://192.168.1.2:5001';
  static const String _cacheKey = 'cached_web_url';

  static String get baseUrl => _baseUrl;

  static Future<String> getWebContainerUrl() async {
    final prefs = await SharedPreferences.getInstance();

    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/api/web-container/url'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () => throw ServerNotReachableException('Server is not reachable'),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final url = data['url'] ?? '';
        if (url.isNotEmpty) {
          await prefs.setString(_cacheKey, url);
        }
        return url;
      } else if (response.statusCode == 404 || response.statusCode == 500) {
        throw ServerNotReachableException('Server is not reachable');
      }
      return prefs.getString(_cacheKey) ?? '';
    } catch (e) {
      final cached = prefs.getString(_cacheKey);
      if (cached == null || cached.isEmpty) {
        throw ServerNotReachableException('Server is not reachable');
      }
      return cached;
    }
  }
}
