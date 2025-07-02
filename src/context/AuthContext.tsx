import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ServiceArea, Address } from '../types';
import { supabase } from '../lib/supabase';
import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  createUser,
  getUserByUserId,
  updateUser as updateUserInDB,
  deleteUser as deleteUserFromDB,
  createServiceArea,
  deleteServiceArea,
  createAddress,
  getUserAddresses,
  getServiceAreas,
  checkUserIdExists,
} from '../services/database';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userId: string, password: string, userType: 'customer' | 'vendor') => Promise<boolean>;
  register: (userData: Omit<User, 'id'> & { password: string }, areaId?: string, addressData?: any) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  deleteProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    getCurrentUser().then(async (authUser) => {
      if (authUser && authUser.email) {
        // Extract userId from email (remove @aquaflow.local)
        const userId = authUser.email.replace('@aquaflow.local', '');
        
        // Get user data from our users table
        const { data: userData, error } = await getUserByUserId(userId);
        if (!error && userData) {
          // Get user addresses if customer
          let addresses: Address[] = [];
          if (userData.user_type === 'customer') {
            const { data: addressData } = await getUserAddresses(userData.id);
            if (addressData) {
              addresses = addressData.map(addr => ({
                id: addr.id,
                label: addr.label,
                street: addr.street,
                city: addr.city,
                state: addr.state,
                zipCode: addr.zip_code,
                isDefault: addr.is_default,
                areaId: addr.area_id || '',
              }));
            }
          }

          setUser({
            id: userData.id,
            userId: userData.user_id,
            name: userData.name,
            type: userData.user_type,
            phone: userData.phone || '',
            addresses: userData.user_type === 'customer' ? addresses : undefined,
            areaId: userData.area_id || undefined,
            serviceArea: userData.service_area || undefined,
          });
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (userId: string, password: string, userType: 'customer' | 'vendor'): Promise<boolean> => {
    try {
      // First check if user exists in our database
      const { data: userData, error: userError } = await getUserByUserId(userId);
      if (userError || !userData || userData.user_type !== userType) {
        console.error('User not found or type mismatch:', userError);
        return false;
      }

      // Sign in with Supabase Auth using userId as email
      const { error } = await signIn(`${userId}@aquaflow.local`, password);
      if (error) {
        console.error('Auth sign in error:', error);
        return false;
      }

      // Get user addresses if customer
      let addresses: Address[] = [];
      if (userData.user_type === 'customer') {
        const { data: addressData } = await getUserAddresses(userData.id);
        if (addressData) {
          addresses = addressData.map(addr => ({
            id: addr.id,
            label: addr.label,
            street: addr.street,
            city: addr.city,
            state: addr.state,
            zipCode: addr.zip_code,
            isDefault: addr.is_default,
            areaId: addr.area_id || '',
          }));
        }
      }

      setUser({
        id: userData.id,
        userId: userData.user_id,
        name: userData.name,
        type: userData.user_type,
        phone: userData.phone || '',
        addresses: userData.user_type === 'customer' ? addresses : undefined,
        areaId: userData.area_id || undefined,
        serviceArea: userData.service_area || undefined,
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (
    userData: Omit<User, 'id'> & { password: string }, 
    areaId?: string, 
    addressData?: any
  ): Promise<boolean> => {
    try {
      // Check if user already exists using the new function
      const userExists = await checkUserIdExists(userData.userId);
      if (userExists) {
        console.error('User already exists');
        return false;
      }

      // Sign up with Supabase Auth using userId as email
      const { data: authData, error: authError } = await signUp(`${userData.userId}@aquaflow.local`, userData.password);
      if (authError) {
        console.error('Auth signup error:', authError);
        return false;
      }

      // Wait a moment for auth user to be created
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create user in our database
      const { data: newUser, error: userError } = await createUser({
        userId: userData.userId,
        name: userData.name,
        type: userData.type,
        phone: userData.phone,
        areaId: userData.type === 'customer' ? areaId : undefined,
        serviceArea: userData.type === 'vendor' ? userData.serviceArea : undefined,
      });

      if (userError || !newUser) {
        console.error('User creation error:', userError);
        // Clean up auth user if database creation failed
        await signOut();
        return false;
      }

      // If vendor, create service area
      if (userData.type === 'vendor' && userData.serviceArea) {
        const { error: areaError } = await createServiceArea({
          name: userData.serviceArea,
          vendorId: newUser.id,
          vendorName: userData.name,
        });
        if (areaError) {
          console.error('Service area creation error:', areaError);
        }
      }

      // If customer, create initial address
      let addresses: Address[] = [];
      if (userData.type === 'customer' && addressData && areaId) {
        const { data: addressResult, error: addressError } = await createAddress({
          userId: newUser.id,
          label: 'Home',
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          zipCode: addressData.zipCode,
          isDefault: true,
          areaId: areaId,
        });

        if (!addressError && addressResult) {
          addresses = [{
            id: addressResult.id,
            label: addressResult.label,
            street: addressResult.street,
            city: addressResult.city,
            state: addressResult.state,
            zipCode: addressResult.zip_code,
            isDefault: addressResult.is_default,
            areaId: addressResult.area_id || '',
          }];
        }
      }

      setUser({
        id: newUser.id,
        userId: newUser.user_id,
        name: newUser.name,
        type: newUser.user_type,
        phone: newUser.phone || '',
        addresses: userData.type === 'customer' ? addresses : undefined,
        areaId: newUser.area_id || undefined,
        serviceArea: newUser.service_area || undefined,
      });

      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;

    try {
      const { data: updatedUser, error } = await updateUserInDB(user.id, userData);
      if (!error && updatedUser) {
        setUser(prev => prev ? { ...prev, ...userData } : null);
      }
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  const deleteProfile = async () => {
    if (!user) return;

    try {
      // If vendor, delete service area first
      if (user.type === 'vendor' && user.serviceArea) {
        // This will cascade delete related data due to foreign key constraints
        await deleteServiceArea(user.id);
      }

      // Delete user (this will cascade delete addresses, orders, etc.)
      await deleteUserFromDB(user.id);
      
      // Sign out
      await logout();
    } catch (error) {
      console.error('Delete profile error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, deleteProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};