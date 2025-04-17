import React,{useState,useEffect} from 'react'
import { useGlobalState } from '../globalState'
import { writeBatch, collection, getDocs, doc,query, where } from 'firebase/firestore'
import { DB } from '../firebaseConfig'
import { Modal,DatePicker  } from "antd"
import dayjs from 'dayjs'
import { FiPlusSquare } from "react-icons/fi"

const DailyStatus = () => {
    const { drivers } = useGlobalState()

    const [driverNameFilter, setDriverNameFilter] = useState('')
    const [lineState, setLineState] = useState('')
    const [selectedStartTime, setSelectedStartTime] = useState('')
    const [selectedDriver, setSelectedDriver] = useState(null)
    const [isOpeningDriverHistoryModal,setIsOpeningDriverHistoryModal] = useState(false)
    const [todayDate, setTodayDate] = useState("")
    const [todayIndex, setTodayIndex] = useState(null)
    const [yearMonthKey, setYearMonthKey] = useState('')
    const [dayKey, setDayKey] = useState('')
    const [openDriverIds, setOpenDriverIds] = useState([])
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTrackingLines, setSelectedTrackingLines] = useState([]);
    const [journeyStarted, setJourneyStarted] = useState(false);

    // Find the today date
    useEffect(() => {
        const now = new Date();
        const iraqTime = now.toLocaleString("en-US", { timeZone: "Asia/Baghdad" });
        const [month, day, year] = iraqTime.split(/[/, ]/);
      
        const formattedDate = now.toLocaleDateString("ar-IQ", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      
        setTodayDate(formattedDate);
        setTodayIndex(now.getDay()); // Sunday = 0
        setYearMonthKey(`${year}-${month.padStart(2, "0")}`);
        setDayKey(day.padStart(2, "0"));
      }, []);

    // Filter Handlers
    const handleDriverNameChange = (e) => setDriverNameFilter(e.target.value);
    const handleLineStateChange = (e) => setLineState(e.target.value);

    // Determine unified line status
    const getLineUnifiedStatus = (line) => {
        const hasFirstStart = !!line.first_trip_start_time;
        const hasFirstFinish = !!line.first_trip_finish_time;
        const hasSecondStart = !!line.second_trip_start_time;
        const hasSecondFinish = !!line.second_trip_finish_time;

        if (!hasFirstStart && !hasFirstFinish && !hasSecondStart && !hasSecondFinish) return 'line not started';
        if (hasFirstStart && !hasFirstFinish && !hasSecondStart && !hasSecondFinish) return 'first trip started';
        if (hasFirstStart && hasFirstFinish && !hasSecondStart && !hasSecondFinish) return 'first trip finished';
        if (hasFirstStart && hasFirstFinish && hasSecondStart && !hasSecondFinish) return 'second trip started';
        if (hasFirstStart && hasFirstFinish && hasSecondStart && hasSecondFinish) return 'second trip finished';
        if (hasFirstStart && hasFirstFinish && !hasSecondStart && hasSecondFinish) return 'second trip canceled';
        return '--';
    };

    // Line status in Arabic
    const getTripArabicNameLine = (status) => {
        switch (status) {
            case 'first trip started': return 'رحلة الذهاب بدات';
            case 'first trip finished': return 'رحلة الذهاب انتهت';
            case 'second trip started': return 'رحلة العودة بدات';
            case 'second trip finished': return 'رحلة العودة انتهت';
            case 'second trip canceled': return 'رحلة العودة الغيت';
            case 'line not started' : return 'الخط لم يبدأ بعد';
            default: return '--';
        }
    };

    // Color based on rider trip status
    const getTripClassName = (status) => {
        if (status === undefined || status === null) {
          return 'no-rating';
        }
        if (status === 'first trip finished' || status === 'second trip finished') {
          return 'student-at-home';
        }
        if (status === 'first trip started' || status === 'second trip started' || status === 'second trip canceled') {
          return 'in-route';
        }
    };

    const uniqueStartTimes = [...new Set(
        drivers.flatMap((driver) => 
            driver.line?.flatMap((line) => 
                line.lineTimeTable
                    ?.filter(day => day.dayIndex === todayIndex && day.active) // Filter only today's active lines
                    .map(day => {
                        const date = day.startTime?.toDate?.();
                        if (!date) return null;
                        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                    })
            )
        ).filter(Boolean)
    )].sort((a, b) => {
        const [aH, aM] = a.split(':').map(Number);
        const [bH, bM] = b.split(':').map(Number);
        return aH * 60 + aM - (bH * 60 + bM);
    });

    // Filter only drivers who have at least one active line scheduled today
    const workingDrivers = drivers.filter((driver) => {
        return driver.line?.some((line) => 
        line.lineTimeTable?.some((day) => day.dayIndex === todayIndex && day.active)
        );
    });

    const getTodayLineById = (driver, lineId) => {
        const todayTracking = driver.dailyTracking?.[yearMonthKey]?.[dayKey];
        const todayLines = todayTracking?.today_lines || [];
        const finishedLines = todayTracking?.finished_lines || [];
      
        // First check finished_lines
        const inFinished = finishedLines.find((line) => line.id === lineId);
        if (inFinished) return { ...inFinished, from: 'finished' };
      
        // Otherwise check today_lines
        const inToday = todayLines.find((line) => line.id === lineId);
        if (inToday) return { ...inToday, from: 'today' };
      
        return null;
    };

    const groupedDrivers = workingDrivers.map((driver) => {
        const todayTracking = driver.dailyTracking?.[yearMonthKey]?.[dayKey];
        const hasStarted = !!todayTracking?.start_the_journey;
      
        const lines = [];
      
        const allTodayLines = driver.line?.filter((line) => {
            return line.lineTimeTable?.some((d) => d.dayIndex === todayIndex && d.active)
        }) || [];
      
        for (const baseLine of allTodayLines) {
            const todaySchedule = baseLine.lineTimeTable.find((d) => d.dayIndex === todayIndex && d.active)
            if (!todaySchedule) continue;
      
            const startTimeDate = todaySchedule.startTime?.toDate?.();
            const formattedStartTime = startTimeDate
                ? `${String(startTimeDate.getHours()).padStart(2, "0")}:${String(startTimeDate.getMinutes()).padStart(2, "0")}`
                : null;
      
            // Optional filters
            if (selectedStartTime && formattedStartTime !== selectedStartTime) continue;
      
            // === Pull actual tracking status if available
            let statusLine = null;
            if (hasStarted) {
                statusLine = getTodayLineById(driver, baseLine.id);
            }
      
            const unifiedStatus = statusLine ? getLineUnifiedStatus(statusLine) : 'line not started';

            // Late detection logic
            const now = new Date();
            const isLate = startTimeDate && now > startTimeDate && (
                !hasStarted || unifiedStatus === 'line not started'
            );

            // Action timestamps (if available)
            const actionTimes = {
                first_trip_started: statusLine?.first_trip_start_time || null,
                first_trip_finished: statusLine?.first_trip_finish_time || null,
                second_trip_started: statusLine?.second_trip_start_time || null,
                second_trip_finished: statusLine?.second_trip_finish_time || null,
                second_trip_canceled: statusLine?.second_trip_finish_time || null,
            };
          
            lines.push({
                ...baseLine,
                unifiedStatus,
                formattedStartTime,
                isLate,
                actionTimes,
            });
        }

        // Highlight driver if any line is late
        const isDriverLate = lines.some((line) => line.isLate);

        // ✅ Only return driver if at least one line passes the filter
        if (lines.length === 0) return null;
      
        return {
          driverId: driver.id,
          driverName: driver.driver_full_name,
          driverFName: driver.driver_family_name,
          hasStarted,
          isLate: isDriverLate,
          lines,
        };
    }).filter(Boolean);
      
    const toggleDriverMenu = (driverId) => {
        setOpenDriverIds((prev) =>
            prev.includes(driverId) ? prev.filter((id) => id !== driverId) : [...prev, driverId]
        )
    }

    // Handle open driver-info Modal
    const openDriverHistoryModal = (driverSummary) => {
        const fullDriverDoc = drivers.find((d) => d.id === driverSummary.driverId);
        if (!fullDriverDoc) {
            console.log("Driver not found in global state");
            return;
        }
        setSelectedDriver(fullDriverDoc)
        setIsOpeningDriverHistoryModal(true)
    }

    // Close driver-info Modal
    const handleCloseDriverHistoryModal = () => {
        setSelectedDriver(null)
        setSelectedDate(new Date())
        setSelectedTrackingLines([])
        setJourneyStarted(false)
        setIsOpeningDriverHistoryModal(false)
    }

    useEffect(() => {
        if (!selectedDriver || !selectedDate) return;
    
        const fetchDriverTracking = async () => {
            const iraqTime = new Date(selectedDate.toLocaleString("en-US", { timeZone: "Asia/Baghdad" }));
            const year = iraqTime.getFullYear();
            const month = String(iraqTime.getMonth() + 1).padStart(2, "0");
            const day = String(iraqTime.getDate()).padStart(2, "0");
            const yearMonthKey = `${year}-${month}`;
            const dayKey = day;
    
            const driverDoc = selectedDriver; // We already have all data
            const tracking = driverDoc?.dailyTracking?.[yearMonthKey]?.[dayKey];
    
            if (!tracking?.start_the_journey) {
                setJourneyStarted(false);
                setSelectedTrackingLines([]);
                return;
            }
    
            const todayLines = tracking.today_lines || [];
            const finishedLines = tracking.finished_lines || [];

            // ✅ Remove duplicates by checking against today's line ids
            const todayLineIds = new Set(todayLines.map(line => line.id));
            const uniqueFinishedLines = finishedLines.filter(line => !todayLineIds.has(line.id));
    
            const allLines = [...todayLines, ...uniqueFinishedLines];
            setJourneyStarted(true);
            setSelectedTrackingLines(allLines);
        };
    
        fetchDriverTracking();
    }, [selectedDate, selectedDriver]);
    
    // use this to render user data through phone number 
    const phoneNumber = '+12015550101';

    const findUsersAndRidersByPhone = async () => {
        try {

            // Query users
            const userRef = collection(DB, 'users');
            const userQuery = query(userRef, where('phone_number', '==', phoneNumber));
            const userSnap = await getDocs(userQuery);
      
            const matchedUsers = userSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
      
            // Query riders
            const riderRef = collection(DB, 'riders');
            const riderQuery = query(riderRef, where('phone_number', '==', phoneNumber));
            const riderSnap = await getDocs(riderQuery);
      
            const matchedRiders = riderSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Query drivers
            const driverRef = collection(DB, 'drivers');
            const driverQuery = query(driverRef, where('driver_phone_number', '==', phoneNumber));
            const driverSnap = await getDocs(driverQuery);
      
            const matcheDrivers = driverSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
      
            console.log('📱 Matched Users:', matchedUsers);
            console.log('🎒 Matched Riders:', matchedRiders);
            console.log('🎒 Matched Drivers:', matcheDrivers);
      
            return { users: matchedUsers, riders: matchedRiders, drivers: matcheDrivers };
        } catch (error) {
            console.error('❌ Error fetching by phone number:', error);
            return { users: [], riders: [] };
        }
    };
    
    // Render titles dynamically
    const renderTitles = () => (
        <div className='students-section-inner-titles'>
            <div className='students-section-inner-title'>
                <input 
                    onChange={handleDriverNameChange} 
                    value={driverNameFilter}
                    placeholder='السائق' 
                    type='text' 
                    className='students-section-inner-title_search_input'
                />
            </div>

            <div style={{flex:4}} className='students-section-inner-title'>
                <select
                    onChange={handleLineStateChange}
                    value={lineState}
                    style={{width: '200px'}}
                >
                    <option value=''>الحالة</option>
                    <option value='first trip started'> رحلة الذهاب بدات</option>
                    <option value='first trip finished'>رحلة الذهاب انتهت</option>
                    <option value='second trip started'>رحلة العودة بدات</option>
                    <option value='second trip finished'>رحلة العودة انتهت </option>
                </select>
            </div>
        </div>
    );
  
    const renderRows = () => {
        return groupedDrivers.map((driver, index) => {
            const isOpen = openDriverIds.includes(driver.driverId);
            return (
                <div 
                    key={index} 
                    className="driver-block" 
                    style={{ backgroundColor: driver.isLate ? "#D84040" :  "#fff"}} // light red for late drivers
                >

                    {/* Driver header */}
                    <div className="daily-status-line-single-item">
                        <div className="single-item-daily-status-header">
                            <h5
                                onMouseEnter={(e) => (e.target.style.textDecoration = "underline")} // Add underline on hover
                                onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
                                onClick={() => openDriverHistoryModal(driver)}
                                style={{marginLeft:'10px',cursor:'pointer'}}
                            >
                                {driver.driverName} {driver.driverFName}
                            </h5>
                            <Modal
                                title={`${selectedDriver?.driver_full_name} ${selectedDriver?.driver_family_name}`}
                                open={isOpeningDriverHistoryModal}
                                onCancel={handleCloseDriverHistoryModal}
                                centered
                                footer={null}
                                styles={{
                                    mask: { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
                                    wrapper: { backgroundColor: 'rgba(0, 0, 0, 0.01)' },
                                    content:{boxShadow:'none'}
                                }}
                            >
                                <div className='driver-history-container'>
                                    {/* 📅 Date Picker */}
                                    <DatePicker
                                        value={dayjs(selectedDate)}
                                        onChange={(date) => setSelectedDate(date.toDate())}
                                        format="YYYY-MM-DD"
                                        allowClear={false}
                                        className='driver-history-container-calender'
                                    />

                                    {/* 🚫 Journey not started */}
                                    {!journeyStarted && (
                                        <div className='driver-history-container-journey-container'>
                                            <p className='absent' style={{marginTop:'50px'}}>السائق لم يبدا الرحلة في هذا اليوم</p>
                                        </div>
                                        
                                    )}

                                    {/* ✅ Render lines if journey started */}
                                    {journeyStarted && selectedTrackingLines.length > 0 && (
                                        <div className='driver-history-container-journey-container'>
                                            {selectedTrackingLines.map((line, idx) => (
                                                <div key={idx} className="driver-history-container-journey-item">
                                                    <p className='driver-history-container-line-name'>{line.lineName}</p>
                                                    {line.first_trip_start_time && <p className='in-route'>بدأ رحلة الذهاب: {line.first_trip_start_time}</p>}
                                                    {line.first_trip_finish_time && <p className='student-at-home'>انتهت رحلة الذهاب: {line.first_trip_finish_time}</p>}
                                                    {line.second_trip_start_time && <p className='in-route'>بدأ رحلة العودة: {line.second_trip_start_time}</p>}
                                                    {line.second_trip_finish_time && <p className='student-at-home'>انتهت رحلة العودة: {line.second_trip_finish_time}</p>}

                                                    {/* Optional: Show all picked/dropped riders */}
                                                    {line.riders?.map((rider, rIndex) => (
                                                        <p key={rIndex} className='driver-history-container-std-status'>
                                                            {rider.name}:
                                                            {rider.picked_up_time && ` صعد في ${rider.picked_up_time}`}{" "}
                                                            {rider.dropped_off_time && ` - نزل في ${rider.dropped_off_time}`}
                                                        </p>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Modal>
                            <button 
                                onClick={() => toggleDriverMenu(driver.driverId)}
                                className="assinged-item-item-delete-button" 
                            >
                                <FiPlusSquare size={20}/>
                            </button>
                        </div>
                        <div>
                            <h5>{driver.hasStarted ? 'بدأ رحلات اليوم' : 'لم يبدأ رحلات اليوم'}</h5>
                        </div>            
                    </div>
      
                    {/* Expandable lines */}
                    {isOpen && driver.lines.length > 0 && (
                        <div className="driver-lines">
                            {driver.lines.map((line, idx) => (
                                <div 
                                    key={idx} 
                                    className="daily-status-line-single-item"
                                    //style={{backgroundColor: line.isLate ? '#e96c6c' : 'transparent'}}
                                >
                                    <div>
                                        <h5 style={{minWidth:'140px',border: line.isLate ?'1px solid #fff' : '1px solid #955BFE',borderRadius:'5px'}}>
                                            {line.lineName} - {line.formattedStartTime}
                                        </h5>
                                    </div>
                                    <div>
                                        {line.unifiedStatus === 'first trip started' && (
                                            <h5 
                                                className={getTripClassName(line.unifiedStatus)}
                                                style={{marginRight:'7px'}}
                                            >
                                                {line.actionTimes.first_trip_started}
                                            </h5>
                                        )}

                                        {line.unifiedStatus === 'first trip finished' && (
                                            <h5 
                                                className={getTripClassName(line.unifiedStatus)}
                                                style={{marginRight:'7px'}}
                                            >
                                                {line.actionTimes.first_trip_finished}
                                            </h5>
                                        )}

                                        {line.unifiedStatus === 'second trip started' && (
                                            <h5 
                                                className={getTripClassName(line.unifiedStatus)}
                                                style={{marginRight:'7px'}}
                                            >
                                                {line.actionTimes.second_trip_started}
                                            </h5>
                                        )}
                           
                                        {line.unifiedStatus === 'second trip finished' && (
                                            <h5 
                                                className={getTripClassName(line.unifiedStatus)}
                                                style={{marginRight:'7px'}}
                                            >
                                                {line.actionTimes.second_trip_finished}
                                            </h5>
                                        )}

                                        {line.unifiedStatus === 'second trip canceled' && (
                                            <h5 
                                                className={getTripClassName(line.unifiedStatus)}
                                                style={{marginRight:'7px'}}
                                            >
                                                {line.actionTimes.second_trip_canceled}
                                            </h5>
                                        )}

                                        <h5 className={getTripClassName(line.unifiedStatus)}>
                                            {getTripArabicNameLine(line.unifiedStatus)}
                                        </h5>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        });
    };
      
    return (
        <div className='white_card-section-container'>
            <div>
                
                <div className='line-calender-box'>
                    <div className='line-calender-box-dayDate'>
                        <p style={{fontSize:'15px'}}>{todayDate}</p>
                    </div>
                    <div className='line-calender-box-dayTime'>
                        {/* Time buttons */}
                        <div className='line-start-times'> 
                            {uniqueStartTimes.map((time,index) => (
                                <button
                                    key={index}
                                    className={`students-or-driver-btn ${selectedStartTime === time ? 'active' : ''}`}
                                    onClick={() => setSelectedStartTime(time === selectedStartTime ? '' : time)}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                        {/* Clear filter button */}
                        <button
                            className={`students-or-driver-btn ${selectedStartTime === '' ? 'active' : ''}`}
                            onClick={() => setSelectedStartTime('')}
                            style={{fontWeight:'bold'}}
                        >
                            عرض الكل
                        </button>
                    </div>
                </div>

                {renderTitles()}
                    
                {renderRows()}

            </div>
        </div>
    )
}

export default DailyStatus