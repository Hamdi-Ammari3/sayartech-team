'use client';
import React, { createContext, useReducer, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { DB } from './firebaseConfig';

const GlobalStateContext = createContext();

const initialState = {
  riders:[],
  lines: [],
  intercityTrips: [],
  drivers: [],
  destinations:[],
  emails: [],
  privateCarRequests: [],
  unseenEmailsCount: 0,
  unseenPrivateCarRequestsCount: 0,
  loading: true,
  error: null,
};

const globalStateReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_SUCCESS':
      return {
        ...state,
        ...action.payload,
        loading: false,
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        error: action.error,
        loading: false,
      };
    default:
      return state;
  }
};

export const GlobalStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(globalStateReducer, initialState);

  useEffect(() => {    
    const unsubscribeRiders = onSnapshot(collection(DB, 'riders'), (snapshot) => {
      const riders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { riders },
      });
    });

    const unsubscribeDrivers = onSnapshot(collection(DB, 'drivers'), (snapshot) => {
      const drivers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { drivers },
      });
    });

    const unsubscribeLines = onSnapshot(collection(DB, 'lines'), (snapshot) => {
      const lines = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { lines },
      });
    });

    const unsubscribeTrips = onSnapshot(collection(DB, 'intercityTrips'), (snapshot) => {
      const intercityTrips = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { intercityTrips },
      });
    });

    const unsubscribeDestinations = onSnapshot(collection(DB, 'institutions'), (snapshot) => {
      const destinations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { destinations },
      });
    });

    const unsubscribeEmails = onSnapshot(collection(DB, 'emails'), (snapshot) => {
      const emails = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const unseenEmailsCount = emails.filter((email) => !email.seen).length;
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { emails,unseenEmailsCount },
      });
    });

    const unsubscribePrivateCarRequests = onSnapshot(collection(DB, 'carRequest'), (snapshot) => {
      const privateCarRequests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const unseenPrivateCarRequestsCount = privateCarRequests.filter((req) => !req.seen).length;
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { privateCarRequests,unseenPrivateCarRequestsCount },
      });
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeRiders();
      unsubscribeDrivers();
      unsubscribeLines();
      unsubscribeTrips();
      unsubscribeDestinations();
      unsubscribeEmails();
      unsubscribePrivateCarRequests();
    };
  }, []);

  return (
    <GlobalStateContext.Provider value={state}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => React.useContext(GlobalStateContext);
