import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../authState';

const PrivateRoute = ({ children }) => {
  const { authUser } = useAuth();

  if (!authUser) {
    return <Navigate to="/login" />; // Redirect to login if not authenticated
  }

  return children;
};

export default PrivateRoute;
