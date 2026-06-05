import React, { createContext, useState, useEffect } from 'react';

export const DataContext = createContext();

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const res = await fetch('/data/musicRegistry.json?t=' + Date.now());
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        console.error("Failed to load music registry:", res.statusText);
      }
    } catch (err) {
      console.error("Error fetching music registry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <DataContext.Provider value={{ data, refreshData, loading }}>
      {children}
    </DataContext.Provider>
  );
}
