import React, { createContext, useContext } from 'react';

// Demo user ID for the app - this is a fixed UUID for demo purposes
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

interface DemoContextType {
  userId: string;
  isInstructor: boolean;
  isStudent: boolean;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  // For demo, we'll determine role based on the current path
  const isInstructor = typeof window !== 'undefined' && window.location.pathname.startsWith('/instructor');
  const isStudent = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/student') ||
    window.location.pathname.startsWith('/student-dashboard')
  );

  return (
    <DemoContext.Provider value={{
      userId: DEMO_USER_ID,
      isInstructor,
      isStudent,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
