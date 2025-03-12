'use client';
import React, { createContext, useReducer, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { DB } from './firebaseConfig';

const GlobalStateContext = createContext();

const initialState = {
  riders:[],
  students: [],
  employees: [],
  drivers: [],
  schools: [],
  companies:[],
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

      const students = riders.filter((rider) => rider.rider_type === 'student');
      const employees = riders.filter((rider) => rider.rider_type === 'employee');

      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { students,employees,riders },
      });
    });

    const unsubscribeDrivers = onSnapshot(collection(DB, 'drivers'), (snapshot) => {
      const drivers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { drivers },
      });
    });

    const unsubscribeSchools = onSnapshot(collection(DB, 'schools'), (snapshot) => {
      const schools = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { schools },
      });
    });

    const unsubscribeCompanies = onSnapshot(collection(DB, 'companies'), (snapshot) => {
      const companies = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { companies },
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
      unsubscribeSchools();
      unsubscribeCompanies
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
