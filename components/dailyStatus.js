import React,{useState} from 'react'
import { useGlobalState } from '../globalState'

const DailyStatus = () => {
    const [viewType, setViewType] = useState('students')
    const { students, drivers } = useGlobalState()
    const [driverNameFilter, setDriverNameFilter] = useState('')
    const [driverState,setDriverState] = useState('')
    const [studentNameFilter,setStudentNameFilter] = useState('')
    const [studentState,setStudentState] = useState('')

    // Determine unified driver status
    const getDriverUnifiedStatus = (driver) => {
        if (driver.first_trip_status === 'started' && driver.second_trip_status === 'not started') return 'start the first trip';
        if (driver.first_trip_status === 'finished' && driver.second_trip_status === 'not started') return 'finish the first trip';
        if (driver.second_trip_status === 'started' && driver.first_trip_status === 'not started') return 'start the second trip';
        if (driver.second_trip_status === 'finished' && driver.first_trip_status === 'not started') return 'finish the second trip';
        return '--';
    };

    // Filtered drivers based on search term
    const filteredDrivers = drivers.filter((driver) => {
        const matchesName = driverNameFilter === '' || driver.driver_full_name.includes(driverNameFilter)
        const unifiedStatus = getDriverUnifiedStatus(driver);
        const matchesState = driverState === '' || unifiedStatus === driverState
        return matchesName && matchesState;
    })

    const filteredStudents = students.filter((student) => {
        const matchesName = studentNameFilter === '' || student.student_full_name.includes(studentNameFilter)
        const matchesState = studentState === '' || student.student_trip_status === studentState
        return matchesName && matchesState;
    })

    const handleNameChange = (e) => {
        if(viewType === 'drivers') {
            setDriverNameFilter(e.target.value);
        } else if (viewType === 'students') {
            setStudentNameFilter(e.target.value)
        }
    };

    const handleDriverState = (e) => {
        setDriverState(e.target.value)
    }

    const handleStudentState = (e) => {
        setStudentState(e.target.value)
    }

    // student current state arabic meaning
    const getTripArabicName = (status) => {
        if (status === undefined || status === null) {
            return '--';
        }
        if (status === 'at home') {
            return 'في المنزل';
        }
        if (status === 'at school') {
            return 'في المدرسة';
        }
        if (status === 'going to home') {
            return 'في الطريق الى المنزل';
        }
        if (status === 'going to school') {
            return 'في الطريق الى المدرسة';
        }
    }

    // driver current state arabic meaning
    const getTripArabicNameDriver = (status) => {
        if (status === undefined || status === null) {
            return '--';
        }
        if(status === 'start the first trip') {
            return 'بدا رحلة الذهاب'
        }
        if(status === 'finish the first trip') {
            return 'اكمل رحلة الذهاب'
        }
        if(status === 'start the second trip') {
            return 'بدا رحلة العودة'
        }
        if(status === 'finish the second trip') {
            return 'اكمل رحلة العودة'
        }
    }

    // Color based on student trip status
    const getTripClassName = (status) => {
        if (status === undefined || status === null) {
          return 'no-rating';
        }
        if (status === 'at home' || status === 'at school' || status === 'start the first trip' || status === 'start the second trip') {
          return 'student-at-home';
        }
        if (status === 'going to home' || status === 'going to school' || status === 'finish the first trip' || status === 'finish the second trip') {
          return 'in-route';
        }
      };


    // Render titles dynamically
    const renderTitles = () => (
        <div className='students-section-inner-titles'>
            <div className='students-section-inner-title'>
                <input 
                    onChange={handleNameChange} 
                    value={viewType === 'drivers' ? driverNameFilter : studentNameFilter}
                    placeholder='الاسم' 
                    type='text' 
                    className='students-section-inner-title_search_input'
                />
            </div>
            <div className='students-section-inner-title'>
                {viewType === 'drivers' ? (
                    <select
                        onChange={handleDriverState}
                        value={driverState}
                    >
                        <option value=''>الحالة</option>
                        <option value='start the first trip'>بدا رحلة الذهاب</option>
                        <option value='finish the first trip'>اكمل رحلة الذهاب</option>
                        <option value='start the second trip'>بدا رحلة العودة</option>
                        <option value='finish the second trip'>اكمل رحلة العودة</option>
                    </select>
                ) : (
                    <select
                        onChange={handleStudentState}
                        value={studentState}
                    >
                        <option value=''>الحالة</option>
                        <option value='at home'>في المنزل</option>
                        <option value='going to school'>في الطريق الى المدرسة</option>
                        <option value='at school'>في المدرسة</option>
                        <option value='going to home'>في الطريق الى المنزل</option>
                    </select>
                )}
            </div>
        </div>
    );

    // Render rows dynamically based on viewType
    const renderRows = () => {
        const data = viewType === 'drivers' ? filteredDrivers : filteredStudents;
        return data.map((item, index) => (
        <div key={index} className='single-item'>
            <h5>{viewType === 'drivers' ? item.driver_full_name : item.student_full_name || '-'}</h5>
            <h5 className={viewType === 'students' ? getTripClassName(item.student_trip_status) : getTripClassName(getDriverUnifiedStatus(item))}>{viewType === 'drivers' ? getTripArabicNameDriver(getDriverUnifiedStatus(item)) : getTripArabicName(item.student_trip_status)}</h5>
        </div>
        ));
    };
    
    return (
    <div className='white_card-section-container'>
        <div className='students-section-inner'>
            <div className='students-section-inner-titles'>
                <div className='students-section-inner-title'>
                    <div className={`students-or-driver-btn ${viewType === 'drivers' ? 'active' : ''}`} onClick={() => setViewType('drivers')}>
                        <h4>السواق</h4>
                    </div>
                    <div className={`students-or-driver-btn ${viewType === 'students' ? 'active' : ''}`} onClick={() => setViewType('students')}>
                        <h4>الطلاب</h4>
                    </div>
                </div>
            </div>

            {renderTitles()}

            <div>
                {renderRows()}
            </div>

        </div>
    </div>
)
}

export default DailyStatus