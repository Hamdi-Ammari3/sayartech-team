/*

'use client'
import React, { createContext, useReducer, useEffect } from 'react'
import { collection, getDocs,onSnapshot } from 'firebase/firestore'
import { DB } from './firebaseConfig'

const GlobalStateContext = createContext();

const initialState = {
  users: [],
  students: [],
  drivers: [],
  schools: [],
  emails: [],
  privateCarRequests: [],
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
      case 'UPDATE_EMAIL':
        return {
          ...state,
          emails: state.emails.map((email) =>
            email.id === action.payload.id
              ? { ...email, ...action.payload.changes }
              : email
          ),
        };
    default:
      return state;
  }
};

export const GlobalStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(globalStateReducer, initialState);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allUsersSnapshot = await getDocs(collection(DB,'users'));
        const studentsSnapshot = await getDocs(collection(DB, 'students'));
        const driversSnapshot = await getDocs(collection(DB, 'drivers'));
        const schoolsSnapshot = await getDocs(collection(DB, 'schools'));
        const emailsSnapshot = await getDocs(collection(DB, 'emails'));
        const privateCarRequestsSnapshot = await getDocs(collection(DB, 'carRequest'));

        const users = allUsersSnapshot.docs.map(doc => doc.data())
        const students = studentsSnapshot.docs.map(doc => doc.data());
        const drivers = driversSnapshot.docs.map(doc => doc.data());
        const schools = schoolsSnapshot.docs.map(doc => doc.data());
        //const emails = emailsSnapshot.docs.map(doc => doc.data());
        const emails = emailsSnapshot.docs.map((doc) => ({
          id: doc.id, // Add the document ID
          ...doc.data(), // Include the rest of the data
        }));
        const privateCarRequests = privateCarRequestsSnapshot.docs.map(doc => doc.data());

        dispatch({
          type: 'FETCH_SUCCESS',
          payload: {
            users,
            students,
            drivers,
            schools,
            emails,
            privateCarRequests,
          },
        });
      } catch (error) {
        dispatch({ type: 'FETCH_ERROR', error });
      }
    };

    fetchData();
  }, []);

  return (
    <GlobalStateContext.Provider value={state}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => React.useContext(GlobalStateContext);
*/

'use client';
import React, { createContext, useReducer, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { DB } from './firebaseConfig';

const GlobalStateContext = createContext();

const initialState = {
  users: [],
  students: [],
  drivers: [],
  schools: [],
  emails: [],
  privateCarRequests: [],
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
    // Real-time listeners
    const unsubscribeUsers = onSnapshot(collection(DB, 'users'), (snapshot) => {
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { users },
      });
    });

    const unsubscribeStudents = onSnapshot(collection(DB, 'students'), (snapshot) => {
      const students = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { students },
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

    const unsubscribeEmails = onSnapshot(collection(DB, 'emails'), (snapshot) => {
      const emails = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { emails },
      });
    });

    const unsubscribePrivateCarRequests = onSnapshot(collection(DB, 'carRequest'), (snapshot) => {
      const privateCarRequests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: { privateCarRequests },
      });
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeUsers();
      unsubscribeStudents();
      unsubscribeDrivers();
      unsubscribeSchools();
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
