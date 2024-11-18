import React,{useState,useEffect,useMemo} from 'react'
import { updateDoc,doc,arrayUnion,arrayRemove } from "firebase/firestore"
import { DB } from '../firebaseConfig'
import ClipLoader from "react-spinners/ClipLoader"
import { useGlobalState } from '../globalState'
import { BsArrowLeftShort } from "react-icons/bs"
import { MdDeleteOutline } from "react-icons/md";

const  Drivers = () => {
  const { drivers,students } = useGlobalState()

  const [searchTerm,setSearchTerm] = useState('')
  const [selectedDriver,setSelectedDriver] = useState(null)
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [showEligible, setShowEligible] = useState(true); // Toggle between views
  const [loading,setLoading] = useState(false)
  const [studentNameFilter, setStudentNameFilter] = useState("");
  const [studentSchoolFilter, setStudentSchoolFilter] = useState("");
  
  // Filtered drivers based on search term
  const filteredDrivers = drivers.filter((driver) => {
    return(
      driver.driver_full_name.includes(searchTerm) 
    )
  })
    
  // Handle search input change
   const handleSearchChange = (event) => {
    setSearchTerm(event.target.value)
  }

  // Rating color based on rating score
  const getRatingClassName = (rating) => {
    if (rating === undefined || rating === null || rating === 0) {
      return 'no-rating';
    }
    if (rating > 0 && rating < 2) {
      return 'low-rating';
    }
    if (rating >= 2 && rating < 4) {
      return 'medium-rating';
    }
    if (rating >= 4) {
      return 'high-rating';
    }
  };

  // Select the driver
  const selectDriver = async (driver) => {
    setSelectedDriver(driver);
  };

  // Handle back action
  const goBack = () => {
    setSelectedDriver(null);
  };

  // Get unique school options dynamically from eligibleStudents
  const schoolOptions = useMemo(() => {
    const uniqueSchools = new Set(eligibleStudents.map((student) => student.student_school));
    return Array.from(uniqueSchools);
  }, [eligibleStudents]);

  //Update data whenever the driver data changes
  useEffect(() => {
    if (selectedDriver) {
      fetchAssignedStudents();
      filterEligibleStudents();
    }
  }, [selectedDriver,students]);


  //Fetch assigned students
    const fetchAssignedStudents = () => {
    const assigned = students
      .filter(
        (student) => 
          student.driver_id === selectedDriver.driver_user_id
      )
      setAssignedStudents(assigned)
  }

  // Fetch Eligible Students
  const filterEligibleStudents = () => {
    const availableSeats = selectedDriver.driver_car_seats - (selectedDriver.assigned_students?.length || 0);

    const eligible = students
      .filter(
        (student) =>
          !student.driver_id && // Student has no driver assigned
          student.student_car_type === selectedDriver.driver_car_type // Match car type
      )

    setEligibleStudents(eligible);
  };

  // Filter eligible students dynamically
  const filteredEligibleStudents = useMemo(() => {
    return eligibleStudents.filter((student) => {

      // Handle student name filtering (first or family name)
      const nameFilter = studentNameFilter.trim()
      const matchesName =
        student.student_full_name.includes(nameFilter) ||
        student.student_family_name.includes(nameFilter);

      // Handle school filtering
      const matchesSchool =
      !studentSchoolFilter || student.student_school === studentSchoolFilter;

      return matchesName && matchesSchool;
    });
  }, [studentNameFilter, studentSchoolFilter, eligibleStudents]);

  //Connect student with driver
  const assignStudentToDriverHandler = async (studentId,driverId,driverUserId) => {
    setLoading(true)
    try {
      const driverRef = doc(DB, "drivers", driverId);
      const studentRef = doc(DB, "students", studentId);

      // Update the driver's assigned_students field
      await updateDoc(driverRef, {
        assigned_students: arrayUnion(studentId), // Add student ID to assigned_students array
      });

       // Update the student's driver_id field
      await updateDoc(studentRef, {
        driver_id: driverUserId, // Set the driver's ID in the student's document
      });

      alert("Student successfully assigned to the driver!");

    } catch (error) {
      console.error("Error assigning student to driver:", error);
      alert("Failed to assign student. Please try again.");
    } finally{
      setLoading(false)
    }
  }

  const deleteStudentFromAssignedHandler = async(studentId,driverId) => {
    setLoading(true)
    try {
      const driverRef = doc(DB, "drivers", driverId);
      const studentRef = doc(DB, "students", studentId);

      // Remove the student ID from the driver's assigned_students array
      await updateDoc(driverRef, {
        assigned_students: arrayRemove(studentId), // Remove student ID
      });

      // Reset the student's driver_id field
      await updateDoc(studentRef, {
        driver_id: null, // Clear the driver's ID from the student's document
      });

      alert("Student successfully removed from the driver's assigned list!");

    } catch (error) {
      console.error("Error removing student from driver:", error);
      alert("Failed to remove student. Please try again.");
    } finally{
      setLoading(false)
    }
  }


  return (
    <div className='white_card-section-container'>
      {selectedDriver ? (
        <>
          <button className="info-details-back-button" onClick={goBack}>
            <BsArrowLeftShort size={24}/>
          </button>
          <div className="item-detailed-data-container">
            <div className='item-detailed-data-header'>
              <h5 style={{marginRight:'3px'}}>{selectedDriver.driver_family_name}</h5>
              <h5>{selectedDriver.driver_full_name}</h5>
            </div>
            <div className="item-detailed-data-main">

              <div className="item-detailed-data-main-firstBox">
                <div className="item-detailed-data-main-firstBox-insider">
                  <div>
                    <h5>{selectedDriver.driver_car_type}</h5>
                  </div>
                  <div>
                    <h5>{selectedDriver.driver_phone_number || '-'}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'10px'}}>موديل السيارة</h5>
                    <h5>{selectedDriver.driver_car_model || '-'}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'10px'}}>لوحة السيارة</h5>
                    <h5>{selectedDriver.driver_car_plate || '-'}</h5>
                  </div>
                  <div>
                    <h5>{selectedDriver.driver_user_id || '-'}</h5>
                  </div>
                </div>
              </div>

              <div className="item-detailed-data-main-second-box">
                <div className='item-detailed-data-main-second-box-buttons-div'>
                  <button 
                    onClick={() => setShowEligible(false)}
                    className={!showEligible ? 'showEligibleBtnActive': 'showEligibleBtn'}
                  >الطلاب المسجلين</button>
                  <button 
                    onClick={() => setShowEligible(true)}
                    className={showEligible ? 'showEligibleBtnActive': 'showEligibleBtn'}
                  >اضافة طلاب</button>
                </div>
                <div className='item-detailed-data-main-second-box-content'>
                  {showEligible ? (
                    <div className="eligible-item-container">
                      <div className="eligible-item-filter-input">
                        <input 
                          placeholder='اسم الطالب'
                          value={studentNameFilter}
                          onChange={(e) => setStudentNameFilter(e.target.value)}
                        />
                        <select
                          value={studentSchoolFilter}
                          onChange={(e) => setStudentSchoolFilter(e.target.value)}
                        >
                          <option value='' >المدرسة</option>
                          {schoolOptions.map((school) => (
                            <option key={school} value={school}>
                              {school}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className='eligible-item-boxes-container'>
                      {filteredEligibleStudents.map(elig => (
                        <div key={elig.id} className='eligible-item-box'>
                          <div className="eligible-item-item">
                            <h5 style={{marginLeft:'4px'}}>{elig.student_full_name}</h5>
                            <h5>{elig.student_family_name}</h5>
                          </div>
                          <div className="eligible-item-item">
                            <h5>{elig.student_school}</h5>
                          </div>
                          <div className="eligible-item-item">
                            <h5>{elig.student_home_address} - {elig.student_street} </h5>
                          </div>
                          <div className="eligible-item-item">
                            <h5>{elig.student_city} - {elig.student_state}</h5>
                          </div>
                          <div className="eligible-item-item">
                            {loading ? (
                              <div style={{ width:'250px',padding:'12px 0',backgroundColor:'#955BFE',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <ClipLoader
                                  color={'#fff'}
                                  loading={loading}
                                  size={10}
                                  aria-label="Loading Spinner"
                                  data-testid="loader"
                                />
                              </div>
                            ) : (
                              <button 
                                className="eligible-item-box-btn"
                                onClick={() => assignStudentToDriverHandler(elig.id,selectedDriver.id,selectedDriver.driver_user_id)}
                              >ربط الحساب بسائق</button>
                            )}               
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>
                  ) : (
                    <div className="eligible-item-container">
                      {assignedStudents.length > 0 ? (
                        <>
                          {assignedStudents.map(assign => (
                            <div key={assign.id} className="eligible-item-box">
                              <div className="eligible-item-item">
                                <h5 style={{marginLeft:'4px'}}>{assign.student_full_name}</h5>
                                <h5>{assign.student_family_name}</h5>
                             </div>
                              <div className="eligible-item-item">
                                <h5>{assign.student_school}</h5>
                              </div>
                              <div>
                                {loading ? (
                                  <div style={{ width:'250px',padding:'12px 0',backgroundColor:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                    <ClipLoader
                                      color={'#955BFE'}
                                      loading={loading}
                                      size={10}
                                      aria-label="Loading Spinner"
                                      data-testid="loader"
                                    />
                                  </div>
                                ) : (
                                  <button 
                                    className="info-details-back-button" 
                                    onClick={() => deleteStudentFromAssignedHandler(assign.id,selectedDriver.id)}
                                  >
                                    <MdDeleteOutline size={24} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div>
                          <h5>لا يوجد طلاب مع هذا السائق</h5>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>   
        </>
      ) : (
        <div className='students-section-inner'>
          <div className='students-section-inner-titles'>
            <div className='students-section-inner-title'>
              <input onChange={handleSearchChange} placeholder='الاسم' type='text' className='students-section-inner-title_search_input'/>
            </div>
            <div className='students-section-inner-title'>
              <h5>نوع السيارة</h5>
            </div>
            <div className='students-section-inner-title'>
              <h5>التقييم</h5>
            </div>
          </div>
          <div className='all-items-list'>
            {filteredDrivers.map((driver, index) => (
              <div key={index} onClick={() => selectDriver(driver)} className='single-item'>
                <h5>{`${driver.driver_full_name} ${driver.driver_family_name}`}</h5>
                <h5>{driver.driver_car_type}</h5>
                <h5 className={getRatingClassName(driver.rating)}>{driver.rating || '-' }</h5>
              </div>
            ))}
          </div> 
        </div>
      )}
    </div>
  )
}

export default Drivers