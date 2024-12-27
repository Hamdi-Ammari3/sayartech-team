import React,{useState,useEffect} from 'react'
import Image from 'next/image'
import { updateDoc,doc,writeBatch} from "firebase/firestore"
import { DB } from '../firebaseConfig'
import ClipLoader from "react-spinners/ClipLoader"
import { useGlobalState } from '../globalState'
import { BsArrowLeftShort } from "react-icons/bs"
import { FcDeleteDatabase } from "react-icons/fc";
import { FcCalendar } from "react-icons/fc";
import { Modal, Table } from "antd";
import dayjs from "dayjs";
import { GoogleMap,Marker } from "@react-google-maps/api";
import miniVan from '../images/minivan.png'
import maps from '../images/google-maps.png'
import money from '../images/dollar.png'

const Students = () => {
  const { students,drivers,schools } = useGlobalState()
  const [nameFilter,setNameFilter] = useState('')
  const [schoolFilter,setSchoolFilter] = useState('')
  const [hasDriverFilter,setHasDriverFilter] = useState('')
  const [selectedStudent,setSelectedStudent] = useState(null)
  const [driverInfo, setDriverInfo] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newStudentCarType,setNewStudentCarType] = useState('')
  const [loading,setLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingTimetable, setEditingTimetable] = useState([])
  const [isEditingTimeTable, setIsEditingTimeTable] = useState(false)
  const [isSavingNewTimeTable,setIsSavingNewTimeTable] = useState(false)
  const [selectedDays, setSelectedDays] = useState([])
  const [isModalMapVisible,setIsModalMapVisible] = useState(false)
  const [homeCoords, setHomeCoords] = useState(null)
  const [schoolCoords, setSchoolCoords] = useState(null)
  const [distance, setDistance] = useState(null)
  const [isEditingMonthlyFee,setIsEditingMonthlyFee] = useState(false)
  const [newStudentMonthlyFee,setNewStudentMonthlyFee] = useState(0)
  const [editMonthlyFeeLoading,setEditMonthlyFeeLoading] = useState(false)
  
  // Filtered students based on search term
  const filteredStudents = students.filter((student) =>{
    //check name
    const matchesName = nameFilter === '' || student.student_full_name.includes(nameFilter)

    //check school
    const matchesSchool = schoolFilter === '' || student.student_school === schoolFilter;

    //check he has a driver or not
    const matchesDriver = 
    hasDriverFilter === '' || 
    (hasDriverFilter === 'true' && student.driver_id) || 
    (hasDriverFilter === 'false' && !student.driver_id);

    // Return only students matching all filters
    return matchesName && matchesSchool && matchesDriver;
  });

  // Handle student name change
  const handleNameFilterChange = (event) => {
    setNameFilter(event.target.value);
  };

  // Handle student school change
  const handleSchoolChange = (e) => {
    setSchoolFilter(e.target.value);
  };

  // Handle student has driver change
  const handleHasDriverChange = (e) => {
    setHasDriverFilter(e.target.value);
  };

  // Select the student
  const selectStudent = async (student) => {
    setSelectedStudent(student);
  };

  // Handle back action
  const goBack = () => {
    setSelectedStudent(null);
    setIsEditing(false)
    setIsEditingMonthlyFee(false)
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

  //Find and set driver info when a student is selected
  useEffect(() => {
    if (selectedStudent) {
      const assignedDriver = drivers.find(
        (driver) => String(driver.id) === String(selectedStudent.driver_id)
      );
      setDriverInfo(assignedDriver || null)
      
    }
  }, [selectedStudent, drivers]);

  //Fetch home and school location 
  useEffect(() => {
    if (selectedStudent) {
      const homeLocation = selectedStudent?.student_home_location?.coords;
      const schoolLocation = selectedStudent?.student_school_location;

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
  }, [selectedStudent]);

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

  // Week days
  const daysOfWeek = [
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
    "الأحد",
  ];

  // Car Types
  const carTypes = [
    'سيارة صالون ٥ راكب',
    'سيارة خاصة ٧ راكب',
    'ستاركس',
    'باص صغير ١٢ راكب',
    'باص متوسط ١٤ راكب',
    'باص كبير ٣٠ راكب',
  ]

  //Open Map Modal
  const handleOpenMapModal = () => {
    setIsModalMapVisible(true)
  }

  //Close Map Modal
  const handleCloseMapModal = () => {
    setIsModalMapVisible(false)
  }

  //Open the time-table Modal
  const handleOpenModal = () => {
    setEditingTimetable(
      daysOfWeek.map((day) => {
        const dayData =
          selectedStudent?.school_timetable?.find((t) => t.day === day) || {
            day,
            active: false,
            startTime: null,
            endTime: null,
          };
        return dayData;
      })
    );
    setIsModalVisible(true); // Show the modal
  };
  
  // Close the time-table Calendar
  const handleCloseModal = () => {
    setIsModalVisible(false)
    setIsEditingTimeTable(false)
  };

  // Handle input changes
  const handleInputChange = (value, day, field) => {
    setEditingTimetable((prev) =>
      prev.map((item) => {
        // Update only the specific day being modified
        if (item.day === day) {
          return {
            ...item,
            [field]: value
              ? new Date(`1970-01-01T${value}:00`) // Convert time to a Date object
              : null,
            active: !(value === "00:00" && field === "startTime") && !(value === "00:00" && field === "endTime"),
          };
        }
        return item;
      })
    );
  };
  
  // Save changes to Firestore
  const handleSaveTimetable = async () => {
    setIsSavingNewTimeTable(true)  
    try {
      const studentRef = doc(DB, "students", selectedStudent.id)

      // Save the new timetable to Firestore
      await updateDoc(studentRef, { school_timetable: editingTimetable })

      // Update local state to reflect the new timetable
      setSelectedStudent((prev) => ({
        ...prev,
        school_timetable: editingTimetable,
      }));

      alert("تم تحديث الجدول الدراسي بنجاح!");
      setIsModalVisible(false);
      setSelectedDays([]);
    } catch (error) {
      console.error("Error updating timetable:", error);
      alert("حدث خطأ أثناء تحديث الجدول الدراسي. حاول مرة أخرى.");
    } finally {
      setIsSavingNewTimeTable(false)
    }
  };

  //Edit Student car type 
  const editStudentData = async() => {
    if (!newStudentCarType) {
      alert("الرجاء اختيار نوع السيارة");
      return;
    }
    setLoading(true)
    try {
      const studentRef = doc(DB, "students", selectedStudent.id);
      await updateDoc(studentRef, {
        student_car_type: newStudentCarType, // Update only the car type
      });

      alert("تم تعديل نوع السيارة بنجاح!");

      // Update the local state
      setSelectedStudent((prev) => ({
        ...prev,
        student_car_type: newStudentCarType,
      }));

      // Clear the selection
      setNewStudentCarType("")
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating student car type:", error);
      alert("فشل في تعديل نوع السيارة. الرجاء المحاولة مرة أخرى.");
    } finally {
      setLoading(false)
    }
  }

  //Edit student monthly fee
  const editStudentMonthlyFee = async () => {
    if (newStudentMonthlyFee < 0) {
      alert("الرجاء ادخال مبلغ مالي صحيح");
      return;
    }

    setEditMonthlyFeeLoading(true);

    try {
      const studentRef = doc(DB, "students", selectedStudent.id);

      await updateDoc(studentRef, {
        monthly_sub: Number(newStudentMonthlyFee),
      });

      alert("تم اضافة المبلغ المالي بنجاح");

      // Update the local state
      setSelectedStudent((prev) => ({
        ...prev,
        monthly_sub: newStudentMonthlyFee,
      }));
      setNewStudentMonthlyFee(0)
      setIsEditingMonthlyFee(false)
    } catch (error) {
      console.error("Error updating the monthly subscription fee:", error);
      alert("حدث خطا. الرجاء المحاولة مرة ثانية");
    } finally {
      setEditMonthlyFeeLoading(false)
    }
  }

  //Delete student document from DB
  const handleDelete = async (studentId) => {
    if (isDeleting) return;

    const confirmDelete = window.confirm("هل تريد بالتأكيد حذف هذا الطالب");
    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      const batch = writeBatch(DB);
      const studentRef = doc(DB, 'students', studentId);
      
      const driverId = selectedStudent.driver_id;

      batch.delete(studentRef);

      // If the student has an assigned driver, update the driver's assigned_students array
      if (driverId) {
        const driverRef = doc(DB, "drivers", driverId);

        // Fetch the driver's data to get the assigned_students array
          const updatedAssignedStudents = driverInfo.assigned_students.filter(student => student.id !== studentId);
          //Update the driver's assigned_students field
          batch.update(driverRef, {
            assigned_students: updatedAssignedStudents,
          });
      }

      //Commit the batch
      await batch.commit();

      alert("تم الحذف بنجاح");
    } catch (error) {
      console.error("خطأ أثناء الحذف:", error);
      alert("حدث خطأ أثناء الحذف. حاول مرة أخرى.");
    } finally {
      setIsDeleting(false);
      setSelectedStudent(null)
    }
  };

  return (
    <div className='white_card-section-container'>
      {selectedStudent ? (
        <>
          <div className="item-detailed-data-container">

            <div className="item-detailed-data-header">
              <div className='item-detailed-data-header-title'>
                <h5>{selectedStudent.student_phone_number || '-'}</h5>
                <h5 style={{marginLeft:'5px',marginRight:'5px'}}>-</h5>
                <h5 style={{marginRight:'4px'}}>{selectedStudent.student_family_name}</h5>
                <h5>{selectedStudent.student_parent_full_name || selectedStudent.student_full_name}</h5>
              </div>
              <button className="info-details-back-button" onClick={goBack}>
                <BsArrowLeftShort size={24}/>
              </button>
            </div>

            <div className="item-detailed-data-main">

              <div className="student-detailed-data-main-firstBox">
                  <div>
                    <h5 style={{marginLeft:'4px'}}>{selectedStudent.student_full_name}</h5>
                    <h5 style={{marginLeft:'4px'}}>-</h5>
                    <h5 style={{marginLeft:'4px'}}>{selectedStudent.student_birth_date ? calculateAge(selectedStudent.student_birth_date) : '-'}</h5>
                    <h5 style={{marginLeft:'10px'}}>سنة</h5>
                    <button className="student-edit-car-type-btn" onClick={handleOpenMapModal}>
                      <Image src={maps} width={16} height={16} alt='maps'/>
                    </button>
                    {/* Student Map Modal */}
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
                    <h5 style={{marginLeft:'5px'}}>{selectedStudent.student_school || '-'}</h5>
                    <button className="student-edit-car-type-btn" onClick={handleOpenModal}>
                      <FcCalendar size={24}/>
                    </button>
                    {/* Timetable Modal */}
                    <Modal
                      title="الجدول الدراسي"
                      open={isModalVisible}
                      onCancel={handleCloseModal}
                      footer={[
                        <button 
                          key="cancel" 
                          onClick={handleCloseModal}
                          disabled={isSavingNewTimeTable}
                          className='cancel-time-table-button'
                          style={{border:'1px solid #955BFE',color:'#955BFE',backgroundColor:'#fff'}}
                        >
                          إلغاء
                        </button>,
                        <button
                          key="save"
                          onClick={handleSaveTimetable}
                          disabled={isSavingNewTimeTable}
                          className='save-time-table-button'
                          style={{backgroundColor:'#955BFE',border:'none',color:'#fff',marginLeft:'10px'}}
                        >
                          {isSavingNewTimeTable ? (
                            <div style={{ width:'60px',padding:'3px 0px',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <ClipLoader
                                color={'#fff'}
                                loading={isSavingNewTimeTable}
                                size={10}
                                aria-label="Loading Spinner"
                                data-testid="loader"
                              />
                            </div>
                          ) : (
                            "حفظ"
                          )}
                        </button>,
                      ]}
                      centered
                    >
                      <Table
                        dataSource={editingTimetable}
                        columns={[
                          {
                            title: "تعديل",
                            key: "select",
                            render: (_, record) => (
                              <input
                                type="checkbox"
                                checked={selectedDays.includes(record.day)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDays((prev) => [...prev, record.day]);
                                  } else {
                                    setSelectedDays((prev) =>
                                      prev.filter((day) => day !== record.day)
                                    );
                                  }
                                }}
                              />
                            ),
                          },
                          {
                            title: "وقت النهاية",
                            dataIndex: "endTime",
                            key: "endTime",
                            render: (time, record) =>
                              record.day === isEditingTimeTable || selectedDays.includes(record.day) ? (
                                <input
                                  type="time"
                                  value={
                                    time ? dayjs(time.seconds ? time.toDate() : time).format("HH:mm") : ""
                                  }
                                  onChange={(e) =>
                                    handleInputChange(e.target.value, record.day, "endTime")
                                  }
                                />
                              ) : record.active && time ? (
                                dayjs(time.seconds ? time.toDate() : time).format("HH:mm")
                              ) : (
                                "-"
                              ),
                          },
                          {
                            title: "وقت البداية",
                            dataIndex: "startTime",
                            key: "startTime",
                            render: (time, record) =>
                              record.day === isEditingTimeTable || selectedDays.includes(record.day) ? (
                                <input
                                  type="time"
                                  value={
                                    time ? dayjs(time.seconds ? time.toDate() : time).format("HH:mm") : ""
                                  }
                                  onChange={(e) =>
                                    handleInputChange(e.target.value, record.day, "startTime")
                                  }
                                />
                              ) : record.active && time ? (
                                dayjs(time.seconds ? time.toDate() : time).format("HH:mm")
                              ) : (
                                "-"
                              ),
                          },
                          {
                            title: "اليوم",
                            dataIndex: "day",
                            key: "day",
                          },
                        ]}
                        rowKey="day"
                        pagination={false}
                      />
                    </Modal>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'4px'}}>{selectedStudent.student_home_address || '-'}</h5>
                    <h5 style={{marginLeft:'4px'}}>-</h5>
                   <h5>{selectedStudent.student_street || '-'}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'4px'}}>{selectedStudent.student_city || '-'}</h5>
                    <h5 style={{marginLeft:'4px'}}>-</h5>
                    <h5>{selectedStudent.student_state || '-'}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'10px'}}>{selectedStudent.student_car_type || '-'}</h5>
                    {isEditing ? (
                      <div className='student-edit-car-type'>
                        <select
                          value={newStudentCarType}
                          onChange={(e) => setNewStudentCarType(e.target.value)}
                        >
                          <option value=''>--</option>
                          {carTypes.map(car => (
                            <option key={car} value={car}>
                              {car}
                            </option>
                          ))}
                        </select>
                        <>
                          {loading ? (
                            <div style={{ width:'50px',height:'32px',margin:'0px 0px 0px 5px',backgroundColor:' #955BFE',padding:'0px',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <ClipLoader
                                color={'#fff'}
                                loading={loading}
                                size={10}
                                aria-label="Loading Spinner"
                                data-testid="loader"
                              />
                            </div>
                          ) : (
                            <button style={{width:'50px',marginLeft:'5px',padding:'7px'}} onClick={() => editStudentData()}>تعديل</button>
                          )}
                        </>
                        <button onClick={() => setIsEditing(false)} style={{width:'50px',padding:'7px',border:'1px solid #955BFE',color:'#955BFE',backgroundColor:'#fff'}} className='cancel-time-table-button'>الغاء</button>
                      </div>
                    ) : (
                      <button className="student-edit-car-type-btn" onClick={() => setIsEditing(true)}>
                        <Image src={miniVan} width={22} height={22} alt='minivan'/>
                      </button>
                    )}
                    
                  </div>
                  <div>
                    <h5 style={{marginLeft:'5px'}}>
                      {selectedStudent.monthly_sub ? Number(selectedStudent.monthly_sub).toLocaleString('en-US') : '0'}
                    </h5>
                    <h5 style={{marginLeft:'10px'}}>دينار</h5>
                    {isEditingMonthlyFee ? (
                      <div className='student-edit-car-type'>
                        <input 
                          value={newStudentMonthlyFee}
                          onChange={(e) => setNewStudentMonthlyFee(e.target.value)}
                          type='number'/>
                        <>
                          {editMonthlyFeeLoading ? (
                            <div style={{ width:'50px',height:'32px',margin:'0px 0px 0px 5px',backgroundColor:' #955BFE',padding:'0px',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <ClipLoader
                                color={'#fff'}
                                loading={editMonthlyFeeLoading}
                                size={10}
                                aria-label="Loading Spinner"
                                data-testid="loader"
                              />
                            </div>
                          ) : (
                            <button style={{width:'50px',marginLeft:'5px',padding:'7px'}} onClick={() => editStudentMonthlyFee()}>تعديل</button>
                          )}
                        </>
                        <button onClick={() => setIsEditingMonthlyFee(false)} style={{width:'50px',padding:'7px',border:'1px solid #955BFE',color:'#955BFE',backgroundColor:'#fff'}} className='cancel-time-table-button'>الغاء</button>
                      </div>
                    ) : (
                    <button className="student-edit-car-type-btn" onClick={() => setIsEditingMonthlyFee(true)}>
                      <Image src={money} width={18} height={18} alt='money'/>
                    </button>
                    )}
                  </div>
                  <div>
                    <h5>{selectedStudent.id}</h5>
                  </div>
                  <div>
                    <button 
                      className="assinged-item-item-delete-button" 
                      onClick={() => handleDelete(selectedStudent.id)}
                      disabled={isDeleting}
                    >
                      <FcDeleteDatabase size={24} />
                    </button>
                  </div>
                
              </div>

              <div className="student-detailed-data-main-second-box">
                <div className="item-detailed-data-main-second-box-content">
                  {driverInfo ? (
                    <div>
                      <div className="eligible-item-item">
                        <h5 style={{marginLeft:'4px'}}>{driverInfo.driver_full_name || '-'}</h5>
                        <h5 style={{marginLeft:'10px'}}>{driverInfo.driver_family_name || '-'}</h5>
                        <h5 style={{marginLeft:'10px'}}>-</h5>
                        <h5>{driverInfo.driver_phone_number || '-'}</h5>
                      </div>
                      <div className="eligible-item-item">
                        <h5>{driverInfo.driver_car_type || '-'}</h5>
                      </div>
                      <div className="eligible-item-item">
                        <h5 style={{marginLeft:'10px'}}>موديل</h5>
                        <h5>{driverInfo.driver_car_model || '-'}</h5>
                      </div>
                      <div className="eligible-item-item">
                        <h5 style={{marginLeft:'10px'}}>رقم لوحة</h5>
                        <h5>{driverInfo.driver_car_plate || '-'}</h5>
                      </div>                      
                    </div>
                  ) : (
                    <div>
                      <h5>لا يوجد سائق</h5>
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
              <input 
                onChange={handleNameFilterChange} 
                value={nameFilter}
                placeholder='الاسم' 
                type='text' 
                className='students-section-inner-title_search_input' 
              />
            </div>
            <div className='students-section-inner-title'>
              <select onChange={handleSchoolChange} value={schoolFilter}>
                <option value=''>المدرسة</option>
                {schools.map(school => (
                  <option key={school.id} value={school.name}>{school.name}</option>
                ))}
              </select>
            </div>
            <div className='students-section-inner-title'>
              <select onChange={handleHasDriverChange} value={hasDriverFilter}>
              <option value=''>لديه سائق</option>
                <option value={true}>نعم</option>
                <option value={false}>لا</option>
              </select>
            </div>
          </div>
          <div className='all-items-list'>
            {filteredStudents.map((student, index) => (
              <div key={index} onClick={() => selectStudent(student)} className='single-item' >
                <h5>{student.student_full_name}</h5>
                <h5>{student.student_school}</h5>
                <h5 className={student.driver_id ? 'student-has-driver' : 'student-without-driver'}>{student.driver_id ? 'نعم' : 'لا'}</h5>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Students