import React from 'react'
import { useGlobalState } from '../globalState'
import { PiVanLight } from "react-icons/pi"
import { FaRegUser } from "react-icons/fa"
import { LuMapPin } from "react-icons/lu"
import { IoBus } from "react-icons/io5"
import ClipLoader from "react-spinners/ClipLoader"
import '../app/style.css'

const Stats = () => {
  const { riders,lines,intercityTrips,drivers,loading } = useGlobalState()

  return (
    <div className='main_section_stat'>
      <div className='main_section_stat_header_div'>
        <h4>إحصائيات</h4>
      </div>
      <div className='main_section_stat_items'>

        <div className='main_section_stat_item'>
          <div className='main_section_stat_item_icon_div' style={{backgroundColor:'#955BFE'}}>
            <FaRegUser className='main_section_stat_item_icon'/>
          </div>
          <div className='main_section_stat_info_item'>
            <p>ركاب</p>
            {loading ? (
              <div style={{ width:'50px',padding:'10px 0',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ClipLoader
                  color={'#955BFE'}
                  loading={loading}
                  size={10}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
              </div>
            ) : (
              <h5>{riders.length}</h5>
            )}
          </div>
        </div>

        <div className='main_section_stat_item'>
          <div className='main_section_stat_item_icon_div' style={{backgroundColor:'#7ABA37'}}>
            <IoBus className='main_section_stat_item_icon'/>
          </div>
          <div className='main_section_stat_info_item'>
            <p>خطوط</p>
            {loading ? (
              <div style={{ width:'50px',padding:'10px 0',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ClipLoader
                  color={'#955BFE'}
                  loading={loading}
                  size={10}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
              </div>
            ) : (
              <h5>{lines.length}</h5>
            )}
          </div>
        </div>

        <div className='main_section_stat_item'>
          <div className='main_section_stat_item_icon_div' style={{backgroundColor:'#FFB400'}}>
            <LuMapPin className='main_section_stat_item_icon'/>
          </div>
          <div className='main_section_stat_info_item'>
            <p>رحلات يومية</p>
            {loading ? (
              <div style={{ width:'50px',padding:'10px 0',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ClipLoader
                  color={'#955BFE'}
                  loading={loading}
                  size={10}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
              </div>
            ) : (
              <h5>{intercityTrips.length}</h5>
            )}
          </div>
        </div>

        <div className='main_section_stat_item'>
          <div className='main_section_stat_item_icon_div'  style={{backgroundColor:'#16B1FF'}}>
            <PiVanLight className='main_section_stat_item_icon' style={{fontSize:'36px'}}/>
          </div>
          <div className='main_section_stat_info_item'>
            <p>سواق</p>
            {loading ? (
              <div style={{ width:'50px',padding:'10px 0',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ClipLoader
                  color={'#955BFE'}
                  loading={loading}
                  size={10}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
              </div>
            ) : (
              <h5>{drivers.length}</h5>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default Stats