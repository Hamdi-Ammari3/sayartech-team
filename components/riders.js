import React,{useState,useEffect} from 'react'
import Image from 'next/image'
import { doc,writeBatch} from "firebase/firestore"
import { DB } from '../firebaseConfig'
import { useGlobalState } from '../globalState'
import { BsArrowLeftShort } from "react-icons/bs"
import { FcDeleteDatabase } from "react-icons/fc"
import { Modal } from "antd"
import { GoogleMap,Marker } from "@react-google-maps/api"
import maps from '../images/google-maps.png'

const Riders = () => {
  const { riders,lines,drivers } = useGlobalState()

  const [nameFilter,setNameFilter] = useState('')
  const [destinationFilter,setDestinationFilter] = useState('')
  const [addressFilter,setAddressFilter] = useState('')
  const [hasDriverFilter,setHasDriverFilter] = useState('')
  const [selectedRider,setSelectedRider] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isModalMapVisible,setIsModalMapVisible] = useState(false)
  const [homeCoords, setHomeCoords] = useState(null)
  const [schoolCoords, setSchoolCoords] = useState(null)
  const [distance, setDistance] = useState(null)
  
  // Filtered students based on search term
  const filteredRiders  = riders.filter((rider) =>{
    //Filter by name
    const matchesName = nameFilter === '' || rider.full_name.includes(nameFilter)

    //Filter by destination (school or company)
    const matchesDestination = destinationFilter === '' || rider.destination.includes(destinationFilter)

    //Filter by home address
    const matchesAddress = addressFilter === '' || rider.home_address.includes(addressFilter)

    //check he has a driver or not
    const matchesDriver = 
    hasDriverFilter === '' || 
    (hasDriverFilter === 'true' && rider.line_id) || 
    (hasDriverFilter === 'false' && !rider.line_id);

    // Return only students matching all filters
    return matchesName && matchesDestination && matchesAddress && matchesDriver;
  });

  // Handle student name change
  const handleNameFilterChange = (e) => {
    setNameFilter(e.target.value);
  };

  // Handle rider destination change
  const handleDestinationChange = (e) => {
    setDestinationFilter(e.target.value);
  };

  // Handle rider destination change
  const handleAddressChange = (e) => {
    setAddressFilter(e.target.value);
  };


  // Handle student has driver change
  const handleHasDriverChange = (e) => {
    setHasDriverFilter(e.target.value);
  };

  // Select the student
  const selectRider = async (rider) => {
    setSelectedRider(rider);
  };

  // Handle back action
  const goBack = () => {
    setSelectedRider(null)
  };

  //Calculate student age
  const calculateAge = (birthdate) => {
    const birthDate = new Date(birthdate.seconds * 1000); // Convert Firestore Timestamp to JS Date
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
  
    // Adjust age if the current date is before the birthdate this year
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  
    return age;
  };

  const findDriverInfoFromId = () => {
    const theDriver = drivers.find((driver) => driver.id === selectedRider.driver_id)
    if(!theDriver) {
      console.log('driver didnt exsit')
      return null;
    }
    return {
      name: theDriver.full_name,
      family_name: theDriver.family_name,
    }
  }

  const findLineInfoFromId = () => {
    const theLine = lines.find((line) => line.id === selectedRider.line_id)
    if(!theLine) {
      console.log('driver didnt exsit')
      return null;
    }
    return {
      name: theLine.name,
      line_type: theLine.line_type,
    }
  }

  //Fetch home and destination location 
  useEffect(() => {
    if (selectedRider) {
      const homeLocation = selectedRider?.home_location;
      const schoolLocation = selectedRider?.destination_location;

      if (homeLocation && schoolLocation) {
        setHomeCoords({
          lat: homeLocation.latitude,
          lng: homeLocation.longitude,
        });
        setSchoolCoords({
          lat: schoolLocation.latitude,
          lng: schoolLocation.longitude,
        });

        // Calculate distance
        const calculatedDistance = getDistance(
          homeLocation.latitude,
          homeLocation.longitude,
          schoolLocation.latitude,
          schoolLocation.longitude
        );
        setDistance(calculatedDistance);
      }
    }
  }, [selectedRider]);

  // Haversine formula to calculate distance
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2); // Distance in kilometers
  };

  // Map Style
  const containerStyle = {
    width: '100%',
    height: '100%'
  }

  //Open Map Modal
  const handleOpenMapModal = () => {
    setIsModalMapVisible(true)
  }

  //Close Map Modal
  const handleCloseMapModal = () => {
    setIsModalMapVisible(false)
  }

  //Delete student document from DB
  const handleDelete = async () => {
    if (isDeleting) return;

    const confirmDelete = window.confirm("هل تريد بالتأكيد حذف هذا الحساب");
    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      const batch = writeBatch(DB);
      const riderRef = doc(DB, 'riders', selectedRider.id);
      
      // Check if the student is still connected to a driver
      if (selectedRider.line_id || selectedRider.driver_id) {
        alert("لا يمكن حذف هذا الطالب لأنه لا يزال مرتبطًا بخط.");
        return;
      }

      batch.delete(riderRef)
      await batch.commit()
      setSelectedRider(null)

      alert("تم الحذف بنجاح")

    } catch (error) {
      console.log("خطأ أثناء الحذف:", error.message)
      alert("حدث خطأ أثناء الحذف. حاول مرة أخرى.")
    } finally {
      setIsDeleting(false)
    }
  }

  //Render rider filter
  const renderStudentTitles = () => (
    <div className='students-section-inner-titles'>
      <div className='students-section-inner-title'>
        <input 
          onChange={handleNameFilterChange} 
          value={nameFilter}
          placeholder='الاسم' 
          type='text' 
        />
      </div>
      <div className='students-section-inner-title'>
        <input 
          onChange={handleDestinationChange} 
          value={destinationFilter}
          placeholder='الوجهة' 
          type='text' 
        />
      </div>
      <div className='students-section-inner-title'>
        <input 
          onChange={handleAddressChange} 
          value={addressFilter}
          placeholder='العنوان' 
          type='text' 
        />
      </div>
      <div className='students-section-inner-title' style={{width:'200px'}}>
        <select onChange={handleHasDriverChange} value={hasDriverFilter}>
        <option value=''>لديه خط</option>
          <option value={true}>نعم</option>
          <option value={false}>لا</option>
        </select>
      </div>
    </div>
  )

  return (
    <div className='white_card-section-container'>
      {!selectedRider ? (
        <div className='students-section-inner'>
          {renderStudentTitles()}
          <div className='all-items-list'>
            {filteredRiders.map((rider, index) => (
              <div key={index} onClick={() => selectRider(rider)} className='single-item' >
                <div>
                  <h5>{rider.full_name} {rider.family_name}</h5>                         
                </div>                
                <div>
                  <h5>{rider.destination}</h5>
                </div>
                <div>
                  <h5>{rider.home_address}</h5>
                </div>
                <div style={{width:'200px'}}>
                  <h5 className={rider.line_id ? 'student-has-driver' : 'student-without-driver'}>{rider.line_id ? 'نعم' : 'لا'}</h5>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="item-detailed-data-container">
          <div className="item-detailed-data-header">
            <div className='item-detailed-data-header-title' style={{flexDirection:'row-reverse',gap:'5px'}}>            
              <h5>{selectedRider.full_name}</h5>
              <h5>{selectedRider.family_name}</h5>              
              <h5>-</h5>
              <h5>{selectedRider.birth_date ? calculateAge(selectedRider.birth_date) : '-'}</h5>
              <h5>سنة</h5>
              <h5>-</h5>
              <h5>{selectedRider.phone_number}</h5>
            </div>
            <button className="info-details-back-button" onClick={goBack}>
              <BsArrowLeftShort size={24}/>
            </button>
          </div>

          <div className="item-detailed-data-main">
            <div className="student-detailed-data-main-firstBox">
              <div>
                <h5 style={{marginLeft:'5px'}}>{selectedRider.destination || '-'}</h5>
              </div>
              <div>
                <h5 style={{marginLeft:'4px'}}>{selectedRider.home_address || '-'}</h5>
                <h5 style={{marginLeft:'4px'}}>-</h5>              
                <button className="student-edit-car-type-btn" onClick={handleOpenMapModal}>
                  <Image src={maps} width={16} height={16} alt='maps'/>
                </button>
                <Modal
                  title='موقع الطالب'
                  open={isModalMapVisible}
                  onCancel={handleCloseMapModal}
                  footer={[
                    <div className='map-distance-div' key='distance'>
                      <p>{distance} km</p>
                    </div>
                  ]}
                  centered
                >
                  <div style={{ height: '500px', width: '100%',margin:'0px' }}>
                    {homeCoords && schoolCoords ? (
                      <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={homeCoords}
                        zoom={12}
                      >
                        <Marker 
                          position={homeCoords}
                          label={{
                            text:'المنزل',
                            color:'#000',
                            fontWeight:'bold'
                          }}
                        />
                        <Marker 
                          position={schoolCoords}
                          label={{
                            text:'المدرسة',
                            color:'#000',
                            fontWeight:'bold'
                          }}
                        />
                      </GoogleMap> 
                    ) : (
                      <h5>Loading</h5>
                    )}                   
                  </div>                     
                </Modal>
              </div>
              <div>
                <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>الاشتراك الشهري</h5>
                <h5 style={{marginLeft:'5px'}}>
                  {selectedRider.line_id ? Number(selectedRider.company_commission + selectedRider.driver_commission).toLocaleString('en-US') : '0'}
                </h5>
                <h5 style={{marginLeft:'10px'}}>دينار</h5>
              </div>
              {selectedRider?.driver_id && selectedRider?.service_period && (
                <div>
                  <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>صلوحية الاشتراك</h5>
                  <h5>
                    {new Date(
                      selectedRider.service_period.end_date.seconds * 1000
                    ).toLocaleDateString('en-GB')}
                  </h5>
                </div>
              )}
              <div>
                <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>المعرف الخاص</h5>
                <h5>{selectedRider.id}</h5>
              </div>
              <div>
                <h5 style={{marginLeft:'3px'}}>حذف الحساب</h5>
                <button 
                  className="assinged-item-item-delete-button" 
                  onClick={() => handleDelete()}
                  disabled={isDeleting}
                >
                  <FcDeleteDatabase size={24} />
                </button>
              </div>
            </div>

            <div className="student-detailed-data-main-second-box">
              <div className="line-driver-box" style={{marginBottom:'30px'}}>
                {selectedRider.line_id ? (
                  (() => {
                  const line = findLineInfoFromId(selectedRider.line_id);
                  return line ? (
                    <>
                      <h5 style={{fontWeight:'bold'}}>الخط</h5>
                      <h5>{line?.name}</h5>
                      <h5>{line?.line_type}</h5>
                      <h5>{selectedRider?.line_id}</h5>
                    </>        
                  ) : (
                    <h5>--</h5>
                  );
                })()
                ) : (
                  <h5 style={{color:'gray'}}>لا يوجد خط</h5>
                )}
              </div>
              <div className="line-driver-box">
                {selectedRider.driver_id ? (
                  (() => {
                  const driver = findDriverInfoFromId(selectedRider.driver_id);
                  console.log(driver)
                  return driver ? (
                    <>
                      <h5 style={{fontWeight:'bold'}}>السائق</h5>
                      <h5>{driver.name} {driver.family_name}</h5>
                      <h5>{selectedRider.driver_id}</h5>
                    </>              
                  ) : (
                    <h5>--</h5>
                  );
                })()
                ) : (
                  <h5 style={{color:'gray'}}>لا يوجد سائق</h5>
                )}
              </div>
            </div>
          </div>
        </div>       
      )}
    </div>
  )
}

export default Riders