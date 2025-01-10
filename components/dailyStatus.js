import React,{useState} from 'react'
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

    // Filter Handlers
    const handleLineNameChange = (e) => setLineNameFilter(e.target.value);
    const handleDriverNameChange = (e) => setDriverNameFilter(e.target.value);
    const handleLineStateChange = (e) => setLineState(e.target.value);

    // Determine unified line status
    const getLineUnifiedStatus = (line) => {
        if (
            line.first_trip_started === true && 
            line.first_trip_finished === false &&
            line.second_trip_started === false &&
            line.second_trip_finished === false

        ) return 'first trip started';
        if (
            line.first_trip_started === true && 
            line.first_trip_finished === true &&
            line.second_trip_started === false &&
            line.second_trip_finished === false

        ) return 'first trip finished';
        if (
            line.first_trip_started === true && 
            line.first_trip_finished === true &&
            line.second_trip_started === true &&
            line.second_trip_finished === false

        ) return 'second trip started';
        if (
            line.first_trip_started === true && 
            line.first_trip_finished === true &&
            line.second_trip_started === true &&
            line.second_trip_finished === true

        ) return 'second trip finished';
        if (
            line.first_trip_started === false && 
            line.first_trip_finished === false &&
            line.second_trip_started === false &&
            line.second_trip_finished === false

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

    // Color based on student trip status
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

    // Extract and sort all lines by startTime
    const allLines = drivers.flatMap((driver) => 
        driver.line.map((line) => ({
            ...line,
            driverName: driver.driver_full_name,
            driverFName: driver.driver_family_name,
            driverId: driver.id,
        }))
    );

    const sortedLines = allLines
    .filter((line) => line.line_school_startTime) // Ensure `line_school_startTime` exists
    .sort((a, b) => {
        const aDate = a.line_school_startTime?.toDate?.(); // Safely access `toDate()`
        const bDate = b.line_school_startTime?.toDate?.();

        if (!aDate || !bDate) return 0; // Skip comparison if dates are invalid

        // Extract hours and minutes
        const aTime = aDate.getHours() * 60 + aDate.getMinutes(); // Total minutes
        const bTime = bDate.getHours() * 60 + bDate.getMinutes();

        return aTime - bTime; // Sort by time
    });

    // Get unique start times (formatted as "HH:MM")
    const uniqueStartTimes = [...new Set(
        sortedLines.map((line) => {
            const date = line.line_school_startTime?.toDate?.();
            if (!date) return null; // Skip if date is invalid
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; // Format as "HH:MM"
        }).filter(Boolean) // Remove null values
    )];
    
    const filteredLines = sortedLines.filter((line) => {
        // Filter by start time
        if (selectedStartTime) {
            const date = line.line_school_startTime?.toDate?.();
            if (!date) return false;
            const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            if (time !== selectedStartTime) return false;
        }
    
        // Filter by line name
        if (lineNameFilter && !line.lineName.toLowerCase().includes(lineNameFilter.toLowerCase())) {
            return false;
        }
    
        // Filter by driver name
        if (driverNameFilter && !line.driverName.toLowerCase().includes(driverNameFilter.toLowerCase())) {
            return false;
        }
    
        // Filter by unified line state
        const unifiedStatus = getLineUnifiedStatus(line);
        if (lineState && unifiedStatus !== lineState) {
            return false;
        }
    
        return true;
    });

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
                // Sort driver's lines by startTime
                const sortedLines = driver.line.sort((a, b) => {
                    const aTime = a.line_school_startTime?.toDate?.()?.getTime() || 0;
                    const bTime = b.line_school_startTime?.toDate?.()?.getTime() || 0;
                    return aTime - bTime;
                });
    
                // Update lines
                const updatedLines = sortedLines.map((line, index) => ({
                    ...line,
                    first_trip_started: false,
                    first_trip_finished: false,
                    second_trip_started: false,
                    second_trip_finished: false,
                    current_trip: 'first',
                    line_active: index === 0, // Only the first line is active
                    students: line.students.map((student) => ({
                        ...student,
                        picked_up: false,
                        picked_from_school: false,
                        dropped_off: false,
                        tomorrow_trip_canceled: false,
                        checked_in_front_of_school: false,
                    })),
                }));
    
                // Add driver line updates to the batch
                batch.update(doc(DB, 'drivers', driver.id), { line: updatedLines });
    
                // Update students in Firestore
                for (const line of updatedLines) {
                    for (const student of line.students) {
                        const studentDocRef = doc(DB, 'students', student.id);
                        batch.update(studentDocRef, {
                            student_trip_status: 'at home',
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
                    <h5
                        onMouseEnter={(e) => (e.target.style.textDecoration = "underline")} // Add underline on hover
                        onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
                        onClick={() => openLineInfoModal(line)}
                    >{line.lineName}</h5>
                    <Modal
                        title={selectedLine?.lineName}
                        open={isOpeningLineInfoModal}
                        onCancel={handleCloseLineInfoModal}
                        centered
                        footer={null}
                    >
                        <div className='line-info-conainer'>
                            {selectedLine?.students.map((student, index) => (
                                <div key={index} className='line-info-student'>
                                    <p>{student.name} {student.family_name}</p>
                                </div>
                            ))}
                        </div>
                    </Modal>
                    <h5>{line.driverName} {line.driverFName}</h5>
                    <h5 style={{flex:4}} className={getTripClassName(unifiedStatus)}>
                        {getTripArabicNameLine(unifiedStatus)}
                    </h5>
                </div>
            );
        });
    };

    return (
        <div className='white_card-section-container'>
            {allLines.length === 0 ? (
                <div>Loading data...</div>
            ) : (
                <div className='students-section-inner'>
                    <div className='students-section-inner-titles'>
                        <div className='students-section-inner-title'>
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
            )}
        </div>
    )
}

export default DailyStatus