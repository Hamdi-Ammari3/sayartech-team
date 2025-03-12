'use client'
import React,{useState,useEffect} from 'react'
import {useRouter} from 'next/navigation'
import { LoadScript } from "@react-google-maps/api"
import ClipLoader from "react-spinners/ClipLoader"
import './style.css'
import Navbar from '../components/navBar'
import Main from '../components/main'
import DailyStatus from '../components/dailyStatus'
import TrackingMap from '../components/trackingMap'
import Connect from '../components/connect'
import Students from '../components/students'
import Employees from '../components/employees'
import Drivers from '../components/drivers'
import Destination from '../components/destination'
import Email from '../components/email'
import PrivateCarRequest from '../components/privateCarRequest'

const Dashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeSection,setActiveSection] = useState('الرئيسية')
  const router = useRouter();

  // Check if admin is logged in
  useEffect(() => {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    if (!adminLoggedIn) {
      router.push('/login'); // Redirect to login page if not authenticated
    } else {
      setIsAuthenticated(true); // Allow access to the dashboard
    }
  }, []);


  if (!isAuthenticated) {
    return (
      <div style={{ width:'100vw',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <ClipLoader
        color={'#955BFE'}
        loading={!isAuthenticated}
        size={70}
        aria-label="Loading Spinner"
        data-testid="loader"
      />
      </div>   
  )}

  
  // Function to handle select section
  const handleSectionSelect = (section) => {
    setActiveSection(section)
  }

// Function to render section component
  const renderContent = () => {
    switch (activeSection) {
      case 'الرئيسية':
        return <Main/>
      case 'الحالة اليومية':
        return <DailyStatus/>
      case 'متابعة السائقين':
        return <TrackingMap/>
      case 'ربط الركاب مع سواق':
        return <Connect/>
      case 'الطلاب' :
        return <Students/>
      case 'الموظفين':
        return <Employees/>
      case 'السواق':
        return <Drivers/>
      case 'المؤسسات' :
        return <Destination/>
      case 'رسائل':
        return <Email/>
      case 'طلبات سيارات خاصة':
        return <PrivateCarRequest/>
      default:
        return <Main/>
    }
  }

  return (
    <LoadScript googleMapsApiKey="AIzaSyA-3LcUn0UzzVovibA1YZIL29n1c0GIi9M">
    <div className='dashboard-container'>
      <Navbar/>
      <div className='main-box'>
        <div className='side-box'>
          <div>

            <div
              onClick={() => handleSectionSelect('الرئيسية')}
              className={activeSection === 'الرئيسية' ? 'active':''}
            >
              <h4 >الرئيسية</h4>
            </div>

            <div
              onClick={() => handleSectionSelect('الحالة اليومية')}
              className={activeSection === 'الحالة اليومية' ? 'active':''}
            >
              <h4 >الحالة اليومية</h4>
            </div>

            <div
              onClick={() => handleSectionSelect('متابعة السائقين')}
              className={activeSection === 'متابعة السائقين' ? 'active':''}
            >
              <h4 >متابعة السائقين</h4>
            </div>

            <div
              onClick={() => handleSectionSelect('ربط الركاب مع سواق')}
              className={activeSection === 'ربط الركاب مع سواق' ? 'active':''}
            >
              <h4 >ربط الركاب مع سواق</h4>
            </div>

            <div
              onClick={() => handleSectionSelect('الطلاب')}
              className={activeSection === 'الطلاب' ? 'active':''}
            >
              <h4 >الطلاب</h4>
            </div>

            <div
              onClick={() => handleSectionSelect('الموظفين')}
              className={activeSection === 'الموظفين' ? 'active':''}
            >
              <h4 >الموظفين</h4>
            </div>

            <div
              onClick={() => handleSectionSelect('السواق')}
              className={activeSection === 'السواق' ? 'active':''}
            >
              <h4 >السواق</h4>
            </div>

            <div
              onClick={() => handleSectionSelect('المؤسسات')}
              className={activeSection === 'المؤسسات' ? 'active':''}
            >
              <h4>المؤسسات</h4>
            </div>
            
            <div
              onClick={() => handleSectionSelect('رسائل')}
              className={activeSection === 'رسائل' ? 'active':''}
            >
              <h4 >رسائل</h4>
            </div>

            <div
              onClick={() => handleSectionSelect('طلبات سيارات خاصة')}
              className={activeSection === 'طلبات سيارات خاصة' ? 'active':''}
            >
              <h4 >طلبات سيارات خاصة</h4>
            </div>

          </div>
        </div>
        <div className='inner-box'>
          {renderContent()}
        </div>
      </div>
    </div>
    </LoadScript>
  )
}

export default Dashboard