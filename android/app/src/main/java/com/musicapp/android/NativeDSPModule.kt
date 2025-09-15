package com.musicapp.android

import com.facebook.react.bridge.*
import kotlin.math.sqrt

class NativeDSPModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var lastBufferChecksum = 0L
    private var staticBufferCount = 0

    override fun getName(): String {
        return "NativeDSPModule"
    }

    @ReactMethod(isBlockingSynchronousMethod = false)
    fun pitch(
        input: ReadableArray,
        sampleRate: Double,
        minFreq: Double,
        maxFreq: Double,
        threshold: Double,
        promise: Promise
    ) {
        // Run on background thread for better performance
        Thread {
            try {
                if (input.size() == 0) {
                    promise.resolve(-1.0)
                    return@Thread
                }

            val bufferSize = input.size()
            val sr = sampleRate.toFloat()
            val minF = minFreq.toFloat()
            val maxF = maxFreq.toFloat()
            val thresh = threshold.toFloat()

            // Convert ReadableArray to float array - optimized for Android
            val buffer = FloatArray(bufferSize)
            var maxVal = 0f
            var minVal = 0f
            var nonZeroCount = 0

            // Batch read for better performance
            val tempArray = ArrayList<Double>(bufferSize)
            for (i in 0 until bufferSize) {
                tempArray.add(input.getDouble(i))
            }

            for (i in 0 until bufferSize) {
                buffer[i] = tempArray[i].toFloat()
                if (buffer[i] != 0f) nonZeroCount++
                if (buffer[i] > maxVal) maxVal = buffer[i]
                if (buffer[i] < minVal) minVal = buffer[i]
            }
            
            // Debug: Check if we have real audio data
            val rmsValue = kotlin.math.sqrt(buffer.map { it * it }.average()).toFloat()
            
            // Check if buffer is changing (real microphone) or static (fallback)
            val checksum = buffer.fold(0L) { acc, value -> acc + (value * 10000).toLong() }
            if (checksum == lastBufferChecksum) {
                staticBufferCount++
                if (staticBufferCount > 5) {
                    android.util.Log.w("DSP", "STATIC BUFFER DETECTED - Using fallback audio data!")
                }
            } else {
                staticBufferCount = 0
            }
            lastBufferChecksum = checksum
            
            android.util.Log.d("DSP", "Audio data - nonZero: $nonZeroCount/$bufferSize, min: $minVal, max: $maxVal, RMS: $rmsValue, static: $staticBufferCount")

            // Compute YIN with improved frequency accuracy
            val maxLag = (sr / minF).toInt().coerceAtMost(bufferSize / 3) // Reduce for better accuracy
            val minLag = (sr / maxF).toInt().coerceAtLeast(2) // Ensure minimum lag

            // Debug logging
            android.util.Log.d("DSP", "bufferSize: $bufferSize, sr: $sr, minF: $minF, maxF: $maxF")
            android.util.Log.d("DSP", "maxLag: $maxLag, minLag: $minLag")

            if (maxLag <= minLag) {
                android.util.Log.d("DSP", "maxLag <= minLag, returning -1")
                promise.resolve(-1.0)
                return@Thread
            }

            val yinBuffer = FloatArray(maxLag)

            // Compute difference function - improved accuracy for Android
            // Use smaller step for better frequency precision
            val step = if (bufferSize > 8192) 2 else 1
            for (lag in 1 until maxLag) {
                var sum = 0f
                var count = 0
                var i = 0
                while (i < bufferSize - lag) {
                    val diff = buffer[i] - buffer[i + lag]
                    sum += diff * diff
                    count++
                    i += step
                }
                // Normalize properly to maintain frequency accuracy
                yinBuffer[lag] = if (count > 0) sum / count else Float.MAX_VALUE
            }

            // Cumulative mean normalized difference
            yinBuffer[0] = 1.0f
            var runningSum = 0.0f

            for (lag in 1 until maxLag) {
                runningSum += yinBuffer[lag]
                yinBuffer[lag] *= lag / runningSum
            }

            // Find the first minimum below threshold with improved accuracy
            var period = -1
            var minValue = Float.MAX_VALUE
            var bestLag = -1

            // First pass: find absolute minimum in valid range
            for (lag in minLag until maxLag - 1) {
                if (yinBuffer[lag] < minValue) {
                    minValue = yinBuffer[lag]
                    bestLag = lag
                }
            }

            // Second pass: find first good minimum that meets threshold
            for (lag in minLag until maxLag - 1) {
                if (yinBuffer[lag] < thresh) {
                    if (lag < maxLag - 1 && yinBuffer[lag] <= yinBuffer[lag + 1]) {
                        period = lag
                        android.util.Log.d("DSP", "Found period: $period at lag $lag, yinBuffer[$lag] = ${yinBuffer[lag]}")
                        break
                    }
                }
            }

            // Fallback to best minimum if no threshold crossing found
            if (period == -1 && bestLag > 0 && minValue < thresh * 2) {
                period = bestLag
                android.util.Log.d("DSP", "Using best minimum: $period with value $minValue")
            }

            if (period == -1) {
                android.util.Log.d("DSP", "No period found, threshold: $thresh, minValue: $minValue")
            }

            var frequency = -1.0

            if (period > 0) {
                // Basic frequency calculation first
                val basicFreq = sr / period
                android.util.Log.d("DSP", "Basic frequency: $basicFreq Hz from period: $period")
                
                // Enhanced parabolic interpolation for better frequency accuracy
                val x0 = period - 1
                val x2 = period + 1

                if (x0 >= 1 && x2 < maxLag) {
                    val y0 = yinBuffer[x0]
                    val y1 = yinBuffer[period]
                    val y2 = yinBuffer[x2]

                    // Improved parabolic interpolation
                    val denom = 2.0f * (y2 + y0 - 2.0f * y1)

                    if (kotlin.math.abs(denom) > 1e-6f) {
                        val xOffset = (y0 - y2) / denom
                        val refinedPeriod = period + xOffset

                        // Bounds check for refined period
                        if (refinedPeriod > minLag && refinedPeriod < maxLag) {
                            frequency = (sr / refinedPeriod).toDouble()
                            android.util.Log.d("DSP", "Enhanced frequency: $frequency Hz from refined period: $refinedPeriod")
                        } else {
                            frequency = basicFreq.toDouble()
                            android.util.Log.d("DSP", "Refined period out of bounds, using basic: $basicFreq")
                        }
                    } else {
                        frequency = basicFreq.toDouble()
                        android.util.Log.d("DSP", "Parabolic interpolation failed, using basic: $basicFreq")
                    }
                } else {
                    frequency = basicFreq.toDouble()
                    android.util.Log.d("DSP", "Interpolation bounds invalid, using basic: $basicFreq")
                }
            }

            promise.resolve(frequency)

            } catch (e: Exception) {
                promise.reject("PITCH_ERROR", "Error calculating pitch: ${e.message}", e)
            }
        }.start()
    }

    @ReactMethod(isBlockingSynchronousMethod = false)
    fun rms(input: ReadableArray, promise: Promise) {
        // Run on background thread
        Thread {
            try {
                if (input.size() == 0) {
                    promise.resolve(0.0)
                    return@Thread
                }

            var sum = 0.0
            val count = input.size()

            for (i in 0 until count) {
                val value = input.getDouble(i)
                sum += value * value
            }

            val rmsValue = sqrt(sum / count)
            promise.resolve(rmsValue)

            } catch (e: Exception) {
                promise.reject("RMS_ERROR", "Error calculating RMS: ${e.message}", e)
            }
        }.start()
    }
}