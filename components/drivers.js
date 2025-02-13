import React,{useState} from 'react'
import Image from 'next/image'
import { doc,getDoc,writeBatch,Timestamp,updateDoc } from "firebase/firestore"
import { DB } from '../firebaseConfig'
import ClipLoader from "react-spinners/ClipLoader"
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'
import { Modal } from "antd"
import { v4 as uuidv4 } from "uuid"
import { useGlobalState } from '../globalState'
import { BsArrowLeftShort } from "react-icons/bs"
import { FcDeleteDatabase } from "react-icons/fc"
import { FcCancel } from "react-icons/fc"
import { FaCaretUp } from "react-icons/fa6"
import { FaCaretDown } from "react-icons/fa6"
import { FaPlus } from "react-icons/fa6";
import { FiPlusSquare } from "react-icons/fi"
import imageNotFound from '../images/NoImage.jpg'
import { FiEdit2 } from "react-icons/fi"
import { FcOk } from "react-icons/fc"

const  Drivers = () => {
  const { drivers,schools } = useGlobalState()

  // Define the default line time table
  const defaultTimeTable = [
    { day: "sunday", arabic_day: "الأحد", startTime: null, active: false },
    { day: "monday", arabic_day: "الاثنين", startTime: null, active: false },
    { day: "tuesday", arabic_day: "الثلاثاء", startTime: null, active: false },
    { day: "wednesday", arabic_day: "الأربعاء", startTime: null, active: false },
    { day: "thursday", arabic_day: "الخميس", startTime: null, active: false },
    { day: "friday", arabic_day: "الجمعة", startTime: null, active: false },
    { day: "saturday", arabic_day: "السبت", startTime: null, active: false }
  ];

  const [driverNameFilter, setDriverNameFilter] = useState('')
  const [carTypeFilter, setCarTypeFilter] = useState('')
  const [ratingSortDirection, setRatingSortDirection] = useState(null)
  const [selectedDriver,setSelectedDriver] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddingNewLineModalOpen,setIsAddingNewLineModalOpen] = useState(false)
  const [lineName,setLineName] = useState('')
  const [lineSchool,setLineSchool] = useState('')
  const [lineSchoolLocation, setLineSchoolLocation] = useState(null);
  const [lineTimeTable, setLineTimeTable] = useState(defaultTimeTable)
  const [firstDayTimeSelected, setFirstDayTimeSelected] = useState(null)
  const [editingDayTime, setEditingDayTime] = useState(null)
  const [newDayTime, setNewDayTime] = useState(null)
  const [addingNewLineLoading,setAddingNewLineLoading] = useState(false)
  const [isOpeningLineInfoModal,setIsOpeningLineInfoModal] = useState(false)
  const [selectedLine, setSelectedLine] = useState(null)
  const [expandedLine, setExpandedLine] = useState(null)
  const [isDeletingStudentFromLine,setIsDeletingStudentFromLine] = useState(false)
  const [isDeletingLine,setIsDeletingLine] = useState(false)
  
  // Filtered drivers based on search term
  const filteredDrivers = drivers.filter((driver) => {
    // Filter by name
    const matchesName = driverNameFilter === '' || driver.driver_full_name.includes(driverNameFilter)

    // Filter by car type
    const matchesCarType = carTypeFilter === '' || driver.driver_car_type === carTypeFilter;
    return matchesName && matchesCarType;
  })
  .map((driver) => {
     // Calculate total ratings from school_rating and student_rating
    const totalSchoolRating = driver?.school_rating?.reduce((sum, r) => sum + r, 0) || 0;
    const totalStudentRating = driver?.student_rating?.reduce((sum, r) => sum + r, 0) || 0;

     // Calculate the total rating and average rating
     const totalRating = totalSchoolRating + totalStudentRating;
     const totalEntries =
       (driver?.school_rating?.length || 0) + (driver?.student_rating?.length || 0);
 
     const avgRating = totalEntries > 0 ? Math.round(totalRating / totalEntries) : "-";
 
     return { ...driver, avgRating };
  })
  .sort((a, b) => {
    // Sort by rating
    if (ratingSortDirection === 'asc') {
      return a.avgRating === '-' ? 1 : b.avgRating === '-' ? -1 : a.avgRating - b.avgRating;
    } else if (ratingSortDirection === 'desc') {
      return a.avgRating === '-' ? 1 : b.avgRating === '-' ? -1 : b.avgRating - a.avgRating;
    }
    return 0;
  });
    
  // Filter by driver name
  const handleNameChange = (e) => {
    setDriverNameFilter(e.target.value);
  };

  // Filter by driver car type
  const handleCarTypeChange = (e) => {
    setCarTypeFilter(e.target.value);
  };

  // Filter drivers by highest rating
  const handleSortByHighestRating = () => {
    setRatingSortDirection('desc');
  };
  
  // Filter drivers by lowest rating
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
    setSelectedDriver(null)
    setExpandedLine(null)
  };

  //Open add-new-line Modal
  const handleOpenModal = () => {
    setIsAddingNewLineModalOpen(true)
  }

  //Close add-new-line Modal
  const handleCloseModal = () => {
    setIsAddingNewLineModalOpen(false)
    setLineName("");
    setLineSchool("");
    setLineTimeTable(defaultTimeTable)
    setFirstDayTimeSelected(null)
  }

  // Handle school selection and capture its location
  const handleSchoolChange = (e) => {
    const selectedSchoolName = e.target.value;
    setLineSchool(selectedSchoolName);

    // Find the selected school from the schools array
    const selectedSchool = schools.find(school => school.name === selectedSchoolName);

    // If the school exists, update the location state
    if (selectedSchool) {
      setLineSchoolLocation({
        latitude: selectedSchool.latitude,
        longitude: selectedSchool.longitude,
      });
    }
  };

  // Handle time selection for each day
  const handleTimeChange = (day, time) => {
    const formattedTime = time ? `${time.getHours()}:${time.getMinutes()}` : null;

    setLineTimeTable((prev) =>
      prev.map((item) =>
        item.day === day
          ? {
              ...item,
              startTime: formattedTime === "0:0" ? null : time, // If 00:00, reset time
              active: formattedTime !== "0:0" // If 00:00, deactivate the day
            }
          : item
      )
    )

    // Update the latest selected time (if not 00:00)
    if (formattedTime !== "0:0") {
      setFirstDayTimeSelected(time)
    }
  };

  // Copy the selected day time to all other days (except Friday & Saturday)
  const copyTimeToAllDays = () => {
    if (!firstDayTimeSelected) return;
  
    setLineTimeTable((prev) =>
      prev.map((day) =>
        day.day !== "friday" && day.day !== "saturday" && firstDayTimeSelected !== null
          ? { ...day, startTime: firstDayTimeSelected, active: true }
          : day
      )
    );
  };

  // Handle add new line
  const handleAddLine = async () => {
    if (!lineName || !lineSchool || !lineSchoolLocation) {
      alert("الرجاء ملئ جميع الفراغات");
      return;
    }

    setAddingNewLineLoading(true);

    try {
      const activeDays = lineTimeTable.filter((day) => day.active);
      if (activeDays.length === 0) {
        alert("يرجى تحديد وقت البدء ليوم واحد على الأقل.");
        return;
      }

      // Generate unique ID for the new line
      const newLineId = uuidv4()

      const newLine = {
        id: newLineId,
        lineName,
        line_active:false,
        line_index:null,
        lineSchool,
        line_school_location: lineSchoolLocation,
        lineTimeTable: lineTimeTable.map((day,index) => ({
          ...day,
          dayIndex: index,
          startTime: day.startTime ? Timestamp.fromDate(day.startTime) : null
        })),
        students: [],
        current_trip: "first",
        first_trip_started: false,
        first_trip_finished: false,
        second_trip_started: false,
        second_trip_finished: false,
        started_the_line: null,
        arrived_to_school: null
      };

      // Fetch driver document
      const driverRef = doc(DB, "drivers", selectedDriver.id);
      const driverDoc = await getDoc(driverRef);
      const driverData = driverDoc.data();

      // Add new line and update Firestore
      const updatedLines = [...(driverData.line || []), newLine];
      await updateDoc(driverRef, { line: updatedLines });

      // Update local state
      setSelectedDriver((prevDriver) => ({
        ...prevDriver,
        line: updatedLines
      }));

      alert("تمت إضافة الخط بنجاح");
      handleCloseModal();
    } catch (error) {
      console.error("Error adding new line:", error);
      alert("حدث خطأ أثناء إضافة الخط. حاول مرة أخرى.");
    } finally {
      setAddingNewLineLoading(false)
      setLineName("")
      setLineSchool("")
      setLineTimeTable(defaultTimeTable)
      setFirstDayTimeSelected(null)
    }
  };

  // Handle open line-info Modal
  const openLineInfoModal = (line) => {
    setSelectedLine(line)
    setIsOpeningLineInfoModal(true)
  }

  // Function to format timestamps
  const formatTime = (timestamp) => {
    if (!timestamp) return "--"; // If no time is set
    
    const formattedTime = new Date(timestamp.seconds * 1000).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  
    return formattedTime === "00:00" ? "--" : formattedTime; // Show "-" if the time is "00:00"
  }
  
  // Function to update start time in Firestore
  const updateStartTime = async (dayIndex,driverId) => {
    if (!newDayTime) return; // Prevent saving if no time selected

    try {
      const driverRef = doc(DB, "drivers", driverId); // Reference to the driver doc
      const driverSnap = await getDoc(driverRef);

      if (!driverSnap.exists()) {
        alert("السائق غير موجود في قاعدة البيانات");
        return;
      }

      const driverData = driverSnap.data();

      // Find the correct line inside the driver's lines array
      const updatedLines = driverData.line.map((line) => {
        if (line.id === selectedLine.id) {
          return {
            ...line,
            lineTimeTable: line.lineTimeTable.map((day, index) => {
              if (index === dayIndex) {
                return {
                  ...day,
                  startTime: Timestamp.fromDate(new Date(`2000-01-01T${newDayTime}`)),
                  active: newDayTime !== "00:00", // Activate if not "00:00"
                };
              }
              return day;
            }),
          };
        }
        return line;
      });

      // Update Firestore with the modified lines array
      await updateDoc(driverRef, { line: updatedLines });

      // Update state instantly in `selectedDriver`
      setSelectedDriver((prevDriver) => ({
        ...prevDriver,
        line: updatedLines,
      }))

      setSelectedLine(updatedLines.find((line) => line.id === selectedLine.id));

      alert("تم تحديث وقت الانطلاق بنجاح");

    } catch (error) {
      console.error("Error updating start time:", error.message);
      alert("حدث خطأ أثناء تحديث وقت الانطلاق");
    } finally{
      handleCloseLineInfoModal()
    }
  };

  // Close line-info Modal
  const handleCloseLineInfoModal = () => {
    setSelectedLine(null)
    setIsOpeningLineInfoModal(false)
    setEditingDayTime(null)
    setNewDayTime(null)
  }

  // Open line students list
  const toggleLine = (index) => {
    setExpandedLine((prev) => (prev === index ? null : index));
  }

  // Delete student from the line
  const deleteStudentFromLineHandler = async (studentId, lineIndex, driverId) => {
    if(isDeletingStudentFromLine) return

    const confirmDelete = window.confirm("هل تريد فعلاً إزالة هذا الطالب من الخط؟")
    if (!confirmDelete) return

    setIsDeletingStudentFromLine(true)

    try {
      const driverRef = doc(DB, "drivers", driverId);
      const studentRef = doc(DB, "students", studentId);
  
      // Get the current lines
      const currentLines = selectedDriver.line || [];
  
      // Update the specific line by removing the student
      const updatedLines = currentLines.map((line, idx) => {
        if (idx === lineIndex) {
          return {
            ...line,
            students: line.students.filter((student) => student.id !== studentId),
          };
        }
        return line;
      });
  
      // Use writeBatch for atomic updates
      const batch = writeBatch(DB);
  
      // Update the driver's line field
      batch.update(driverRef, {
        line: updatedLines,
      });
  
      // Reset the student's driver_id field
      batch.update(studentRef, {
        driver_id: null,
      });
  
      // Commit the batch
      await batch.commit();
  
      // Update the local state
      setSelectedDriver((prevDriver) => ({
        ...prevDriver,
        line: updatedLines,
      }));
  
      alert("تم حذف الطالب من الخط بنجاح");
    } catch (error) {
      console.error("Error removing student from line:", error);
      alert("خطأ أثناء محاولة الحذف. الرجاء المحاولة مرة ثانية");
    } finally {
      setIsDeletingStudentFromLine(false)
    }
  }

  // Delete an entire line
  const deleteLineHandler = async (lineIndex, driverId) => {
    if (isDeletingLine) return;

    const confirmDelete = window.confirm("هل تريد فعلاً إزالة هذا الخط وجميع طلابه؟");
    if (!confirmDelete) return;

    setIsDeletingLine(true);

    try {
        const driverRef = doc(DB, "drivers", driverId);

        // Get the current lines
        const currentLines = selectedDriver.line || [];

        // Extract the students in the line to be deleted
        const studentsToReset = currentLines[lineIndex]?.students || [];

        // Remove the line from the driver's lines
        let updatedLines = currentLines.filter((_, idx) => idx !== lineIndex);

        // Check if the deleted line was active
        const wasActiveLine = currentLines[lineIndex]?.line_active;

        if (wasActiveLine && updatedLines.length > 0) {
            // Assign line_active: true to the next line in the list (if any)
            updatedLines = updatedLines.map((line, idx) => ({
                ...line,
                line_active: idx === 0, // Set active to the first line in the list
            }));
        }

        // Use writeBatch for atomic updates
        const batch = writeBatch(DB);

        // Update the driver's line field
        batch.update(driverRef, {
            line: updatedLines,
        });

        // Reset the driver_id field for each student in the deleted line
        studentsToReset.forEach((student) => {
            const studentRef = doc(DB, "students", student.id);
            batch.update(studentRef, {
                driver_id: null,
            });
        });

        // Commit the batch
        await batch.commit();

        // Update the local state
        setSelectedDriver((prevDriver) => ({
            ...prevDriver,
            line: updatedLines,
        }));

        alert("تم حذف الخط وجميع طلابه بنجاح");
    } catch (error) {
        console.error("Error removing line:", error);
        alert("خطأ أثناء محاولة حذف الخط. الرجاء المحاولة مرة ثانية");
    } finally {
        setIsDeletingLine(false);
    }
  }

  //Delete driver document from DB
  const handleDelete = async () => {
    if (isDeleting) return;

    const confirmDelete = window.confirm("هل تريد بالتأكيد حذف هذا السائق");
    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      const { id, line } = selectedDriver;
      const batch = writeBatch(DB);

      // Loop through each line and update the students' driver_id to null
      (line || []).forEach((li) => {
        (li.students || []).forEach((student) => {
          const studentRef = doc(DB, "students", student.id);
          batch.update(studentRef, { driver_id: null });
        });
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
  }

  return (
    <div className='white_card-section-container'>
      {selectedDriver ? (
        <>
          <div className="item-detailed-data-container">
            <div className='item-detailed-data-header'>
              <div className='item-detailed-data-header-title'>
                <h5 style={{marginRight:'10px'}}>{selectedDriver.driver_phone_number || '-'}</h5>  
                <h5 style={{marginRight:'3px'}}>{selectedDriver.driver_family_name}</h5>
                <h5>{selectedDriver.driver_full_name}</h5>
              </div>
              <button className="info-details-back-button" onClick={goBack}>
                <BsArrowLeftShort size={24}/>
              </button>
            </div>
            <div className="item-detailed-data-main">
              <div className="item-detailed-data-main-firstBox">
                <div className='firstBox-image-box'>
                  <Image 
                    src={selectedDriver.driver_personal_image ? selectedDriver.driver_personal_image : imageNotFound}
                    style={{ objectFit: 'cover' }}  
                    width={200}
                    height={200}
                    alt='personal'
                  />
                  <Image 
                    src={selectedDriver.driver_car_image ? selectedDriver.driver_car_image : imageNotFound} 
                    style={{ objectFit: 'cover' }}  
                    width={200}
                    height={200}
                    alt='car image'
                  />
                </div>
                <div className='firstBox-text-box'>
                  <div>
                    <h5>{selectedDriver.driver_car_type || '-'}</h5>
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
                    <h5 style={{marginLeft:'3px'}}>حذف الحساب</h5>
                    <button 
                      className="assinged-item-item-delete-button" 
                      onClick={() => handleDelete(selectedDriver.id)}
                      disabled={isDeleting}
                    >
                      <FcDeleteDatabase size={24} />
                    </button>
                  </div>
                </div>           
              </div>

              <div className="item-detailed-data-main-second-box">

                  <div className="assinged-item-box-title">
                    <h5>الخطوط</h5>
                    <div className='driver-newgroup-assign' onClick={handleOpenModal}>
                      <FaPlus />
                      <h5 style={{marginLeft:'5px'}}>اضافة خط</h5>
                    </div>
                    <Modal
                      title='الخطوط'
                      open={isAddingNewLineModalOpen}
                      onCancel={handleCloseModal}
                      centered
                      footer={null}
                    >
                        <div className='adding_new_line_main'>
                          <input 
                            type='text' 
                            placeholder='اسم الخط'
                            value={lineName}
                            onChange={(e) => setLineName(e.target.value)}
                          />
                          <select 
                            onChange={handleSchoolChange}
                            value={lineSchool}
                            style={{width:'280px'}}
                          >
                            <option value=''>المدرسة</option>
                            {schools.map(school => (
                              <option key={school.id} value={school.name}>
                                {school.name}
                              </option>
                            ))}
                          </select>
                          <div className='line-time-table-container'>
                            {lineTimeTable.map((day,index) => (
                              <div key={index} className='line-time-table-container-box'>
                                <p>{day.arabic_day}</p>
                                <DatePicker                                  
                                  selected={day.startTime}
                                  onChange={(time) => handleTimeChange(day.day, time)}
                                  showTimeSelect
                                  showTimeSelectOnly
                                  timeIntervals={15}
                                  timeCaption="وقت البدء"
                                  dateFormat="HH:mm"
                                  className='private_car_request_form_date_day_input'
                                  placeholderText="وقت البدء"
                                />
                              </div>                       
                            ))}
                          </div>

                          {/* Show the copy button only after the first time is selected */}
                          {firstDayTimeSelected && (
                            <button style={{marginBottom:'10px',backgroundColor:'#16B1FF'}} onClick={copyTimeToAllDays}>
                              نسخ لجميع الأيام
                            </button>
                          )}

                          {addingNewLineLoading ? (
                            <div style={{ width:'120px',height:'35px',backgroundColor:'#955BFE',borderRadius:'7px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                              <ClipLoader
                                color={'#fff'}
                                loading={addingNewLineLoading}
                                size={13}
                                aria-label="Loading Spinner"
                                data-testid="loader"
                              />
                            </div>
                          ) : (
                            <button onClick={handleAddLine}>اضف</button>
                          )}
                        </div> 
                    </Modal>
                  </div>

                  <div className="assinged-item-box-main">
                    {selectedDriver?.line?.length ? (
                      <div style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center'}}>
                        {selectedDriver?.line.map((line,index) => (
                          <div style={{width:'100%'}} key={index}>
                            <div className="assinged-item-box-item"> 
                              <div>
                                <button 
                                  className="assinged-item-item-delete-button" 
                                  onClick={() => deleteLineHandler(index, selectedDriver.id)}
                                >
                                  <FcCancel size={24} />
                                </button>
                              </div>  

                              <h5 
                                style={{flex:'3',textAlign:'center'}}
                                onMouseEnter={(e) => (e.target.style.textDecoration = "underline")} // Add underline on hover
                                onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
                                onClick={() => openLineInfoModal(line)}
                              >
                                {line.lineName}  [{line.students.length}]
                              </h5>
                              <Modal
                                title={selectedLine?.lineName}
                                open={isOpeningLineInfoModal}
                                onCancel={handleCloseLineInfoModal}
                                centered
                                footer={null}
                              >
                                <div className='line-info-conainer'>
                                  <div>
                                    <p style={{marginLeft:'5px'}}>المدرسة</p>
                                    <p style={{marginLeft:'5px'}}>:</p>
                                    <p>{selectedLine?.lineSchool}</p>
                                  </div>
                                  {/* New Table for Start Times */}
                                  <div className="line-time-table">
                                    <table>
                                      <thead>
                                        <tr>   
                                          <th style={{width:'70px'}}>تعديل</th>                                      
                                          <th>وقت الانطلاق</th>
                                          <th>اليوم</th>                                        
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {selectedLine?.lineTimeTable?.map((day, index) => (
                                          <tr key={index}>

                                            <td style={{width:'70px'}}>                                           
                                              {editingDayTime === index ? (
                                                <FcOk 
                                                  size={20}
                                                  style={{cursor:'pointer'}}
                                                  onClick={() => updateStartTime(index,selectedDriver.id)}
                                                />
                                              ) : (
                                                <FiEdit2
                                                  style={{cursor:'pointer'}}
                                                  onClick={() => setEditingDayTime(index)}
                                                />
                                              )}
                                            </td>
                                
                                            <td>
                                              {editingDayTime === index ? (
                                                <input
                                                  type="time"
                                                  value={newDayTime || ""}
                                                  onChange={(e) => setNewDayTime(e.target.value)}
                                                  className="edit-time-input"
                                                />
                                              ) : (
                                                formatTime(day.startTime)
                                              )}
                                            </td>

                                            <td>{day.arabic_day}</td>

                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </Modal>

                              <div>
                                <button 
                                  className="assinged-item-item-delete-button" 
                                  onClick={() => toggleLine(index)}
                                >
                                  <FiPlusSquare size={20}/>
                                </button>
                              </div>                          
                            </div>

                            {/* Dropdown for students */}
                            <div className={`student-dropdown ${expandedLine === index ? "student-dropdown-open" : ""}`}>
                              {line?.students?.length ? (
                                <>
                                  {line.students.map((student) => (
                                      <div key={student.id} className='student-dropdown-item'>
                                        <h5>{student.name} {student.family_name}</h5>
                                        <button 
                                          className="assinged-item-item-delete-button" 
                                          onClick={() => deleteStudentFromLineHandler(student.id, index, selectedDriver.id)}
                                          disabled={isDeletingStudentFromLine}
                                        >
                                          <FcCancel size={24} />
                                        </button>
                                      </div>
                                 
                                  ))}
                                </>
                              ) : (
                                <h5 className="no-students">لا يوجد طلاب في هذا الخط</h5>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{width:'100%',textAlign:'center',marginTop:'50px'}}>
                        <h5>لا يوجد خطوط</h5>
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