import React,{useState} from 'react'
import Image from 'next/image'
import { doc,getDoc,writeBatch,Timestamp } from "firebase/firestore"
import { DB } from '../firebaseConfig'
import ClipLoader from "react-spinners/ClipLoader"
import 'react-datepicker/dist/react-datepicker.css'
import { Modal } from "antd"
import { useGlobalState } from '../globalState'
import { BsArrowLeftShort } from "react-icons/bs"
import { FcDeleteDatabase } from "react-icons/fc"
import { FaCaretUp } from "react-icons/fa6"
import { FaCaretDown } from "react-icons/fa6"
import { FiPlusSquare } from "react-icons/fi"
import imageNotFound from '../images/NoImage.jpg'
import switchLine from '../images/transfer.png'

const  Drivers = () => {
  const { drivers } = useGlobalState()

  const [selectedTab, setSelectedTab] = useState('lines')
  const [driverNameFilter, setDriverNameFilter] = useState('')
  const [addressFilter,setAddressFilter] = useState('')
  const [carTypeFilter, setCarTypeFilter] = useState('')
  const [linesNumberSortDirection, setLinesNumberSortDirection] = useState(null)
  const [tripsNumberSortDirection, setTripsNumberSortDirection] = useState(null)
  const [selectedDriver,setSelectedDriver] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedLine, setSelectedLine] = useState(null)
  const [expandedLine, setExpandedLine] = useState(null)
  const [isOpeningSwitchLineModal,setIsOpeningSwitchLineModal] = useState(false)
  const [switchDriverID,setSwitchDriverID] = useState('')
  const [switchLineStartDate,setSwitchLineStartDate] = useState('')
  const [switchLineEndDate,setSwitchLineEndDate] = useState('')
  const [transferType, setTransferType] = useState('today'); // 'today' or 'future'
  const [tripPhases, setTripPhases] = useState({ first: false, second: false }); 
  const [isTransferringLine,setIsTransferringLine] = useState(false)
  
  // Filtered drivers based on search term
  const filteredDrivers = drivers.filter((driver) => {
    // Filter by selected service type based on selected tab
    const matchesServiceType =
      (selectedTab === 'lines' && driver.service_type === 'خطوط') ||
      (selectedTab === 'intercities' && driver.service_type === 'رحلات يومية بين المدن');

    // Filter by name
    const matchesName = driverNameFilter === '' || driver.full_name.includes(driverNameFilter)

    //Filter by home address
    const matchesAddress = addressFilter === '' || driver.home_address.includes(addressFilter)

    // Filter by car type
    const matchesCarType = carTypeFilter === '' || driver.car_type === carTypeFilter;
    
    return matchesServiceType && matchesName && matchesAddress && matchesCarType;
  })
  .sort((a, b) => {
    if(selectedTab === 'lines') {
      if (linesNumberSortDirection === 'asc') {
        return a.lines.length === '-' ? 1 : b.lines.length === '-' ? -1 : a.lines.length - b.lines.length;
      } else if (linesNumberSortDirection === 'desc') {
        return a.lines.length === '-' ? 1 : b.lines.length === '-' ? -1 : b.lines.length - a.lines.length;
      }
    } else {
      if (tripsNumberSortDirection === 'asc') {
        return a.intercityTrips.length === '-' ? 1 : b.intercityTrips.length === '-' ? -1 : a.intercityTrips.length - b.intercityTrips.length;
      } else if (linesNumberSortDirection === 'desc') {
        return a.intercityTrips.length === '-' ? 1 : b.intercityTrips.length === '-' ? -1 : b.intercityTrips.length - a.intercityTrips.length;
      }
    }
    
    return 0;
  });
    
  // Filter by driver name
  const handleNameChange = (e) => {
    setDriverNameFilter(e.target.value);
  };

  // Handle driver destination change
  const handleAddressChange = (e) => {
    setAddressFilter(e.target.value);
  };

  // Filter by driver car type
  const handleCarTypeChange = (e) => {
    setCarTypeFilter(e.target.value);
  };

  // Filter drivers by highest lines number
  const handleSortByHighestLinesNumber = () => {
    setLinesNumberSortDirection('desc');
  };
  
  // Filter drivers by lowest lines number
  const handleSortByLowestLinesNumber = () => {
    setLinesNumberSortDirection('asc');
  };

  // Filter drivers by highest lines number
  const handleSortByHighestTripsNumber = () => {
    setTripsNumberSortDirection('desc');
  };
  
  // Filter drivers by lowest lines number
  const handleSortByLowestTripsNumber = () => {
    setTripsNumberSortDirection('asc');
  };

  // Handle back action
  const goBack = () => {
    setSelectedDriver(null)
    setExpandedLine(null)
  };

  // Open line riders list
  const toggleLine = (index) => {
    setExpandedLine((prev) => (prev === index ? null : index));
  }

  // Open switch line to other driver Modal
  const openSwitchLineModal = (line) => {
    setSelectedLine(line)
    setIsOpeningSwitchLineModal(true)
  }

  // Close switch line to other driver modal
  const handleCloseSwitchLineModal = () => {
    setSelectedLine(null)
    setSwitchDriverID('')
    setSwitchLineStartDate('')
    setSwitchLineEndDate('')
    setIsOpeningSwitchLineModal(false)
    setTransferType('today')
  }

  // Select substitute driver
  const switchDriverIDChangeHandler = (e) => {
    setSwitchDriverID(e.target.value)
  }

  // Handle date selection (date-only) [start periode]
  const handleSwitchLineStartDate = (e) => {
    setSwitchLineStartDate(e.target.value);
  };

  // Handle date selection (date-only) [start periode]
  const handleSwitchLineEndDate = (e) => {
    setSwitchLineEndDate(e.target.value);
  };

  // Get Tomorrow date
  const getTomorrowDateString = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Move to tomorrow
    return today.toISOString().split("T")[0]; // Format YYYY-MM-DD
  }
    
  // Transfer line to another driver
  const handleTransferLineToDriverB = async () => {
    if (isTransferringLine) return;

    const confirmTransfer = window.confirm("هل تريد نقل هذا الخط إلى سائق آخر لفترة محددة؟");
    if (!confirmTransfer) return;

    setIsTransferringLine(true);
    
    try {
      const fromDriverRef = doc(DB, "drivers", selectedDriver.id);
      const toDriverRef = doc(DB, "drivers", switchDriverID);
  
      const [fromSnap, toSnap] = await Promise.all([
        getDoc(fromDriverRef),
        getDoc(toDriverRef)
      ]);
  
      if (!fromSnap.exists() || !toSnap.exists()) throw new Error("Driver not found");
  
      const fromDriverData = fromSnap.data();
      const toDriverData = toSnap.data();

      //Future Transfer
      if (transferType === 'future') {
        const startDate = new Date(switchLineStartDate);
        startDate.setUTCHours(0, 0, 0, 0);
        const endDate = new Date(switchLineEndDate);
        endDate.setUTCHours(0, 0, 0, 0);

        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(endDate);

        // === Update original driver's line
        const updatedFromLines = fromDriverData.lines.map((line) =>
          line.id === selectedLine?.id
            ? {
              ...line,
              desactive_periode: { start: startTimestamp, end: endTimestamp },
              subs_driver: switchDriverID
            }
            : line
        );
        batch.update(fromDriverRef, { lines: updatedFromLines });

        // === Add to substitute driver's line
        const futureLine = {
          ...selectedLine,
          active_periode: { start: startTimestamp, end: endTimestamp },
          original_driver: selectedDriver.id
        };
        const updatedToLines = [...(toDriverData.lines || []), futureLine];
        batch.update(toDriverRef, { lines: updatedToLines });
      }

      //Today transfer
      if (transferType === 'today') {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const yearMonthKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}`;
        const dayKey = today.getDate().toString().padStart(2, "0");

        const driverADaily = fromDriverData.dailyTracking?.[yearMonthKey]?.[dayKey];
        const driverBDaily = toDriverData.dailyTracking?.[yearMonthKey]?.[dayKey];

        // === Prepare line data to push to driver B
        const commonLineData = {
          id: selectedLine.id,
          name: selectedLine.name,
        };

        let lineForDriverB;
        let updatedTodayLinesForDriverA = [...(driverADaily?.todayLines || [])];

        if (tripPhases.first === true && tripPhases.second === false) {
          lineForDriverB = {
            ...commonLineData,
            first_phase: {
              destination: selectedLine.destination,
              destination_location: selectedLine.destination_location,
              phase_finished: false,
              riders: selectedLine.riders.map(r => ({
                id: r.id,
                name: r.name,
                family_name: r.family_name,
                home_location: r.home_location || null,
                notification_token: r.notification_token || null,
                phone_number: r.phone_number || null,
                picked_up: false,
              })),
            },
            second_phase: {
              handled_by_other_driver: true,
              phase_finished: true,
            },
          };

          // === Update driver A's line if already started
          updatedTodayLinesForDriverA = updatedTodayLinesForDriverA.map(l =>l.id === selectedLine.id ? 
            {
              ...l,
              first_phase: {
                ...l.first_phase,
                handled_by_other_driver: true,
                phase_finished: true,
              },
            }
          : l
          );
        } else if (tripPhases.first === false && tripPhases.second === true) {
          lineForDriverB = {
            ...commonLineData,
            first_phase: {
              handled_by_other_driver: true,
              phase_finished: true,
            },
            second_phase: {
              phase_finished: false,
              riders: selectedLine.riders.map(r => ({
                id: r.id,
                name: r.name,
                family_name: r.family_name,
                home_location: r.home_location || null,
                notification_token: r.notification_token || null,
                phone_number: r.phone_number || null,
                dropped_off: false,
              })),
            },
          }

          updatedTodayLinesForDriverA = updatedTodayLinesForDriverA.map(l =>
            l.id === selectedLine.id
              ? {
                  ...l,
                  second_phase: {
                    ...l.second_phase,
                    handled_by_other_driver: true,
                    phase_finished: true,
                  },
                }
              : l
          );
        } else if (tripPhases.first === true && tripPhases.second === true) {
          lineForDriverB = {
            ...commonLineData,
            first_phase: {
              destination: selectedLine.destination,
              destination_location: selectedLine.destination_location,
              phase_finished: false,
              riders: selectedLine.riders.map(r => ({
                id: r.id,
                name: r.name,
                family_name: r.family_name,
                home_location: r.home_location || null,
                notification_token: r.notification_token || null,
                phone_number: r.phone_number || null,
                picked_up: false,
              })),
            },
            second_phase: {
              phase_finished: false,
              riders: [],
            },
          }

          updatedTodayLinesForDriverA = updatedTodayLinesForDriverA.map(l =>
            l.id === selectedLine.id
              ? {
                  ...l,
                  first_phase: {
                    ...l.first_phase,
                    handled_by_other_driver: true,
                    phase_finished: true,
                  },
                  second_phase: {
                    ...l.second_phase,
                    handled_by_other_driver: true,
                    phase_finished: true,
                  },
                }
              : l
          )
        } else {
          alert('يرجى تحديد نوع الرحلة ذهاب او عودة')
        }

        // === Update driver A's dailyTracking
        const updatedDriverADaily = {
          ...driverADaily,
          todayLines: updatedTodayLinesForDriverA,
        };
        batch.update(fromDriverRef, {
          [`dailyTracking.${yearMonthKey}.${dayKey}`]: updatedDriverADaily
        });

        // === Update driver B's dailyTracking
        const updatedDriverBTodayLines = [...(driverBDaily?.todayLines || []), lineForDriverB];
        const updatedDriverBDaily = {
          ...driverBDaily,
          todayLines: updatedDriverBTodayLines,
        };
        batch.update(toDriverRef, {
          [`dailyTracking.${yearMonthKey}.${dayKey}`]: updatedDriverBDaily
        });
      }

      await batch.commit();
      alert("✅ تم نقل الخط بنجاح!");
    } catch (err) {
      console.error("Transfer failed:", err);
      alert("❌ خطأ أثناء نقل الخط");
    } finally {
      setSelectedLine(null)
      setSwitchDriverID('')
      setSwitchLineStartDate('')
      setSwitchLineEndDate('')
      setIsOpeningSwitchLineModal(false)
      setIsTransferringLine(false)
    }
  }
  
  //Delete driver document from DB
  const handleDelete = async () => {
    if (isDeleting) return;

    const confirmDelete = window.confirm("هل تريد بالتأكيد حذف هذا السائق");
    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      const batch = writeBatch(DB);

      // Check if the driver has lines
      if (selectedDriver.lines.length > 0) {
        alert("لا يمكن حذف السائق لأنه لا يزال لديه خطوط في حسابه");
        setIsDeleting(false);
        return;
      }

      // Delete the driver document
      const driverRef = doc(DB, "drivers", selectedDriver.id);
      batch.delete(driverRef);

      // Commit the batch update
      await batch.commit();
      setSelectedDriver(null)

      alert("تم الحذف بنجاح، وتم تحديث بيانات الطلاب المرتبطين بالسائق.");
    } catch (error) {
      console.error("خطأ أثناء الحذف:", error);
      alert("حدث خطأ أثناء الحذف. حاول مرة أخرى.");
    } finally {
      setIsDeleting(false);
    }
  }

  // Toggle between lines or intercity trips
  const renderToggle = () => (
    <div className='toggle-between-school-company-container'>
      <div
        className={`toggle-between-school-company-btn ${selectedTab === 'lines' ? 'active' : ''}`} 
        onClick={() => setSelectedTab('lines')}
      >
        <h5>الخطوط</h5>
      </div>
      <div
        className={`toggle-between-school-company-btn ${selectedTab === 'intercities' ? 'active' : ''}`} 
        onClick={() => setSelectedTab('intercities')}
      >
        <h5>الرحلات بين المدن</h5>
      </div>
    </div>
  )

  return (
    <div className='white_card-section-container'>
      {!selectedDriver ? (
        <div className='students-section-inner'>
          {renderToggle()}
          <div className='students-section-inner-titles'>
            <div className='students-section-inner-title'>
              <input 
                onChange={handleNameChange} 
                value={driverNameFilter}
                placeholder='الاسم' 
                type='text' 
                className='students-section-inner-title_search_input'
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
            <div className='students-section-inner-title'>
              <select
                onChange={handleCarTypeChange}
                value={carTypeFilter}
                style={{width:'230px'}}
              >
                <option value=''>نوع السيارة</option>
                <option value='صالون'>صالون</option>
                <option value='ميني باص ١٢ راكب'>ميني باص ١٢ راكب</option>
                <option value='ميني باص ١٨ راكب'>ميني باص ١٨ راكب</option>
                <option value='٧ راكب (جي ام سي / تاهو)'>٧ راكب (جي ام سي / تاهو)</option>
              </select>
            </div>
            {selectedTab === 'lines' ? (
              <div className='students-section-inner-title' style={{width:'200px'}}>
                <div className='driver-rating-box' style={{width:'130px'}}>
                  <button onClick={handleSortByLowestLinesNumber}>
                    <FaCaretDown 
                      size={18} 
                      className={linesNumberSortDirection === 'asc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}/>
                  </button>
                  <h5>عدد الخطوط</h5>
                  <button onClick={handleSortByHighestLinesNumber}>
                    <FaCaretUp 
                      size={18}
                      className={linesNumberSortDirection === 'desc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}/>
                  </button>
                </div>
              </div>
            ) : (
              <div className='students-section-inner-title' style={{width:'200px'}}>
                <div className='driver-rating-box' style={{width:'130px'}}>
                <button onClick={handleSortByLowestTripsNumber}>
                  <FaCaretDown 
                    size={18} 
                    className={tripsNumberSortDirection === 'asc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}/>
                </button>
                <h5>عدد الرحلات</h5>
                <button onClick={handleSortByHighestTripsNumber}>
                  <FaCaretUp 
                    size={18}
                    className={tripsNumberSortDirection === 'desc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}/>
                </button>
              </div>
            </div>
            )}
          </div>
          <div className='all-items-list'>
            {filteredDrivers.map((driver, index) => (
              <div key={index} onClick={() => setSelectedDriver(driver)} className='single-item'>
                <div>
                  <h5>{driver.full_name} {driver.family_name}</h5>
                </div>
                <div>
                  <h5>{driver.home_address}</h5>
                </div>
                <div>
                  <h5>{driver.car_type}</h5>
                </div>
                <div style={{width:'200px'}}>
                  <h5>{selectedTab === 'lines' ? driver?.lines?.length : driver?.intercityTrips?.length}</h5>
                </div>              
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="item-detailed-data-container">
            <div className='item-detailed-data-header'>
              <div className='item-detailed-data-header-title' style={{flexDirection:'row-reverse',gap:'5px'}}>
                <h5>{selectedDriver.full_name}</h5>
                <h5>{selectedDriver.family_name}</h5>
                <h5>-</h5>
                <h5>{selectedDriver.phone_number || '-'}</h5>  
              </div>
              <button className="info-details-back-button" onClick={goBack}>
                <BsArrowLeftShort size={24}/>
              </button>
            </div>
            <div className="item-detailed-data-main">
              <div className="item-detailed-data-main-firstBox">
                <div className='firstBox-image-box'>
                  <Image 
                    src={selectedDriver.personal_image ? selectedDriver.personal_image : imageNotFound}
                    style={{ objectFit: 'cover' }}  
                    width={200}
                    height={200}
                    alt='personal'
                  />
                  <Image 
                    src={selectedDriver.car_image ? selectedDriver.car_image : imageNotFound} 
                    style={{ objectFit: 'cover' }}  
                    width={200}
                    height={200}
                    alt='car image'
                  />
                </div>
                <div className='firstBox-text-box'>
                  <div>
                    <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>النوع</h5>
                    <h5>{selectedDriver.car_type || '-'}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>الموديل</h5>
                    <h5>{selectedDriver.car_model || '-'}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>اللوحة</h5>
                    <h5>{selectedDriver.car_plate || '-'}</h5>
                  </div>
                  <div>
                    <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>المعرف الخاص</h5>
                    <h5>{selectedDriver.id}</h5>
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
              </div>
              <div className="item-detailed-data-main-second-box">
                <div className="assinged-item-box-title">
                  <h5>{selectedTab === 'lines' ? 'الخطوط' : 'الرحلات'}</h5>
                </div>
                {selectedTab === 'lines' ? (
                  <div className="assinged-item-box-main">
                  {selectedDriver?.lines?.length ? (
                    <div style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center'}}>
                      {selectedDriver?.lines.map((line,index) => (
                        <div style={{width:'100%'}} key={index}>
                          <div className="assinged-item-box-item"> 
                            <div className="assinged-item-box-item-buttons">
                              <button
                                className="assinged-item-item-delete-button" 
                                onClick={() => openSwitchLineModal(line)}
                              >
                                <Image 
                                  src={switchLine} 
                                  style={{ objectFit: 'cover' }}  
                                  width={18}
                                  height={18}
                                  alt='switch line'
                                />
                              </button>
                              <Modal
                                title={'تحويل الخط لسائق اخر'}
                                open={isOpeningSwitchLineModal}
                                onCancel={handleCloseSwitchLineModal}
                                centered
                                footer={null}
                              >
                                <div className='switch-line-info-conainer'>
                                  <div>
                                    <p style={{fontWeight:'bold'}}>{selectedLine?.name}</p>
                                  </div>

                                  {/* Select substitute driver */}
                                  <div className='swicth_line_driver_select'>
                                    <select onChange={switchDriverIDChangeHandler} value={switchDriverID}>
                                    <option value=''>السائق المعوض</option>
                                      {drivers
                                        .filter(driver => driver.id !== selectedDriver.id) // Exclude current driver
                                        .map(driver => (
                                          <option key={driver.id} value={driver.id}>
                                            {driver.driver_full_name} {driver.driver_family_name}
                                          </option>
                                        ))}
                                    </select>
                                  </div>

                                  {/* Select substitution type today or future */}
                                  <div className="switch-line-mode-toggle">
                                    <div>
                                      <input
                                        type="radio"
                                        value="today"
                                        checked={transferType === 'today'}
                                        onChange={() => setTransferType('today')}
                                      />
                                      <h5>اليوم</h5>
                                    </div>
                                    <div>
                                      <input
                                        type="radio"
                                        value="future"
                                        checked={transferType === 'future'}
                                        onChange={() => setTransferType('future')}
                                      />
                                      <h5>تحديد تاريخ مستقبلي</h5>
                                    </div>
                                  </div>

                                  {/* Transfer for Today */}
                                  {transferType === 'today' && (
                                    <div className="switch-line-mode-toggle">
                                      <div>
                                        <input
                                          type="checkbox"
                                          checked={tripPhases.first}
                                          onChange={() =>
                                            setTripPhases(prev => ({ ...prev, first: !prev.first }))
                                          }
                                        />
                                        <h5>رحلة الذهاب</h5>
                                      </div>
                                      <div>
                                        <input
                                          type="checkbox"
                                          checked={tripPhases.second}
                                          onChange={() =>
                                            setTripPhases(prev => ({ ...prev, second: !prev.second }))
                                          }
                                          style={{ marginRight: '10px' }}
                                        />
                                        <h5>رحلة العودة</h5>
                                      </div>
                                    </div>
                                  )}

                                  {transferType === 'future' && (
                                    <>
                                      <div className='swicth_line_periode_date'>
                                        <h5>تاريخ البداية</h5>
                                        <input
                                          type="date"
                                          value={switchLineStartDate}
                                          onChange={handleSwitchLineStartDate}
                                          min={getTomorrowDateString()} // disables today and earlier
                                        />
                                      </div>

                                      <div className='swicth_line_periode_date'>
                                        <h5>تاريخ النهاية</h5>
                                        <input
                                          type="date"
                                          value={switchLineEndDate}
                                          onChange={handleSwitchLineEndDate}
                                          min={switchLineStartDate || getTomorrowDateString()}
                                        />
                                      </div>
                                    </>
                                  )}
    
                                  {/* Submit Button */}
                                  {isTransferringLine ? (
                                    <div style={{ width:'100px',height:'30px',backgroundColor:'#955BFE',borderRadius:'7px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                      <ClipLoader
                                        color={'#fff'}
                                        loading={isTransferringLine}
                                        size={13}
                                        aria-label="Loading Spinner"
                                        data-testid="loader"
                                      />
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={handleTransferLineToDriverB}
                                      className="assign-switch-line-button"
                                    >
                                      تأكيد
                                    </button>
                                  )}
                                </div>
                              </Modal>
                            </div>
                            <div className="assinged-item-box-item-driver-line-info">
                              <h5>{line.name}</h5>
                              <h5>-</h5>
                              <h5>{line?.riders?.length}</h5>
                              <h5>راكب</h5>
                              <h5>-</h5>
                              <h5>{line?.id}</h5>
                            </div>
                            <div className="assinged-item-box-item-buttons">
                              <button 
                                className="assinged-item-item-delete-button" 
                                onClick={() => toggleLine(index)}
                              >
                                <FiPlusSquare size={20}/>
                              </button>
                            </div>                          
                          </div>
                          {/* Dropdown for riders */}
                          <div className={`student-dropdown ${expandedLine === index ? "student-dropdown-open" : ""}`}>
                            {line?.riders?.length ? (
                              <>
                                {line.riders.map((rider) => (
                                  <div key={rider.id} className='student-dropdown-item' style={{justifyContent:'center'}} >
                                    <h5>{rider.name} {rider.family_name}</h5>
                                    <h5>-</h5>
                                    <h5>{rider.id}</h5>
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
                ) : (
                  <div className="assinged-item-box-main">
                    <div className= "line-student-dropdown-open">
                      {selectedDriver?.intercityTrips?.length ? (
                        <>
                          {selectedDriver?.intercityTrips?.map((trip) => (
                            <div key={trip?.id} className='trip-dropdown-item'>
                              <h5>{trip?.id}</h5>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div style={{width:'100%',textAlign:'center',marginTop:'50px'}}>
                          <h5>لا يوجد رحلات</h5>
                        </div>
                      )}
                    </div>
                  </div>
                )}                
              </div>
            </div>
          </div>   
        </>        
      )}
    </div>
  )
}

export default Drivers


/*

  // Filter drivers by rating
  const filteredDrivers = drivers.filter((driver) => {
    // Filter by name
    const matchesName = driverNameFilter === '' || driver.full_name.includes(driverNameFilter)

    // Filter by car type
    const matchesCarType = carTypeFilter === '' || driver.car_type === carTypeFilter;
    return matchesName && matchesCarType;
  })
  .map((driver) => {
    const totalRidersRating = driver?.riders_rating?.reduce((sum, r) => sum + r, 0) || 0;

     const totalEntries = (driver?.riders_rating?.length || 0)
 
     const avgRating = totalEntries > 0 ? Math.round(totalRidersRating / totalEntries) : "-";
 
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



  const findUserDocByUserId = async () => {
  try {
    const userID = 'user_2vXsPZXz5OLwaB9rO33rwEAbgKJ'
    const usersRef = collection(DB, "users");
    const snapshot = await getDocs(usersRef);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.user_id === userID) {
        //return doc.id; // Firestore document ID
        console.log(doc.id)
      }
    }

    console.log('Not found')
  } catch (error) {
    console.error("Error finding user document:", error);
    return null;
  }
};

Hamdi Driver {
  driver_doc_id: PkEypouSpiP2hZkDDS47
  user_doc_id:  m6cCweDEgE2hs10ODDZa
  user_id:  user_2vbCHYxyqCf7mADp83q0UKQtIOF
}

Saif Omar Issaoui Driver {      *** DONE ***
  driver_doc_id: 9l8LjOL7Fadv8UqNs7Uc
  user_doc_id:  HIM0oa174I8z3XJ5pIGs
  user_id:  user_2vXpmyfK4mIyl6KiqdstpoZbHed
  phone_number:   +9647826251114
}

الزوبعي
ستار عناد {     *** DONE ***
  driver_doc_id: 3hU0znFuipk6HX6pr1U4
  user_doc_id:  halwUcTvUoBXvuYteMmX
  user_id:  user_2vXok7dgeeuKem9SUZnEQe6qi53
  phone_number:   +9647829086022
}

الياسين
مهيمن عطا
{                 *** DONE ***
  driver_doc_id: 4KAVeDB1qsbVPjdYEQOE
  user_doc_id:  9TltdOHRXSsVwvs5gETG
  user_id:  user_2vXozzT36lbKuwYVnTwvzvAqEXG
  phone_number:  +964 7815580533
}

البدراني
أيسر قاسم
{              *** DONE ***     
  driver_doc_id: 7QfP8ncHCrsXf1EhxiWC
  user_doc_id:  LfKeU2CeS1QZqetgkgVx
  user_id:  user_2vXpNUvkmGnvPJ5xl6aR8qJc6rc
  phone_number:  +9647801008979
}

صباح
وليد مرضي صباح
{                 *** DONE ***
  driver_doc_id: 9UQllR9etfNwo8TltvQR
  user_doc_id:  xn8AEG5vVHagWqXfhgUS
  user_id:  user_2vXpYznqOnmsAB99ZRVR0fx1mVZ
  phone_number:  +964 7829413039
}

المحمدي
سعدي محمد
{                 *** DONE ***
  driver_doc_id: FOWxINvbmAdw7lzJCgMc
  user_doc_id:  0I9fM9BmhtXvHs8onqk6
  user_id:  user_2vXmyIihp8BWpJTDcIriIWHVvXt
  phone_number:  +9647823025480
}

الزوبعي
أسامة عادل فياض
{                 *** DONE ***
  driver_doc_id: LKWIgaLhJHqMMRN6vph5
  user_doc_id:  Fc9k00J4Y1x4vK0R1E3j
  user_id:  user_2vXqCvHhmVVXvA6YNWtGGDLRUuW
  phone_number:  +964 7713372500
}

العيساوي
مدحت هادي مهيدي
{                 *** DONE ***
  driver_doc_id: PDQychaexMLrOy9snNap
  user_doc_id:  GL9ukLeQRP9tUsBb4yPS
  user_id:  user_2vXqSsBo06ZZKJN42oGIlFYEaF2
  phone_number:  +9647512994754       
}

الصالحي
قيس يحيى
{                   *** DONE ***     
  driver_doc_id: SZwJwDbqLARGygHcJbvc
  user_doc_id:  RZjLyF0tiQyvWULZxm8e
  user_id:  user_2vXqjkdVQRR1QooG56uRRDJysIN
  phone_number:  +9647902730234    
}

السعداني
حسن أحمد حسن العرسان
{                     *** DONE ***
  driver_doc_id: Uieu1moGORTSByqY4Rba
  user_doc_id:  Wo9tDL4XRrFyWA9vx01L
  user_id:  user_2vXqzOgRjMkv5UaQnwDcznz9zJl
  phone_number:  +9647506245878
}

العلواني
عبدالله غسان
{              *** DONE ***   
  driver_doc_id: fy0s4eiROq24dh6QrOoX
  user_doc_id:  8Aos5Js3q1C07g5ZGD3j
  user_id:  user_2vXrAss8VynOzNLIArRrPUxyIzk
  phone_number:  +964 7509049594    
}

العكيدي
حسام حسين علاوي
{                   *** DONE ***  
  driver_doc_id: i6lNI5ab015S0CtBaKdJ
  user_doc_id:  ms1d0jMmF2ZfszXMV3vg
  user_id:  user_2vXrb9Wo7qQMrnPfAWxKNDq4Aq1
  phone_number:  +9647505763260
}

العلواني
عزيز عدنان
{                   *** DONE ***
  driver_doc_id: mupBL4gQ38xiGTrBTcZw
  user_doc_id:  sXFMIPjMQGwnMYV4CYUP
  user_id: user_2vXrovlSvcplOLmWRyqT414NSdc
  phone_number:  +9647515600377
}

البدراني
عمر هاشم محمود
{                   *** DONE ***
  driver_doc_id: o668Z3QCDMVsn7w5oziX
  user_doc_id:  Oqv1kHZsQqUtqoYlf7Zv
  user_id: user_2vXs1L9hWiz06PHX1YJdbmPKc11
  phone_number:  +9647809436049
}

البياتي
عمر عصام عبد الرزاق
{               *** DONE ***            
  driver_doc_id: pApvvtAU1jxNhFjTjMew
  user_doc_id:  NJwaAS3u3BvnsWk8K2Ap
  user_id: user_2vXsDW9mqZmfg9qfonC3UM3wAUQ
  phone_number:  +964 7706074222
}


*/
