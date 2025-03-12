import React,{useState,useEffect} from 'react'
import { useGlobalState } from '../globalState'
import { writeBatch, collection, getDocs, doc } from 'firebase/firestore'
import { DB } from '../firebaseConfig'
import { Modal } from "antd"
import { GrPowerReset } from "react-icons/gr"

const DailyStatus = () => {
    const { drivers } = useGlobalState()

    const [driverNameFilter, setDriverNameFilter] = useState('')
    const [lineNameFilter, setLineNameFilter] = useState('');
    const [lineState, setLineState] = useState('');
    const [selectedStartTime, setSelectedStartTime] = useState('')
    const [isResetting, setIsResetting] = useState(false)
    const [isOpeningLineInfoModal,setIsOpeningLineInfoModal] = useState(false)
    const [selectedLine, setSelectedLine] = useState(null)
    const [todayDate, setTodayDate] = useState("")
    const [todayIndex, setTodayIndex] = useState(null);

    // Find the today date
    useEffect(() => {
        const getTodayDate = () => {
        const now = new Date();
        const options = { weekday: "long", day: "2-digit", month: "long", year: "numeric" };
        const formattedDate = now.toLocaleDateString("ar-IQ", options);
        setTodayDate(formattedDate);
        setTodayIndex(now.getDay()) // Get today's day index (0=Sunday, 6=Saturday)
        };

        getTodayDate();
    }, []);

    // Filter Handlers
    const handleLineNameChange = (e) => setLineNameFilter(e.target.value);
    const handleDriverNameChange = (e) => setDriverNameFilter(e.target.value);
    const handleLineStateChange = (e) => setLineState(e.target.value);

    // Determine unified line status
    const getLineUnifiedStatus = (line) => {
        if (
            line?.first_trip_started === true && 
            line?.first_trip_finished === false &&
            line?.second_trip_started === false &&
            line?.second_trip_finished === false

        ) return 'first trip started';
        if (
            line?.first_trip_started === true && 
            line?.first_trip_finished === true &&
            line?.second_trip_started === false &&
            line?.second_trip_finished === false

        ) return 'first trip finished';
        if (
            line?.first_trip_started === true && 
            line?.first_trip_finished === true &&
            line?.second_trip_started === true &&
            line?.second_trip_finished === false

        ) return 'second trip started';
        if (
            line?.first_trip_started === true && 
            line?.first_trip_finished === true &&
            line?.second_trip_started === true &&
            line?.second_trip_finished === true

        ) return 'second trip finished';
        if (
            line?.first_trip_started === false && 
            line?.first_trip_finished === false &&
            line?.second_trip_started === false &&
            line?.second_trip_finished === false

        ) return 'second trip finished';
        return '--';
    };

    // Line status in Arabic
    const getTripArabicNameLine = (status) => {
        switch (status) {
            case 'first trip started': return 'رحلة الذهاب بدات';
            case 'first trip finished': return 'رحلة الذهاب انتهت';
            case 'second trip started': return 'رحلة العودة بدات';
            case 'second trip finished': return 'رحلة العودة انتهت';
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
        if (status === 'first trip started' || status === 'second trip started') {
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
    )];

    const filteredLines = drivers.flatMap((driver) => 
        driver.line?.filter((line) => {
            const todaySchedule = line.lineTimeTable?.find(day => day.dayIndex === todayIndex && day.active);
            if (!todaySchedule) return false;
    
            // Convert today's start time into "HH:MM" format
            const startTime = todaySchedule.startTime?.toDate?.();
            const formattedStartTime = startTime 
                ? `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`
                : null;
            
            // Get the current line status
            const unifiedStatus = getLineUnifiedStatus(line);
    
            if (selectedStartTime && formattedStartTime !== selectedStartTime) return false; // Filter by selected start time
            if (lineNameFilter && !line.lineName.toLowerCase().includes(lineNameFilter.toLowerCase())) return false;
            if (driverNameFilter && !driver.driver_full_name.toLowerCase().includes(driverNameFilter.toLowerCase())) return false;
            if (lineState && unifiedStatus !== lineState) return false;

            return true;
        }).map(line => ({
            ...line,
            driverName: driver.driver_full_name,
            driverFName: driver.driver_family_name,
            driverId: driver.id,
        }))
    );
       
    // Handle open line-info Modal
    const openLineInfoModal = (line) => {
        setSelectedLine(line)
        setIsOpeningLineInfoModal(true)
    }

    // Close line-info Modal
    const handleCloseLineInfoModal = () => {
        setSelectedLine(null)
        setIsOpeningLineInfoModal(false)
    }
    
    // Reset All Lines
    const resetAll = async () => {
        if (isResetting) return;
        setIsResetting(true);
    
        try {
            const confirmReset = window.confirm('هل تريد فعلا اعادة ضبط حالةالخطوط');
            if (!confirmReset) {
                setIsResetting(false);
                return;
            }
    
            const batch = writeBatch(DB);
    
            // Fetch all drivers
            const driversSnapshot = await getDocs(collection(DB, 'drivers'));
            const drivers = driversSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
    
            // Loop through drivers
            for (const driver of drivers) { 
                const updatedLines = driver?.line?.map((line) => ({
                    ...line,
                    first_trip_started: false,
                    first_trip_finished: false,
                    second_trip_started: false,
                    second_trip_finished: false,
                    current_trip: 'first',
                    line_active: false,
                    riders: line.riders.map((rider) => ({
                        ...rider,
                        picked_up: false,
                        picked_from_school: false,
                        dropped_off: false,
                        tomorrow_trip_canceled: false,
                        checked_in_front_of_school: false,
                    })),
                }));
    
                // Add driver line updates to the batch
                batch.update(doc(DB, 'drivers', driver.id), { 
                    line: updatedLines ,
                    start_the_journey: false,
                });
    
                // Update riders in Firestore
                for (const line of updatedLines) {
                    for (const rider of line.riders) {
                        const riderDocRef = doc(DB, 'riders', rider.id);
                        batch.update(riderDocRef, {
                            trip_status: 'at home',
                            picked_up: false,
                        });
                    }
                }
            }
    
            // Commit the batch
            await batch.commit();

            alert('تم اعادة ضبط حالة جميع الخطوط');
        } catch (error) {
            console.error('Error resetting data:', error);
            alert('حدث خطأ اثناء اعادة الضبط. يرجى المحاولة مرة ثانية');
        } finally {
            setIsResetting(false);
        }
    };
    

    // Render titles dynamically
    const renderTitles = () => (
        <div className='students-section-inner-titles'>

            <div className='students-section-inner-title'>
                <input 
                    onChange={handleLineNameChange} 
                    value={lineNameFilter}
                    placeholder='الخط' 
                    type='text' 
                    className='students-section-inner-title_search_input'
                />
            </div>

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

    // Render rows dynamically
    const renderRows = () => {
        return filteredLines.map((line, index) => {
            const unifiedStatus = getLineUnifiedStatus(line);
            return (
                <div key={index} className="single-item">
                    <div>
                        <h5
                            onMouseEnter={(e) => (e.target.style.textDecoration = "underline")} // Add underline on hover
                            onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
                            onClick={() => openLineInfoModal(line)}
                        >
                            {line?.lineName}
                        </h5>
                    </div>
                    
                    <Modal
                        title={selectedLine?.lineName}
                        open={isOpeningLineInfoModal}
                        onCancel={handleCloseLineInfoModal}
                        centered
                        footer={null}
                    >
                        <div className='line-info-conainer'>
                            {selectedLine?.riders?.map((rider, index) => (
                                <div key={index} className='line-info-student'>
                                    <p>{rider?.name} {rider?.family_name}</p>
                                </div>
                            ))}
                        </div>
                    </Modal>
                    <div>
                        <h5>{line?.driverName} {line?.driverFName}</h5>
                    </div>
                    <div style={{flex:4}} >
                        <h5 className={getTripClassName(unifiedStatus)}>
                            {getTripArabicNameLine(unifiedStatus)}
                        </h5>
                    </div>  
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
                        <button 
                            className='reset-status-btn' 
                            onClick={resetAll}
                            disabled={isResetting}
                        >
                            <GrPowerReset />
                        </button>
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
                    </div>
                </div>

                {renderTitles()}
                    
                {renderRows()}

            </div>
        </div>
    )
}

export default DailyStatus