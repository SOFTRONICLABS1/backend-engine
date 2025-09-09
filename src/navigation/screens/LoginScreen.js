import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Pressable,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import React, {useEffect, useState, useContext} from 'react';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthContext} from '../../AuthContext';

GoogleSignin.configure({
  webClientId:
    '60455306259-c9erh3v8qcn6pvjcd45a4848siakqfrs.apps.googleusercontent.com',
  iosClientId:
    '60455306259-c9erh3v8qcn6pvjcd45a4848siakqfrs.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
});

const LoginScreen = () => {
  const {token, setToken} = useContext(AuthContext);
  const [googleResponse, setGoogleResponse] = useState(null);
  const [showInspector, setShowInspector] = useState(false);

  const GoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log('=== GOOGLE SIGN-IN RESPONSE ===');
      console.log('Full userInfo object:', JSON.stringify(userInfo, null, 2));
      console.log('ID Token:', userInfo.idToken);
      console.log('User data:', userInfo.user);
      console.log('Server auth code:', userInfo.serverAuthCode);
      console.log('================================');
      return userInfo;
    } catch (error) {
      if (error.code === 'SIGN_IN_CANCELLED') {
        console.log('User cancelled Google sign-in');
        throw error; // Re-throw to be handled by caller
      }
      throw error;
    }
  };

  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const response = await GoogleLogin(); // Google sign-in
      setGoogleResponse(response); // Store the response to display in UI
      
      const {idToken} = response; // Check if idToken is directly available

      console.log('idToken:', idToken); // Log idToken to check if it's retrieved

      // If idToken is not directly available, get it from response.data.idToken
      const extractedIdToken = idToken || response.data.idToken;
      console.log('Extracted idToken from data:', extractedIdToken); // Log the extracted idToken

      if (extractedIdToken) {
        // Send idToken to the backend using axios
        const backendResponse = await axios.post(
          'http://localhost:4000/google-login',
          {
            idToken: extractedIdToken, // Sending the idToken
          },
        );

        const data = backendResponse.data;
        console.log('Backend Response:', backendResponse.data);

        await AsyncStorage.setItem('authToken', data.token);

        setToken(data.token);

        // Update auth state (if using context or state)
        // setIsAuthenticated(true); // Navigate to the main screen
        // Handle JWT token and user data here
      }
    } catch (error) {
      if (error.code === 'SIGN_IN_CANCELLED') {
        console.log('User cancelled Google sign-in - staying on current screen');
        // Don't show error, just return silently
        return;
      }
      console.log('Login Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView>
      <View style={{marginTop: 30, alignItems: 'center'}}>
        <Image
          style={{width: 240, height: 80, resizeMode: 'contain'}}
          source={{uri: 'https://wanderlog.com/assets/logoWithText.png'}}
        />
      </View>

      <View style={{marginTop: 70}}>
        <Pressable
          onPress={handleGoogleLogin}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 10,
            justifyContent: 'center',
            borderColor: '#E0E0E0',
            margin: 12,
            borderWidth: 1,
            gap: 30,
            borderRadius: 25,
            position: 'relative',
            marginTop: 20,
          }}>
          <Text style={{textAlign: 'center', fontSize: 15, fontWeight: '500'}}>
            Sign Up With Google
          </Text>
        </Pressable>

        <Pressable style={{marginTop: 12}}>
          <Text style={{textAlign: 'center', fontSize: 15, color: 'gray'}}>
            Already have an account? Sign In
          </Text>
        </Pressable>

        {/* Display Google Sign-In Response */}
        {googleResponse && (
          <View style={{margin: 20, padding: 15, backgroundColor: '#f0f0f0', borderRadius: 10}}>
            <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 10}}>
              Google Sign-In Response:
            </Text>
            <Text style={{fontSize: 12, fontFamily: 'monospace'}}>
              ID Token: {googleResponse.idToken ? googleResponse.idToken.substring(0, 50) + '...' : 'Not available'}
            </Text>
            <Text style={{fontSize: 12, marginTop: 5}}>
              User: {googleResponse.user?.name} ({googleResponse.user?.email})
            </Text>
            <Text style={{fontSize: 12, marginTop: 5}}>
              Server Auth Code: {googleResponse.serverAuthCode || 'Not available'}
            </Text>
            <View style={{flexDirection: 'row', marginTop: 10, gap: 10}}>
              <Pressable 
                onPress={() => setShowInspector(true)} 
                style={{flex: 1, padding: 8, backgroundColor: '#007AFF', borderRadius: 5}}>
                <Text style={{textAlign: 'center', color: 'white', fontWeight: 'bold'}}>Inspect Raw Response</Text>
              </Pressable>
              <Pressable 
                onPress={() => setGoogleResponse(null)} 
                style={{flex: 1, padding: 8, backgroundColor: '#ddd', borderRadius: 5}}>
                <Text style={{textAlign: 'center'}}>Hide Response</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Full Response Inspector Modal */}
        <Modal visible={showInspector} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{flex: 1, backgroundColor: '#000'}}>
            <View style={{padding: 20, backgroundColor: '#333'}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={{color: 'white', fontSize: 18, fontWeight: 'bold'}}>
                  Raw Google Response Inspector
                </Text>
                <Pressable 
                  onPress={() => setShowInspector(false)}
                  style={{padding: 10, backgroundColor: '#666', borderRadius: 5}}>
                  <Text style={{color: 'white'}}>Close</Text>
                </Pressable>
              </View>
            </View>
            <ScrollView style={{flex: 1, backgroundColor: '#111', padding: 15}}>
              <Text style={{color: '#0FF', fontSize: 14, fontFamily: 'monospace', lineHeight: 20}}>
                {googleResponse ? JSON.stringify(googleResponse, null, 2) : 'No response data'}
              </Text>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({});