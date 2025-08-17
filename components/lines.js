import React,{useState} from 'react'
import { useGlobalState } from '../globalState'
import { addDoc,collection,Timestamp,writeBatch,doc,getDoc,setDoc } from "firebase/firestore"
import { DB } from '../firebaseConfig'
import { FaCaretUp,FaCaretDown } from "react-icons/fa6"
import { FiEdit2 } from "react-icons/fi"
import { BsArrowLeftShort } from "react-icons/bs"
import { FcCancel,FcDeleteDatabase } from "react-icons/fc"

// transfering line to another driver functionality
// rider bill calculation

const Lines = () => {
  const { lines,drivers } = useGlobalState()

  const [selectedLine, setSelectedLine] = useState(null)
  const [lineNameFilter, setLineNameFilter] = useState('')
  const [lineDestinationFilter, setLineDestinationFilter] = useState('')
  const [hasDriverFilter,setHasDriverFilter] = useState('')
  const [ridersSortDirection, setRidersSortDirection] = useState(null)
  const [editingTimes, setEditingTimes] = useState({})
  const [isEditing, setIsEditing] = useState({})
  const [isDeletingLine,setIsDeletingLine] = useState(false)
  const [isDeletingRiderFromLine,setIsDeletingRiderFromLine] = useState(false)
  const [isDeletingDriverFromLine,setIsDeletingDriverFromLine] = useState(false)

  // Filtered lines based on search term
  const filteredLines = lines.filter((line) => {
    //check line name
    const matchesName = lineNameFilter === '' || line.name.includes(lineNameFilter)

    //filter with line destination
    const matchesDestination = lineDestinationFilter === '' || line.destination.includes(lineDestinationFilter)

    //check he has a driver or not
    const matchesDriver = 
    hasDriverFilter === '' || 
    (hasDriverFilter === 'true' && line.driver_id) || 
    (hasDriverFilter === 'false' && !line.driver_id);

    return matchesName && matchesDestination && matchesDriver
  });

  // Sort lines by riders count
  const sortedLines = filteredLines.sort((a, b) => {
    if (ridersSortDirection === 'asc') return a.riders.length - b.riders.length;
    if (ridersSortDirection === 'desc') return b.riders.length - a.riders.length;
    return 0;
  });

  // Filter by line name
  const handleNameChange = (e) => {
    setLineNameFilter(e.target.value);
  };

  // Filter by line destination
  const handleDestinationChange = (e) => {
    setLineDestinationFilter(e.target.value);
  };

  // Filter drivers by highest rating
  const handleSortByHighestRiders = () => {
    setRidersSortDirection('desc');
  };
  
  // Filter drivers by lowest rating
  const handleSortByLowestRiders = () => {
    setRidersSortDirection('asc');
  };

    // Handle student has driver change
  const handleHasDriverChange = (e) => {
    setHasDriverFilter(e.target.value);
  };

  // Handle back action
  const goBack = () => {
    setSelectedLine(null)
    setIsEditing({})
    setEditingTimes({})
  };

  //Calculate rider age
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

  // Handle edit line time table click
  const handleEditClick = (index, currentStartTime) => {
    setIsEditing((prev) => ({ ...prev, [index]: true }));
    const date = new Date(currentStartTime.seconds * 1000);
    const time = date.toISOString().slice(11, 16); // "HH:mm"
    setEditingTimes((prev) => ({ ...prev, [index]: time }));
  };

  // Handle start time change
  const handleEditTimeChange = (index, value) => {
    setEditingTimes((prev) => ({ ...prev, [index]: value }));
  };

  // Handle confirm edit time table
  const handleConfirm = async () => {
    try {
      const batch = writeBatch(DB);
      const lineRef = doc(DB, "lines", selectedLine.id);
      const driverRef = doc(DB, "drivers", selectedLine.driver_id);

      // 1. Create updated timetable once
      const updatedTimeTable = selectedLine.timeTable.map((day, index) => {
        if (editingTimes[index]) {
          const newTime = Timestamp.fromDate(new Date(`2000-01-01T${editingTimes[index]}`));
          return {
            ...day,
            startTime: newTime,
            active: editingTimes[index] !== "00:00",
          };
        }
        return day;
      });

      // 2. Update the line document
      batch.update(lineRef, { timeTable: updatedTimeTable });

      // 3. Update driver's copy of the line
      const driverSnap = await getDoc(driverRef);
      if (!driverSnap.exists()) {
        alert("السائق غير موجود في قاعدة البيانات");
        return;
      }
      const driverData = driverSnap.data();

      const updatedDriverLines = driverData.lines.map((line) => {
        if (line.id === selectedLine.id) {
          return {
            ...line,
            timeTable: updatedTimeTable,
          };
        }
        return line;
      });

      batch.update(driverRef, { line: updatedDriverLines });

      // 4. Commit batch
      await batch.commit();

      // 5. Update local state
      setSelectedLine((prev) => ({
        ...prev,
        timeTable: updatedTimeTable,
      }));

      alert("تم تحديث الجدول بنجاح");
      setIsEditing({});
      setEditingTimes({});
    } catch (error) {
      console.error("خطأ في تحديث وقت الانطلاق:", error);
      alert("حدث خطأ أثناء تحديث الجدول");
    }
  };

  // Format time for line time table
  const formatTime = (timestamp) => {
    if (!timestamp) return "--";
    const formattedTime = new Date(timestamp.seconds * 1000).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return formattedTime === "00:00" ? "--" : formattedTime;
  };

  // Delete rider from the line
  const deleteRiderFromLineHandler = async (riderId) => {
    if (!selectedLine || !riderId) return;

    const confirmDelete = window.confirm("هل أنت متأكد أنك تريد حذف هذا الراكب من الخط؟");
    if (!confirmDelete) return;

    setIsDeletingRiderFromLine(true);

    try {
      const batch = writeBatch(DB);
      const lineRef = doc(DB, "lines", selectedLine.id);
      const updatedRiders = (selectedLine.riders || []).filter((rider) => rider.id !== riderId);

      // 1. Update the line doc
      batch.update(lineRef, {
        riders: updatedRiders,
      });

      // 2. If the line is assigned to a driver
      if (selectedLine.driver_id) {
        const driverRef = doc(DB, "drivers", selectedLine.driver_id);
        const driverSnap = await getDoc(driverRef);

        if (driverSnap.exists()) {
          const driverData = driverSnap.data();

          const updatedDriverLines = (driverData.lines || []).map((line) => {
            if (line.id === selectedLine.id) {
              return {
                ...line,
                riders: (line.riders || []).filter((r) => r.id !== riderId),
              };
            }
            return line;
          });

          batch.update(driverRef, {
            lines: updatedDriverLines,
          });
        }
      }

      // 3. Update rider document
      const riderRef = doc(DB, "riders", riderId);
      batch.update(riderRef, {
        line_id: null,
        driver_id: null,
      });

      await batch.commit();

      // 4. Update local state (remove rider from selectedLine)
      setSelectedLine((prevLine) => ({
        ...prevLine,
        riders: (prevLine.riders || []).filter((rider) => rider.id !== riderId),
      }));

      alert("تم حذف الطالب من الخط بنجاح!");

    } catch (error) {
      console.error("Error removing rider from line:", error);
      alert("حدث خطأ أثناء حذف الطالب.");
    } finally {
      setIsDeletingRiderFromLine(false);
    }
  };

  // Delete driver from the line
  const deleteDriverFromLineHandler = async() => {
    if (!selectedLine || !selectedLine.driver_id) return;

    const confirmDelete = window.confirm("هل أنت متأكد أنك تريد إزالة السائق من هذا الخط؟");
    if (!confirmDelete) return;

    setIsDeletingDriverFromLine(true);

    try {
      const batch = writeBatch(DB);
      const lineRef = doc(DB, "lines", selectedLine.id);
      const driverRef = doc(DB, "drivers", selectedLine.driver_id);

      // 1. Update line: remove driver_id
      batch.update(lineRef, {
        driver_id: null,
        driver_notification_token:null,
        driver_phone_number:null
      });

      // 2. Remove line from driver's lines array
      const driverSnap = await getDoc(driverRef);
      if (driverSnap.exists()) {
        const driverData = driverSnap.data();
        const updatedDriverLines = (driverData.lines || []).filter(line => line.id !== selectedLine.id);
        batch.update(driverRef, {
          lines: updatedDriverLines
        });
      }

      // 3. Update all riders in the line: set driver_id to null
      for (const rider of selectedLine.riders || []) {
        const riderRef = doc(DB, "riders", rider.id);
        batch.update(riderRef, {
          driver_id: null
        });
      }

      await batch.commit();

      // ✅ Update local state (optional)
      setSelectedLine(prev => ({
        ...prev,
        driver_id: null
      }));

      alert("تم إزالة السائق من الخط بنجاح!");
    } catch (error) {
      console.error("Error removing driver from line:", error);
      alert("حدث خطأ أثناء إزالة السائق.");
    } finally {
      setIsDeletingDriverFromLine(false);
    }
  }

  // Delete Line
  const handleDeleteLine = async() => {
    if (!selectedLine.id) return;
    const confirmDelete = window.confirm("هل أنت متأكد أنك تريد حذف هذا الخط؟");
    if (!confirmDelete) return;
    setIsDeletingLine(true);
    try {
      const batch = writeBatch(DB);
      const lineRef = doc(DB, "lines", selectedLine.id);
      const lineSnapshot = await getDoc(lineRef);

      if (!lineSnapshot.exists()) {
        alert("الخط غير موجود.");
        return;
      }

      const lineData = lineSnapshot.data();

      // 1. If line has a driver assigned, remove it from the driver's lines array
      if (lineData.driver_id) {
        const driverRef = doc(DB, "drivers", lineData.driver_id);
        const driverSnapshot = await getDoc(driverRef);

        if (driverSnapshot.exists()) {
          const driverData = driverSnapshot.data();

          // Remove line from driver's lines array based on line.id match
          const updatedLines = (driverData.lines || []).filter((l) => l.id !== selectedLine.id);

          batch.update(driverRef, {
            lines: updatedLines,
          });
        }
      }

      // 2. If line has riders, update each rider's line_id and driver_id to null
      const riders = lineData.riders || [];
      riders.forEach((rider) => {
        const riderRef = doc(DB, "riders", rider.id);
        batch.update(riderRef, {
          line_id: null,
          driver_id: null,
        });
      });

      // 3. Delete the line document
      batch.delete(lineRef);
      await batch.commit();
      alert("تم حذف الخط بنجاح.");
    } catch (error) {
      console.error("Error deleting line:", error);
      alert("حدث خطأ أثناء حذف الخط. حاول مرة أخرى.");
    } finally{
      setIsDeletingLine(false);
      setSelectedLine(null)
    }
  }

  //Fetch driver data
  const findDriverInfoFromId = (driverID) => {
    const theDriver = drivers.find((driver) => driver.id === driverID)
    if(!theDriver) {
      console.log('driver didnt exsit')
      return null;
    }
    return {
      name: theDriver.full_name,
      family_name: theDriver.family_name,
      car_type:theDriver.car_type,
      id:theDriver.id
    }
  }

  const renderLinesTitles = () => (
    <div className='students-section-inner-titles'>
      <div className='students-section-inner-title'>
        <input 
          onChange={handleNameChange} 
          value={lineNameFilter}
          placeholder='اسم الخط' 
          type='text' 
          className='students-section-inner-title_search_input'
        />
      </div>
      <div className='students-section-inner-title'>
        <input 
          onChange={handleDestinationChange} 
          value={lineDestinationFilter}
          placeholder='الوجهة' 
          type='text' 
          className='students-section-inner-title_search_input'
        />
      </div>
      <div className='students-section-inner-title'>
        <div className='driver-rating-box'>
          <button onClick={handleSortByLowestRiders}>
            <FaCaretDown 
              size={18} 
              className={ridersSortDirection === 'asc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}
            />
          </button>
          <h5>عدد الركاب</h5>
          <button onClick={handleSortByHighestRiders}>
            <FaCaretUp 
              size={18}
              className={ridersSortDirection === 'desc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}
            />
          </button>
        </div>
      </div>
      <div className='students-section-inner-title' style={{width:'200px'}}>
        <select onChange={handleHasDriverChange} value={hasDriverFilter}>
        <option value=''>لديه سائق</option>
          <option value={true}>نعم</option>
          <option value={false}>لا</option>
        </select>
      </div>
    </div>
  )

  return (
    <div className='white_card-section-container'>
      {!selectedLine ? (
        <div className='students-section-inner'>
          {renderLinesTitles()}
          <div className='all-items-list'>
            {sortedLines.map((line, index) => (
              <div key={index} onClick={() => setSelectedLine(line)} className='single-item'>
                <div>
                  <h5>{line.name}</h5>
                </div>
                <div>
                  <h5>{line.destination}</h5>
                </div>
                <div>
                  <h5>{line.riders.length}</h5>
                </div>
                <div style={{width:'200px'}}>
                  <h5 className={line.driver_id ? 'student-has-driver' : 'student-without-driver'}>{line.driver_id ? 'نعم' : 'لا'}</h5>
                </div>           
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="item-detailed-data-container">
          <div className='item-detailed-data-header'>
            <div className='item-detailed-data-header-title' style={{gap:'7px'}}>
              <h5>{selectedLine.id}</h5>
              <h5>-</h5>
              <h5>{selectedLine.destination}</h5>
              <h5>-</h5>
              <h5>{selectedLine.name || '-'}</h5>
            </div>
            <button className="info-details-back-button" onClick={goBack}>
              <BsArrowLeftShort size={24}/>
            </button>
          </div>
          <div className="item-detailed-data-main">
            <div className="item-detailed-data-main-firstBox">
              <div className='line-manage-buttons'>
                <h5>الاشتراك الشهري</h5>
                <h5>{selectedLine.standard_driver_commission}</h5>
              </div>
              <div className="item-detailed-data-main-firstBox-line-students" style={{height:'50vh'}}>
                  {selectedLine?.riders?.length ? (
                    <>
                      {selectedLine.riders.map((rider) => (
                        <div key={rider.id} className='line-dropdown-item'>
                          <div>
                            <div>
                              <h5>{rider.name} {rider.family_name}</h5>
                              <h5>-</h5>
                              <h5>{rider.birth_date ? calculateAge(rider.birth_date) : '-'}</h5>
                              <h5>سنة</h5>
                              <h5>-</h5>
                              <h5>{rider.id}</h5>
                            </div>
                            <div>
                              <h5>{rider.home_address}</h5>
                            </div>
                          </div>                      
                          <button 
                            className="assinged-item-item-delete-button" 
                            onClick={() => deleteRiderFromLineHandler(rider.id)}
                            disabled={isDeletingRiderFromLine}
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
              <div className='line-manage-buttons'>
                <h5 style={{marginLeft:'3px'}}>حذف الخط</h5>
                <button 
                  className="assinged-item-item-delete-button" 
                  onClick={() => handleDeleteLine()}
                  disabled={isDeletingLine}
                >
                  <FcDeleteDatabase size={24} />
                </button>
              </div>
            </div>
            <div className="item-detailed-data-main-second-box">
              <div className="line-dropdown-item" style={{width:'370px'}}>
                {selectedLine.driver_id ? (
                  (() => {
                    const driver = findDriverInfoFromId(selectedLine.driver_id);
                    return driver ? (
                        <>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                            <div>
                              <h5 style={{fontWeight:'bold'}}>السائق</h5>
                              <h5>{driver.name} {driver.family_name}</h5>
                              <h5>-</h5>
                              <h5>{driver.car_type}</h5>
                            </div>
                            <div>
                              <h5>{driver.id}</h5>
                            </div>                           
                          </div>
                          <button 
                            className="assinged-item-item-delete-button" 
                            onClick={() => deleteDriverFromLineHandler()}
                            disabled={isDeletingDriverFromLine}
                          >
                            <FcCancel size={24} />
                          </button>
                        </>
                                        
                    ) : (
                        <h5>--</h5>
                    );
                  })()
                ) : (
                  <h5 style={{color:'gray'}}>لا يوجد سائق لهذا الخط</h5>
                )}
              </div>
              <div className="item-detailed-data-main-second-box-line">
                <div className="line-time-table" style={{marginTop:'10px',marginBottom:'10px'}}>
                  <table>
                    <thead>
                      <tr> 
                        <th style={{width:'70px',padding:'4px'}}>
                          <h5>تعديل</h5>  
                        </th>                                                            
                        <th style={{padding:'4px'}}>
                          <h5>نهاية الدوام</h5>
                        </th>
                        <th style={{padding:'4px'}}>
                          <h5>بداية الدوام</h5>
                        </th>
                        <th style={{padding:'4px'}}>
                          <h5>اليوم</h5>
                        </th>                                        
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLine?.timeTable?.map((day, index) => (
                        <tr key={index}>
                          <td style={{width:'70px',padding:'4px'}}>                                                                       
                            <FiEdit2
                              style={{cursor:'pointer'}}
                              onClick={() => handleEditClick(index, day.startTime)}
                            />                          
                          </td>   
                          <td style={{padding:'4px'}}>
                            {isEditing[index] ? (
                              <input
                                type="time"
                                value={editingTimes[index]}
                                onChange={(e) => handleEditTimeChange(index, e.target.value)}                                
                              />
                            ) : (
                              <h5>{formatTime(day.endTime)}</h5>
                            )}
                          </td>                                                   
                          <td style={{padding:'4px'}}>
                            {isEditing[index] ? (
                              <input
                                type="time"
                                value={editingTimes[index]}
                                onChange={(e) => handleEditTimeChange(index, e.target.value)}                                
                              />
                            ) : (
                              <h5>{formatTime(day.startTime)}</h5>
                            )}
                          </td>                                           
                          <td style={{padding:'4px'}}>
                            <h5>{day.day}</h5>
                          </td>                    
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {Object.values(isEditing).some((v) => v) && (
                    <div className='confirm-edit-time-table'>
                      <button
                        onClick={handleConfirm}
                      >
                        تاكيد
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Lines