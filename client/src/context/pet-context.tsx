import { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface PetProfile {
  name: string;
  breed: string;
  age: string;
}

interface PetContextValue {
  pet: PetProfile | null;
  petName: string;
  hasPet: boolean;
  savePet: (profile: PetProfile) => void;
  clearPet: () => void;
  showWizard: boolean;
  setShowWizard: (v: boolean) => void;
}

const STORAGE_KEY = "spoiltdog_pet_profile";

const PetContext = createContext<PetContextValue | null>(null);

export function PetProvider({ children }: { children: React.ReactNode }) {
  const [pet, setPet] = useState<PetProfile | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (!pet && !window.location.pathname.startsWith("/admin")) {
      const timer = setTimeout(() => setShowWizard(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [pet]);

  const savePet = useCallback((profile: PetProfile) => {
    setPet(profile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setShowWizard(false);
  }, []);

  const clearPet = useCallback(() => {
    setPet(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const petName = pet?.name || "Buddy";
  const hasPet = pet !== null;

  return (
    <PetContext.Provider value={{ pet, petName, hasPet, savePet, clearPet, showWizard, setShowWizard }}>
      {children}
    </PetContext.Provider>
  );
}

export function usePet() {
  const ctx = useContext(PetContext);
  if (!ctx) throw new Error("usePet must be used within PetProvider");
  return ctx;
}
