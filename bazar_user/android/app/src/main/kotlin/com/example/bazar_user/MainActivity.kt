package com.example.bazar_user

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.annotation.NonNull
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.example.bazar_user/notifications"
    private val NOTIFICATION_PERMISSION_CODE = 1001

    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        showNativeSplash()
    }

    private fun showNativeSplash() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.statusBarColor = android.graphics.Color.TRANSPARENT
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            window.decorView.systemUiVisibility = window.decorView.systemUiVisibility or
                    android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        }

        val splashContainer = android.widget.RelativeLayout(this)
        splashContainer.layoutParams = android.view.ViewGroup.LayoutParams(
            android.view.ViewGroup.LayoutParams.MATCH_PARENT,
            android.view.ViewGroup.LayoutParams.MATCH_PARENT
        )

        // Vertical sky-blue-to-white gradient background matching design system
        val colors = intArrayOf(0xFF79B4FC.toInt(), 0xFFFFFFFF.toInt())
        val gd = android.graphics.drawable.GradientDrawable(
            android.graphics.drawable.GradientDrawable.Orientation.TOP_BOTTOM,
            colors
        )
        splashContainer.background = gd

        var rotateAnimator: android.animation.ObjectAnimator? = null
        val electricityView = android.widget.ImageView(this)
        val elecSizeDp = (280 * resources.displayMetrics.density).toInt() // Reduced size for cleaner framing
        val elecParams = android.widget.RelativeLayout.LayoutParams(elecSizeDp, elecSizeDp)
        elecParams.addRule(android.widget.RelativeLayout.CENTER_IN_PARENT)
        electricityView.layoutParams = elecParams
        electricityView.scaleType = android.widget.ImageView.ScaleType.FIT_CENTER
        electricityView.alpha = 0.45f // Subtle background glow opacity
        electricityView.translationY = -(50 * resources.displayMetrics.density) // Center exactly behind phone illustration

        try {
            val loader = io.flutter.FlutterInjector.instance().flutterLoader()
            val key = loader.getLookupKeyForAsset("assets/electricity_clean.png")
            val inputStream = assets.open(key)
            val bitmap = android.graphics.BitmapFactory.decodeStream(inputStream)
            val drawable = android.graphics.drawable.BitmapDrawable(resources, bitmap)
            drawable.isFilterBitmap = true
            electricityView.setImageDrawable(drawable)
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        // Add to container first so it sits behind the vertical contentLayout
        splashContainer.addView(electricityView)

        rotateAnimator = android.animation.ObjectAnimator.ofFloat(
            electricityView,
            "rotation",
            0f,
            360f
        ).apply {
            duration = 12000 // Smooth, slow rotation (12s per full turn)
            repeatCount = android.animation.ValueAnimator.INFINITE
            interpolator = android.view.animation.LinearInterpolator()
            start()
        }

        val contentLayout = android.widget.LinearLayout(this)
        contentLayout.orientation = android.widget.LinearLayout.VERTICAL
        contentLayout.gravity = android.view.Gravity.CENTER_HORIZONTAL
        val relativeParams = android.widget.RelativeLayout.LayoutParams(
            android.widget.RelativeLayout.LayoutParams.WRAP_CONTENT,
            android.widget.RelativeLayout.LayoutParams.WRAP_CONTENT
        )
        relativeParams.addRule(android.widget.RelativeLayout.CENTER_IN_PARENT)
        contentLayout.layoutParams = relativeParams

        // Image logo loader (fetches transparent PNG dynamically from assets)
        val imageView = android.widget.ImageView(this)
        val sizeDp = (240 * resources.displayMetrics.density).toInt()
        val imageParams = android.widget.LinearLayout.LayoutParams(sizeDp, sizeDp)
        imageView.layoutParams = imageParams
        imageView.scaleType = android.widget.ImageView.ScaleType.FIT_CENTER

        try {
            val loader = io.flutter.FlutterInjector.instance().flutterLoader()
            val key = loader.getLookupKeyForAsset("assets/e-commerce-service_splash-ntive.png")
            val inputStream = assets.open(key)
            val bitmap = android.graphics.BitmapFactory.decodeStream(inputStream)
            // Enable high-quality bilinear filtering for scaled bitmap to avoid blurriness
            val drawable = android.graphics.drawable.BitmapDrawable(resources, bitmap)
            drawable.isFilterBitmap = true
            imageView.setImageDrawable(drawable)
        } catch (e: Exception) {
            e.printStackTrace()
        }
        contentLayout.addView(imageView)

        val space1 = android.view.View(this)
        space1.layoutParams = android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            (16 * resources.displayMetrics.density).toInt()
        )
        contentLayout.addView(space1)

        val textView = android.widget.TextView(this)
        textView.textSize = 34f
        textView.setTextColor(0xFF131921.toInt())
        textView.typeface = android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.BOLD)
        textView.gravity = android.view.Gravity.CENTER
        textView.alpha = 0.85f

        val fullText = "BBHCBazaar"
        val spannable = android.text.SpannableStringBuilder(fullText)
        val pinkColor = 0xFFFF4081.toInt() // Vibrant pink accent
        spannable.setSpan(
            android.text.style.ForegroundColorSpan(pinkColor),
            4,
            10,
            android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
        )
        textView.text = spannable
        contentLayout.addView(textView)
        splashContainer.addView(contentLayout)

        addContentView(
            splashContainer,
            android.view.ViewGroup.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT
            )
        )

        // Wait until the view has been drawn on the screen before starting the display timer
        splashContainer.viewTreeObserver.addOnPreDrawListener(object : android.view.ViewTreeObserver.OnPreDrawListener {
            override fun onPreDraw(): Boolean {
                splashContainer.viewTreeObserver.removeOnPreDrawListener(this)
                
                // Fade out and remove custom native splash screen after 4.0 seconds of actual visibility
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    splashContainer.animate()
                        .alpha(0f)
                        .setDuration(300)
                        .setListener(object : android.animation.AnimatorListenerAdapter() {
                            override fun onAnimationEnd(animation: android.animation.Animator) {
                                rotateAnimator?.cancel()
                                val parent = splashContainer.parent as? android.view.ViewGroup
                                parent?.removeView(splashContainer)
                            }
                        })
                }, 4000)
                
                return true
            }
        })
    }

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            if (call.method == "requestNotificationPermission") {
                val granted = requestNotificationPermission()
                result.success(granted)
            } else if (call.method == "openMap") {
                val url = call.argument<String>("url")
                if (url != null) {
                    try {
                        val intent = android.content.Intent(
                            android.content.Intent.ACTION_VIEW,
                            android.net.Uri.parse(url)
                        )
                        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("LAUNCH_FAILED", e.message, null)
                    }
                } else {
                    result.error("INVALID_URL", "URL was null", null)
                }
            } else {
                result.notImplemented()
            }
        }
    }

    private fun requestNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val hasPermission = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED

            if (!hasPermission) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    NOTIFICATION_PERMISSION_CODE
                )
                return false
            }
            return true
        }
        return true
    }
}
