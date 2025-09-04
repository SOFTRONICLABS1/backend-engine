#import "NativeDSPModule.h"
#import <Accelerate/Accelerate.h>
#import <React/RCTLog.h>

@implementation NativeDSPModule

RCT_EXPORT_MODULE(NativeDSPModule)

// YIN algorithm for pitch detection
RCT_EXPORT_METHOD(pitch:(NSArray<NSNumber *> *)input
                 sampleRate:(NSNumber *)sampleRate
                 minFreq:(NSNumber *)minFreq
                 maxFreq:(NSNumber *)maxFreq
                 threshold:(NSNumber *)threshold
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    
    if (!input || input.count == 0) {
        resolve(@(-1));
        return;
    }
    
    NSInteger bufferSize = input.count;
    float sr = [sampleRate floatValue];
    float minF = [minFreq floatValue];
    float maxF = [maxFreq floatValue];
    float thresh = [threshold floatValue];
    
    // Convert NSArray to float array
    float *buffer = (float *)malloc(bufferSize * sizeof(float));
    for (NSInteger i = 0; i < bufferSize; i++) {
        buffer[i] = [input[i] floatValue];
    }
    
    // Compute YIN
    NSInteger maxLag = (NSInteger)(sr / minF);
    NSInteger minLag = (NSInteger)(sr / maxF);
    
    if (maxLag > bufferSize / 2) {
        maxLag = bufferSize / 2;
    }
    
    float *yinBuffer = (float *)calloc(maxLag, sizeof(float));
    
    // Compute difference function
    for (NSInteger lag = 1; lag < maxLag; lag++) {
        float sum = 0;
        for (NSInteger i = 0; i < bufferSize - lag; i++) {
            float diff = buffer[i] - buffer[i + lag];
            sum += diff * diff;
        }
        yinBuffer[lag] = sum;
    }
    
    // Cumulative mean normalized difference
    yinBuffer[0] = 1.0;
    float runningSum = 0.0;
    
    for (NSInteger lag = 1; lag < maxLag; lag++) {
        runningSum += yinBuffer[lag];
        yinBuffer[lag] *= lag / runningSum;
    }
    
    // Find the first minimum below threshold
    NSInteger period = -1;
    
    for (NSInteger lag = minLag; lag < maxLag - 1; lag++) {
        if (yinBuffer[lag] < thresh) {
            if (yinBuffer[lag] < yinBuffer[lag + 1]) {
                period = lag;
                break;
            }
        }
    }
    
    float frequency = -1.0;
    
    if (period > 0) {
        // Parabolic interpolation for better precision
        NSInteger x0 = period - 1;
        NSInteger x2 = period + 1;
        
        if (x0 >= 1 && x2 < maxLag) {
            float y0 = yinBuffer[x0];
            float y1 = yinBuffer[period];
            float y2 = yinBuffer[x2];
            
            float a = (y2 - y0) / 2.0;
            float b = (y2 + y0) / 2.0 - y1;
            
            float xOffset = a / (2.0 * b);
            float refinedPeriod = period + xOffset;
            
            frequency = sr / refinedPeriod;
        } else {
            frequency = sr / period;
        }
    }
    
    free(buffer);
    free(yinBuffer);
    
    resolve(@(frequency));
}

// RMS (Root Mean Square) calculation
RCT_EXPORT_METHOD(rms:(NSArray<NSNumber *> *)input
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    if (!input || input.count == 0) {
        resolve(@(0));
        return;
    }
    
    double sum = 0.0;
    NSInteger count = input.count;
    
    for (NSNumber *value in input) {
        double v = [value doubleValue];
        sum += v * v;
    }
    
    double rmsValue = sqrt(sum / count);
    resolve(@(rmsValue));
}

@end