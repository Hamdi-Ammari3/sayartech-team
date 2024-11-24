import React,{useEffect,useState} from 'react'
import { CiLogout } from "react-icons/ci"
import { useRouter } from 'next/navigation'

const Navbar = () => {
  const router = useRouter();
  const [userName,setUserName] = useState('')

  useEffect(() => {
    const storedName = localStorage.getItem('adminDahboardName');
    setUserName(storedName)
  }, []);

  const logoutHandler = () => {
    localStorage.removeItem('adminLoggedIn')
    localStorage.removeItem('adminName')
    localStorage.removeItem('adminDahboardName')
    router.push('/login');
  }
  return (
    <div className='navbar'>
        <div className='navbar_logo_div'>
            <h2>Sayartech</h2>
        </div>
        <div className='navbar_user_box'>
          <h5>{userName}</h5>
          <button onClick={logoutHandler}>
            <p>خروج</p>
            <CiLogout style={{color:'#000',fontSize:15}} />
          </button>
        </div>
    </div>
  )
}

export default Navbar