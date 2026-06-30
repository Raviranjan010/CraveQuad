'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Campus {
  id: string;
  name: string;
  address: string;
  emailDomain: string | null;
  isActive: boolean;
}

interface CampusContextType {
  selectedCampusId: string | null;
  selectedCampusName: string | null;
  deliveryAddress: string;
  setCampus: (id: string, name: string) => void;
  setDeliveryAddress: (address: string) => void;
  campuses: Campus[];
  isLoading: boolean;
}

const CampusContext = createContext<CampusContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function CampusProvider({ children }: { children: React.ReactNode }) {
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [selectedCampusName, setSelectedCampusName] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddressState] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch active campuses from NestJS API
  const { data: campuses = [], isLoading } = useQuery<Campus[]>({
    queryKey: ['campuses'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/auth/campuses`);
      if (!res.ok) throw new Error('Failed to fetch campuses');
      return res.json();
    },
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedId = localStorage.getItem('CC:campus_id');
      const storedName = localStorage.getItem('CC:campus_name');
      const storedAddress = localStorage.getItem('CC:delivery_address');

      if (storedId) setSelectedCampusId(storedId);
      if (storedName) setSelectedCampusName(storedName);
      if (storedAddress) setDeliveryAddressState(storedAddress);
    } catch (e) {
      console.error('Failed to load campus context', e);
    }
    setIsLoaded(true);
  }, []);

  // Sync default campus when campuses load if nothing is selected
  useEffect(() => {
    if (isLoaded && !selectedCampusId && campuses.length > 0) {
      setSelectedCampusId(campuses[0].id);
      setSelectedCampusName(campuses[0].name);
      localStorage.setItem('CC:campus_id', campuses[0].id);
      localStorage.setItem('CC:campus_name', campuses[0].name);
    }
  }, [campuses, selectedCampusId, isLoaded]);

  const setCampus = (id: string, name: string) => {
    setSelectedCampusId(id);
    setSelectedCampusName(name);
    try {
      localStorage.setItem('CC:campus_id', id);
      localStorage.setItem('CC:campus_name', name);
    } catch (e) {
      console.error(e);
    }
  };

  const setDeliveryAddress = (address: string) => {
    setDeliveryAddressState(address);
    try {
      localStorage.setItem('CC:delivery_address', address);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <CampusContext.Provider
      value={{
        selectedCampusId,
        selectedCampusName,
        deliveryAddress,
        setCampus,
        setDeliveryAddress,
        campuses,
        isLoading,
      }}
    >
      {children}
    </CampusContext.Provider>
  );
}

export function useCampus() {
  const context = useContext(CampusContext);
  if (context === undefined) {
    throw new Error('useCampus must be used within a CampusProvider');
  }
  return context;
}
