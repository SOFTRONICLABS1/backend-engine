package com.musicapp.android

import com.facebook.react.bridge.*
import kotlin.math.sqrt

class NativeDSPModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var lastBufferChecksum = 0L
    private var staticBufferCount = 0

    override fun getName(): String {
        return "NativeDSPModule"
    }

    @ReactMethod
    fun pitch(
        input: ReadableArray,
        sampleRate: Double,
        minFreq: Double,
        maxFreq: Double,
        threshold: Double,
        promise: Promise
    ) {
        try {
            if (input.size() == 0) {
                promise.resolve(-1.0)
                return
            }

            val bufferSize = input.size()
            val sr = sampleRate.toFloat()
            val minF = minFreq.toFloat()
            val maxF = maxFreq.toFloat()
            val thresh = threshold.toFloat()

            // Convert ReadableArray to float array
            val buffer = FloatArray(bufferSize)
            var maxVal = 0f
            var minVal = 0f
            var nonZeroCount = 0
            for (i in 0 until bufferSize) {
                buffer[i] = input.getDouble(i).toFloat()
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

            // Compute YIN
            val maxLag = (sr / minF).toInt().coerceAtMost(bufferSize / 2)
            val minLag = (sr / maxF).toInt()

            // Debug logging
            android.util.Log.d("DSP", "bufferSize: $bufferSize, sr: $sr, minF: $minF, maxF: $maxF")
            android.util.Log.d("DSP", "maxLag: $maxLag, minLag: $minLag")

            if (maxLag <= minLag) {
                android.util.Log.d("DSP", "maxLag <= minLag, returning -1")
                promise.resolve(-1.0)
                return
            }

            val yinBuffer = FloatArray(maxLag)

            // Compute difference function
            for (lag in 1 until maxLag) {
                var sum = 0f
                for (i in 0 until bufferSize - lag) {
                    val diff = buffer[i] - buffer[i + lag]
                    sum += diff * diff
                }
                yinBuffer[lag] = sum
            }

            // Cumulative mean normalized difference
            yinBuffer[0] = 1.0f
            var runningSum = 0.0f

            for (lag in 1 until maxLag) {
                runningSum += yinBuffer[lag]
                yinBuffer[lag] *= lag / runningSum
            }

            // Find the first minimum below threshold
            var period = -1

            for (lag in minLag until maxLag - 1) {
                if (yinBuffer[lag] < thresh) {
                    if (yinBuffer[lag] < yinBuffer[lag + 1]) {
                        period = lag
                        android.util.Log.d("DSP", "Found period: $period at lag $lag, yinBuffer[$lag] = ${yinBuffer[lag]}")
                        break
                    }
                }
            }

            if (period == -1) {
                android.util.Log.d("DSP", "No period found, threshold: $thresh")
            }

            var frequency = -1.0

            if (period > 0) {
                // Basic frequency calculation first
                val basicFreq = sr / period
                android.util.Log.d("DSP", "Basic frequency: $basicFreq Hz from period: $period")
                
                // Parabolic interpolation for better precision
                val x0 = period - 1
                val x2 = period + 1

                if (x0 >= 1 && x2 < maxLag) {
                    val y0 = yinBuffer[x0]
                    val y1 = yinBuffer[period]
                    val y2 = yinBuffer[x2]

                    val a = (y2 - y0) / 2.0f
                    val b = (y2 + y0) / 2.0f - y1

                    if (kotlin.math.abs(b) > 1e-6f) { // Avoid division by very small numbers
                        val xOffset = a / (2.0f * b)
                        val refinedPeriod = period + xOffset
                        frequency = (sr / refinedPeriod).toDouble()
                        android.util.Log.d("DSP", "Refined frequency: $frequency Hz from period: $refinedPeriod")
                    } else {
                        frequency = basicFreq.toDouble()
                        android.util.Log.d("DSP", "Using basic frequency due to small b: $b")
                    }
                } else {
                    frequency = basicFreq.toDouble()
                    android.util.Log.d("DSP", "Using basic frequency due to bounds")
                }
            }

            promise.resolve(frequency)

        } catch (e: Exception) {
            promise.reject("PITCH_ERROR", "Error calculating pitch: ${e.message}", e)
        }
    }

    @ReactMethod
    fun rms(input: ReadableArray, promise: Promise) {
        try {
            if (input.size() == 0) {
                promise.resolve(0.0)
                return
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
    }
}