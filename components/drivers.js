import React,{useState,useEffect,useMemo} from 'react'
import { doc,arrayUnion,writeBatch } from "firebase/firestore"
import { DB } from '../firebaseConfig'
import ClipLoader from "react-spinners/ClipLoader"
import { useGlobalState } from '../globalState'
import { BsArrowLeftShort } from "react-icons/bs"
import { FcDeleteDatabase } from "react-icons/fc";
import { FcCancel } from "react-icons/fc";
import { FaCaretUp } from "react-icons/fa6"
import { FaCaretDown } from "react-icons/fa6"

const  Drivers = () => {
  const { drivers,students } = useGlobalState()

  const [driverNameFilter, setDriverNameFilter] = useState('')
  const [carTypeFilter, setCarTypeFilter] = useState('')
  const [ratingSortDirection, setRatingSortDirection] = useState(null)
  const [selectedDriver,setSelectedDriver] = useState(null)
  const [assignedStudents, setAssignedStudents] = useState([])
  const [eligibleStudents, setEligibleStudents] = useState([])
  const [showEligible, setShowEligible] = useState(true)
  const [loading,setLoading] = useState(false)
  const [studentNameFilter, setStudentNameFilter] = useState("")
  const [studentSchoolFilter, setStudentSchoolFilter] = useState("")
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filtered drivers based on search term
  const filteredDrivers = drivers.filter((driver) => {
    // Filter by name
    const matchesName = driverNameFilter === '' || driver.driver_full_name.includes(driverNameFilter)

    // Filter by car type
    const matchesCarType = carTypeFilter === '' || driver.driver_car_type === carTypeFilter;
    return matchesName && matchesCarType;
  })
  .map((driver) => {
    // Calculate average rating (round to the nearest integer)
    const totalRating = driver.rating.reduce((sum, r) => sum + r, 0);
    const avgRating = driver.rating.length > 0 ? Math.round(totalRating / driver.rating.length) : '-';
    return { ...driver, avgRating };
  })
  .sort((a, b) => {
    // Sort by rating
    if (ratingSortDirection === 'asc') {
      return a.avgRating === '-' ? 1 : b.avgRating === '-' ? -1 : a.avgRating - b.avgRating;
    } else if (ratingSortDirection === 'desc') {
      return a.avgRating === '-' ? 1 : b.avgRating === '-' ? -1 : b.avgRating - a.avgRating;
    }
    return 0; // No sorting if direction is null
  });
    
  const handleNameChange = (e) => {
    setDriverNameFilter(e.target.value);
  };

  const handleCarTypeChange = (e) => {
    setCarTypeFilter(e.target.value);
  };

  const handleSortByHighestRating = () => {
    setRatingSortDirection('desc');
  };
  
  const handleSortByLowestRating = () => {
    setRatingSortDirection('asc');
  };

  // Rating color based on rating score
  const getRatingClassName = (rating) => {
    if (rating === undefined || rating === null || rating === 0) {
      return 'no-rating';
    }
    if (rating > 0 && rating < 3) {
      return 'low-rating';
    }
    if (rating >= 3 && rating < 4) {
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
  }, [selectedDriver]);

  // Fetch assigned students
  const fetchAssignedStudents = async () => {
    try {
      setLoading(true);

      const assignedStudentIds = selectedDriver.assigned_students.map(student => student.id) || [];

      // Fetch all students and filter by the assigned IDs
      const assigned = students.filter(student => assignedStudentIds.includes(student.id));
      setAssignedStudents(assigned);

    } catch (error) {
      console.error("Error fetching assigned students:", error);
      alert("Failed to fetch assigned students. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Eligible Students
  const filterEligibleStudents = () => {
    const eligible = students
      .filter(
        (student) =>
          !student.driver_id && // Student has no driver assigned
          student.student_car_type.trim() === selectedDriver.driver_car_type.trim() // Match car type
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
  const assignStudentToDriverHandler = async (student,driverId) => {
    setLoading(true)
    try {
      const driverRef = doc(DB, "drivers", driverId);
      const studentRef = doc(DB, "students", student.id);

      // Extract latitude and longitude from the nested home_location object
      const homeCoords = student.student_home_location?.coords || {};

      const studentInfo = {
        birth_date:student.student_birth_date,
        checked_in_front_of_school: false,
        dropped_off: false,
        family_name:student.student_family_name,
        home_address: student.student_home_address || '',
        home_location: {
          latitude: homeCoords.latitude || null,
          longitude: homeCoords.longitude || null,
        },
        id:student.id,
        name: student.student_full_name || 'Unknown',
        notification_token:student.student_user_notification_token,
        phone_number:student.student_phone_number,
        picked_from_school: false,
        picked_up: false,
        school_location: {
          latitude: student.student_school_location.latitude || null,
          longitude: student.student_school_location.longitude || null,
        },
        school_name:student.student_school,
        student_state:student.student_state,
        student_street:student.student_street,  
        tomorrow_trip_canceled: false,
      };

      // Use writeBatch for atomic updates
      const batch = writeBatch(DB);

      // Update the driver's assigned_students field
      batch.update(driverRef, {
        assigned_students: arrayUnion(studentInfo),
      });

      // Update the student's driver_id field
      batch.update(studentRef, {
        driver_id: driverId,
      });

      // Commit the batch
      await batch.commit();

      // Update the local state for selectedDriver
      setSelectedDriver((prevDriver) => ({
        ...prevDriver,
        assigned_students: [...(prevDriver.assigned_students || []), studentInfo],
      }));

      alert("Student successfully assigned to the driver!");

    } catch (error) {
      console.error("Error assigning student to driver:", error);
      alert("Failed to assign student. Please try again.");
    } finally{
      setLoading(false)
      setStudentNameFilter("")
    }
  }

  // Delete connection between driver and student
  const deleteStudentFromAssignedHandler = async(studentId,driverId) => {
    setLoading(true)
    try {
      const driverRef = doc(DB, "drivers", driverId);
      const studentRef = doc(DB, "students", studentId);

      // Filter out the student with the matching ID
      const assignedStudents = selectedDriver.assigned_students || [];
      const updatedAssignedStudents = assignedStudents.filter(student => student.id !== studentId);

      // Use writeBatch for atomic updates
      const batch = writeBatch(DB);

      // Update the driver's assigned_students field
      batch.update(driverRef, {
        assigned_students: updatedAssignedStudents,
      });

      // Reset the student's driver_id field
      batch.update(studentRef, {
        driver_id: null,
      });

      // Commit the batch
      await batch.commit();

      alert("تم الغاء الربط بنجاح");

    } catch (error) {
      console.error("Error removing student from driver:", error);
      alert("خطا اثناء محاولة الالغاء. الرجاء المحاولة مرة ثانية");
    } finally{
      setLoading(false)
    }
  }

  //Delete driver document from DB
  const handleDelete = async () => {
    if (isDeleting) return;

    const confirmDelete = window.confirm("هل تريد بالتأكيد حذف هذا السائق");
    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      const { id, assigned_students } = selectedDriver;
      const batch = writeBatch(DB);

      // Update each student's driver_id field to null
      (assigned_students || []).forEach((student) => {
        const studentRef = doc(DB, "students", student.id);
        batch.update(studentRef, { driver_id: null });
      });

      // Delete the driver document
      const driverRef = doc(DB, "drivers", id);
      batch.delete(driverRef);

      // Commit the batch update
      await batch.commit();

      alert("تم الحذف بنجاح، وتم تحديث بيانات الطلاب المرتبطين بالسائق.");
    } catch (error) {
      console.error("خطأ أثناء الحذف:", error);
      alert("حدث خطأ أثناء الحذف. حاول مرة أخرى.");
    } finally {
      setIsDeleting(false);
      setSelectedDriver(null)
    }
  };


  return (
    <div className='white_card-section-container'>
      {selectedDriver ? (
        <>
          <div className="item-detailed-data-container">
            <div className='item-detailed-data-header'>
              <div className='item-detailed-data-header-title'>
                <h5 style={{marginRight:'3px'}}>{selectedDriver.driver_family_name}</h5>
                <h5>{selectedDriver.driver_full_name}</h5>
              </div>
              <button className="info-details-back-button" onClick={goBack}>
                <BsArrowLeftShort size={24}/>
              </button>
            </div>
            <div className="item-detailed-data-main">

              <div className="item-detailed-data-main-firstBox">
                  <div>
                    <h5>{selectedDriver.driver_car_type || '-'}</h5>
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
                    <h5>{selectedDriver.id}</h5>
                  </div>
                  <div>
                    <button 
                      className="assinged-item-item-delete-button" 
                      onClick={() => handleDelete(selectedDriver.id)}
                      disabled={isDeleting}
                    >
                      <FcDeleteDatabase size={24} />
                    </button>
                  </div>
              </div>

              <div className="item-detailed-data-main-second-box">
                <div className="item-detailed-data-main-second-box-insider">
                <div className='item-detailed-data-main-second-box-buttons-div'>
                  <button 
                    onClick={() => setShowEligible(false)}
                    className={!showEligible ? 'showEligibleBtnActive': 'showEligibleBtn'}
                  > 
                    <h5 style={{fontSize:'14px',fontWeight:'700',marginLeft:'5px'}}>الطلاب المسجلين</h5>
                    <h5 style={{fontSize:'14px',fontWeight:'700'}}>{assignedStudents.length}</h5>
                  </button>
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
                                onClick={() => assignStudentToDriverHandler(elig,selectedDriver.id)}
                              >ربط الحساب بسائق</button>
                            )}               
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>
                  ) : (
                    <div className="assinged-item-container">
                      {assignedStudents.length > 0 ? (
                        <>
                          {assignedStudents.map(assign => (
                            <div key={assign.id} className="assinged-item-box">
                              <div className="assinged-item-item">
                                <h5 style={{marginLeft:'4px'}}>{assign.student_full_name}</h5>
                                <h5>{assign.student_family_name}</h5>
                              </div>
                              <div className="assinged-item-item">
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
                                    className="assinged-item-item-delete-button" 
                                    onClick={() => deleteStudentFromAssignedHandler(assign.id,selectedDriver.id)}
                                  >
                                    <FcCancel size={24} />
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
          </div>   
        </>
      ) : (
        <div className='students-section-inner'>
          <div className='students-section-inner-titles'>
            <div className='students-section-inner-title'>
              <input 
                onChange={handleNameChange} 
                value={driverNameFilter}
                placeholder='الاسم' 
                type='text' 
                className='students-section-inner-title_search_input'/>
            </div>
            <div className='students-section-inner-title'>
              <select
                onChange={handleCarTypeChange}
                value={carTypeFilter}
              >
                <option value=''>نوع السيارة</option>
                <option value='ستاركس'>ستاركس</option>
                <option value='سيارة صالون ٥ راكب'>سيارة صالون ٥ راكب</option>
                <option value='سيارة خاصة ٧ راكب'>سيارة خاصة ٧ راكب</option>
                <option value='باص صغير ١٢ راكب'>باص صغير ١٢ راكب</option>
                <option value='باص متوسط ١٤ راكب'>باص متوسط ١٤ راكب</option>
                <option value='باص كبير ٣٠ راكب'>باص كبير ٣٠ راكب</option>
              </select>
            </div>
            <div className='students-section-inner-title'>
              <div className='driver-rating-box'>
                <button onClick={handleSortByLowestRating}>
                  <FaCaretDown 
                    size={18} 
                    className={ratingSortDirection === 'asc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}/>
                </button>
                <h5>التقييم</h5>
                <button onClick={handleSortByHighestRating}>
                  <FaCaretUp 
                    size={18}
                    className={ratingSortDirection === 'desc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}/>
                </button>
              </div>
            </div>
          </div>
          <div className='all-items-list'>
            {filteredDrivers.map((driver, index) => (
              <div key={index} onClick={() => selectDriver(driver)} className='single-item'>
                <h5>{`${driver.driver_full_name} ${driver.driver_family_name}`}</h5>
                <h5>{driver.driver_car_type}</h5>
                <h5 className={getRatingClassName(driver.avgRating)}>{driver.avgRating === '-' ? '-' : driver.avgRating}</h5>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Drivers