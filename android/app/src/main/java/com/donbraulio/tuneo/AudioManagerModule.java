package com.donbraulio.tuneo;

import android.content.Context;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioManager;
import android.media.AudioDeviceInfo;
import android.os.Build;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothProfile;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class AudioManagerModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "AudioManager";
    private AudioManager audioManager;
    private HeadphoneReceiver headphoneReceiver;
    private BluetoothReceiver bluetoothReceiver;

    public AudioManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.audioManager = (AudioManager) reactContext.getSystemService(Context.AUDIO_SERVICE);
        this.headphoneReceiver = new HeadphoneReceiver();
        this.bluetoothReceiver = new BluetoothReceiver();
        registerReceivers();
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    private void registerReceivers() {
        // Register wired headphone receiver
        IntentFilter wiredFilter = new IntentFilter();
        wiredFilter.addAction(Intent.ACTION_HEADSET_PLUG);
        getReactApplicationContext().registerReceiver(headphoneReceiver, wiredFilter);

        // Register bluetooth receiver
        IntentFilter bluetoothFilter = new IntentFilter();
        bluetoothFilter.addAction(BluetoothAdapter.ACTION_CONNECTION_STATE_CHANGED);
        bluetoothFilter.addAction("android.bluetooth.a2dp.profile.action.CONNECTION_STATE_CHANGED");
        bluetoothFilter.addAction("android.bluetooth.headset.profile.action.CONNECTION_STATE_CHANGED");
        getReactApplicationContext().registerReceiver(bluetoothReceiver, bluetoothFilter);
    }

    @ReactMethod
    public void getAudioDevices(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            WritableArray devices = Arguments.createArray();
            
            boolean hasHeadphones = false;
            String deviceType = "unknown";

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
                
                for (AudioDeviceInfo deviceInfo : audioDevices) {
                    WritableMap device = Arguments.createMap();
                    
                    int type = deviceInfo.getType();
                    String typeName = getDeviceTypeName(type);
                    device.putString("type", typeName);
                    device.putString("name", deviceInfo.getProductName().toString());
                    device.putInt("id", deviceInfo.getId());
                    
                    devices.pushMap(device);
                    
                    // Check if it's a headphone device
                    if (isHeadphoneDevice(type)) {
                        hasHeadphones = true;
                        if (deviceType.equals("unknown")) {
                            deviceType = isBluetoothDevice(type) ? "bluetooth" : "wired";
                        }
                    }
                }
            } else {
                // Fallback for older Android versions
                hasHeadphones = audioManager.isWiredHeadsetOn() || audioManager.isBluetoothA2dpOn();
                if (hasHeadphones) {
                    deviceType = audioManager.isBluetoothA2dpOn() ? "bluetooth" : "wired";
                }
            }

            result.putArray("devices", devices);
            result.putBoolean("hasHeadphones", hasHeadphones);
            result.putString("deviceType", deviceType);
            
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("AUDIO_DEVICE_ERROR", e.getMessage(), e);
        }
    }

    private String getDeviceTypeName(int type) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            switch (type) {
                case AudioDeviceInfo.TYPE_WIRED_HEADPHONES:
                    return "WIRED_HEADPHONES";
                case AudioDeviceInfo.TYPE_WIRED_HEADSET:
                    return "WIRED_HEADSET";
                case AudioDeviceInfo.TYPE_BLUETOOTH_A2DP:
                    return "BLUETOOTH_A2DP";
                case AudioDeviceInfo.TYPE_BLUETOOTH_SCO:
                    return "BLUETOOTH_SCO";
                case AudioDeviceInfo.TYPE_BUILTIN_SPEAKER:
                    return "BUILTIN_SPEAKER";
                case AudioDeviceInfo.TYPE_BUILTIN_EARPIECE:
                    return "BUILTIN_EARPIECE";
                default:
                    return "UNKNOWN_" + type;
            }
        }
        return "UNKNOWN";
    }

    private boolean isHeadphoneDevice(int type) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
                   type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                   type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                   type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO;
        }
        return false;
    }

    private boolean isBluetoothDevice(int type) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                   type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO;
        }
        return false;
    }

    private void sendAudioDeviceChangedEvent() {
        getReactApplicationContext()
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("audioDeviceChanged", createCurrentDeviceStatus());
    }

    private WritableMap createCurrentDeviceStatus() {
        WritableMap status = Arguments.createMap();
        
        try {
            boolean hasHeadphones = false;
            String deviceType = "unknown";

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
                
                for (AudioDeviceInfo deviceInfo : audioDevices) {
                    int type = deviceInfo.getType();
                    if (isHeadphoneDevice(type)) {
                        hasHeadphones = true;
                        if (deviceType.equals("unknown")) {
                            deviceType = isBluetoothDevice(type) ? "bluetooth" : "wired";
                        }
                        break;
                    }
                }
            } else {
                // Fallback for older Android versions
                hasHeadphones = audioManager.isWiredHeadsetOn() || audioManager.isBluetoothA2dpOn();
                if (hasHeadphones) {
                    deviceType = audioManager.isBluetoothA2dpOn() ? "bluetooth" : "wired";
                }
            }

            status.putBoolean("isConnected", hasHeadphones);
            status.putString("deviceType", deviceType);
            
        } catch (Exception e) {
            status.putBoolean("isConnected", false);
            status.putString("deviceType", "unknown");
            status.putString("error", e.getMessage());
        }
        
        return status;
    }

    // Broadcast receiver for wired headphones
    private class HeadphoneReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (Intent.ACTION_HEADSET_PLUG.equals(intent.getAction())) {
                int state = intent.getIntExtra("state", -1);
                // state: 0 = unplugged, 1 = plugged
                sendAudioDeviceChangedEvent();
            }
        }
    }

    // Broadcast receiver for Bluetooth devices
    private class BluetoothReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            
            if (BluetoothAdapter.ACTION_CONNECTION_STATE_CHANGED.equals(action) ||
                "android.bluetooth.a2dp.profile.action.CONNECTION_STATE_CHANGED".equals(action) ||
                "android.bluetooth.headset.profile.action.CONNECTION_STATE_CHANGED".equals(action)) {
                
                int state = intent.getIntExtra(BluetoothProfile.EXTRA_STATE, BluetoothProfile.STATE_DISCONNECTED);
                // Send event when Bluetooth device connection changes
                sendAudioDeviceChangedEvent();
            }
        }
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        try {
            getReactApplicationContext().unregisterReceiver(headphoneReceiver);
            getReactApplicationContext().unregisterReceiver(bluetoothReceiver);
        } catch (Exception e) {
            // Receivers might already be unregistered
        }
    }
}