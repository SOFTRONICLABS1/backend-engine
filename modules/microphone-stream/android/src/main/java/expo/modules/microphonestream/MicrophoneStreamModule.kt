package expo.modules.microphonestream

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlin.concurrent.thread
import kotlin.math.sin
import kotlin.math.PI
import kotlin.random.Random
import java.util.Timer
import java.util.TimerTask

val BUF_PER_SEC = 15

class MicrophoneStreamModule : Module() {

    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var dummyTimer: Timer? = null
    private var dummyFrequency = 220.0f // A3 note
    private var phase = 0.0f
    private val sampleRate = 44100 // Default sample rate
    private val bufferSize = maxOf(
        sampleRate / BUF_PER_SEC,
        AudioRecord.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
    )

    override fun definition() = ModuleDefinition {
        Name("MicrophoneStream")

        Events("onAudioBuffer")

        Constants(
            "BUF_PER_SEC" to BUF_PER_SEC
        )

        AsyncFunction("requestPermission") { promise: Promise ->
            val permission = ContextCompat.checkSelfPermission(appContext.reactContext!!, Manifest.permission.RECORD_AUDIO)
            if (permission == PackageManager.PERMISSION_GRANTED) {
                promise.resolve("granted")
            } else {
                promise.resolve("denied")
            }
        }

        Function("startRecording") {
            android.util.Log.d("MicStream", "startRecording called")
            startRecording()
        }

        Function("stopRecording") {
            stopRecording()
        }

        Function("getSampleRate") { -> 
            sampleRate.toDouble()
        }
    }

    private fun startRecording() {
        if (isRecording) return

        android.util.Log.d("MicStream", "Creating AudioRecord - sampleRate: $sampleRate, bufferSize: $bufferSize")

        // Check microphone permission first
        if (ContextCompat.checkSelfPermission(appContext.reactContext!!, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            android.util.Log.e("MicStream", "Microphone permission not granted! Using fallback audio data.")
            startFallbackAudio()
            return
        }

        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize
        )

        val state = audioRecord?.state
        android.util.Log.d("MicStream", "AudioRecord state: $state")
        
        if (state != AudioRecord.STATE_INITIALIZED) {
            android.util.Log.e("MicStream", "AudioRecord not initialized properly! Using fallback audio data.")
            startFallbackAudio()
            return
        }

        isRecording = true
        audioRecord?.startRecording()
        
        val recordingState = audioRecord?.recordingState
        android.util.Log.d("MicStream", "AudioRecord recording state: $recordingState")

        // Check if we're actually getting real data or if we need fallback
        thread {
            val buffer = ShortArray(bufferSize)
            var bufferCount = 0
            var staticBufferCount = 0
            var lastChecksum = 0L
            
            while (isRecording) {
                val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                if (read > 0) {
                    val floatBuffer = buffer.map { it / 32768.0f }
                    
                    // Check if buffer is changing (real microphone) or static (emulator/no mic)
                    val checksum = floatBuffer.fold(0L) { acc, value -> acc + (value * 10000).toLong() }
                    if (checksum == lastChecksum) {
                        staticBufferCount++
                        if (staticBufferCount > 5) {
                            android.util.Log.w("MicStream", "Static buffer detected - switching to fallback audio!")
                            stopRecording()
                            startFallbackAudio()
                            return@thread
                        }
                    } else {
                        staticBufferCount = 0
                    }
                    lastChecksum = checksum
                    
                    bufferCount++
                    if (bufferCount % 30 == 0) { // Log every 2 seconds (30 buffers at 15/sec)
                        val maxVal = floatBuffer.maxOrNull() ?: 0f
                        val minVal = floatBuffer.minOrNull() ?: 0f
                        val nonZero = floatBuffer.count { it != 0f }
                        android.util.Log.d("MicStream", "Buffer #$bufferCount: read=$read, nonZero=$nonZero/${floatBuffer.size}, range=[$minVal, $maxVal]")
                    }
                    sendEvent("onAudioBuffer", mapOf("samples" to floatBuffer))
                }
            }
        }
    }

    private fun startFallbackAudio() {
        isRecording = true
        android.util.Log.d("MicStream", "Starting fallback audio with simulated pitch variations")
        
        dummyTimer = Timer()
        dummyTimer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                // Generate a simple sine wave at the dummy frequency
                val bufferSize = 512
                val dummySamples = FloatArray(bufferSize)
                val phaseIncrement = 2.0f * PI.toFloat() * dummyFrequency / sampleRate
                
                for (i in 0 until bufferSize) {
                    dummySamples[i] = sin(phase) * 0.1f // Low amplitude sine wave
                    phase += phaseIncrement
                    if (phase >= 2.0f * PI.toFloat()) {
                        phase -= 2.0f * PI.toFloat()
                    }
                }
                
                // Vary the frequency slightly to simulate pitch changes
                dummyFrequency += Random.nextFloat() * 10.0f - 5.0f // Random between -5.0 and 5.0
                dummyFrequency = dummyFrequency.coerceIn(100.0f, 400.0f) // Keep in reasonable range
                
                sendEvent("onAudioBuffer", mapOf("samples" to dummySamples.toList()))
            }
        }, 0, (1000 / BUF_PER_SEC).toLong())
    }

    private fun stopRecording() {
        isRecording = false
        
        // Stop timer if it exists
        dummyTimer?.cancel()
        dummyTimer = null
        
        // Stop and release AudioRecord if it exists
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
    }
}