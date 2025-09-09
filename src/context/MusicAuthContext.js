import AsyncStorage from '@react-native-async-storage/async-storage';
import {jwtDecode} from 'jwt-decode';
import {createContext, useEffect, useState} from 'react';

const MusicAuthContext = createContext();

const MusicAuthProvider = ({children}) => {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  useEffect(() => {
    const fetchUser = async () => {
      const token = await AsyncStorage.getItem('authToken');
      const decodedToken = jwtDecode(token);
      const userId = decodedToken.userId;
      setUserId(userId);
    };

    fetchUser();
  }, []);

  return (
    <MusicAuthContext.Provider
      value={{
        token,
        setToken,
        userId,
        setUserId,
      }}>
      {children}
    </MusicAuthContext.Provider>
  );
};

export {MusicAuthContext, MusicAuthProvider};