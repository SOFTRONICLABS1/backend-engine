import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  username?: string;
  name: string;
  profile_image_url?: string;
  bio?: string;
  phone_number?: string;
  country_code?: string;
}

interface AuthContextType {
  token: string;
  setToken: (token: string) => void;
  userId: string;
  setUserId: (userId: string) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuthStatus: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!token && !!user;

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      console.log('=================== Checking Authentication Status ===================');
      
      const storedToken = await AsyncStorage.getItem('access_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      console.log('🔑 Stored token exists:', !!storedToken);
      
      if (storedToken && userData) {
        try {
          const decodedToken = jwtDecode(storedToken) as any;
          const parsedUser = JSON.parse(userData);
          
          console.log('👤 Stored user data:', parsedUser);
          console.log('👤 Has username:', !!parsedUser.username);
          
          setToken(storedToken);
          setUserId(decodedToken.userId || parsedUser.id);
          setUser(parsedUser);
          
          console.log('✅ Authentication restored from storage');
          console.log('=================== Auth Check Completed - Authenticated ===================');
        } catch (decodeError) {
          console.error('Failed to decode token or parse user data:', decodeError);
          // Clear invalid data
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
          console.log('❌ Invalid stored data cleared');
        }
      } else {
        console.log('❌ No valid authentication found');
        console.log('=================== Auth Check Completed - Not Authenticated ===================');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('=================== Starting Logout ===================');
      
      // Clear state
      setToken('');
      setUserId('');
      setUser(null);
      
      // Clear storage
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
      
      console.log('🗑️ Cleared all authentication data');
      console.log('=================== Logout Completed ===================');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Update user data when token changes
  useEffect(() => {
    const updateUserFromToken = async () => {
      if (token) {
        try {
          const decodedToken = jwtDecode(token) as any;
          setUserId(decodedToken.userId);
        } catch (error) {
          console.error('Failed to decode token:', error);
        }
      }
    };

    updateUserFromToken();
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        token,
        setToken,
        userId,
        setUserId,
        user,
        setUser,
        isAuthenticated,
        isLoading,
        checkAuthStatus,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};