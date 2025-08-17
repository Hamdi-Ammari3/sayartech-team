import React,{useState,useEffect,useRef} from 'react'
import { useGlobalState } from '../globalState'
import { GoogleMap,Marker,InfoWindow  } from "@react-google-maps/api"
import Image from 'next/image'
import driverImage from '../images/trusted_driver.png'
import { writeBatch, collection, getDocs,doc,onSnapshot,query, where } from 'firebase/firestore'
import { DB } from '../firebaseConfig'
import { Modal,DatePicker  } from "antd"
import dayjs from 'dayjs'
import { FiPlusSquare } from "react-icons/fi"
import { BsArrowLeftShort } from "react-icons/bs"
import { MdCheckCircle } from "react-icons/md"
import { IoMdCloseCircle } from "react-icons/io"

const DailyStatus = () => {
    const mapRef = useRef(null)
    let animatedDriverLocation = useRef(null)
    const { drivers,lines,intercityTrips } = useGlobalState()

    const [todayDate, setTodayDate] = useState("")
    const [selectedTab, setSelectedTab] = useState('lines')
    const [lineNameFilter, setLineNameFilter] = useState('')
    const [lineDriverName,setLineDriverName] = useState('')
    const [lineStartTime,setLineStartTime] = useState('')
    const [lineEndTime,setLineEndTime] = useState('')
    const [lineStatus,setLineStatus] = useState('')
    const [selectedLine,setSelectedLine] = useState(null)
    const [tripStartPoint,setTripStartPoint] = useState('')
    const [tripEndPoint,setTripEndPoint] = useState('')
    const [tripDriver,setTripDriver] = useState('')
    const [tripStartTime,setTripStartTime] = useState('')
    const [tripStatus, setTripStatus] = useState('')
    const [selectedTrip,setSelectedTrip] = useState(null)
    const [lineTripPhase,setLineTripPhase] = useState('first')
    const [driverLocation, setDriverLocation] = useState(null);
    const [driverOriginLocation, setDriverOriginLocation] = useState(null);
   
    // Find the today date
    useEffect(() => {
        const now = new Date();
      
        const formattedDate = now.toLocaleDateString("ar-IQ", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      
        setTodayDate(formattedDate);
    }, []);

    const now = new Date();
    const yearMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dayKey = String(now.getDate()).padStart(2, '0');

    // Get line status
    const getDriverAndStatus = (line) => {
        if (!line.driver_id) return { driverName: 'بدون سائق', status: 'لم تبدأ بعد' };

        const driver = drivers.find((d) => d.id === line.driver_id);
        if (!driver) return { driverName: 'السائق غير موجود', status: 'لم تبدأ بعد' };

        const todayTracking = driver.dailyTracking?.[yearMonthKey]?.[dayKey];
        const lineTracking = todayTracking?.today_lines?.find((l) => l.id === line.id);

        // Logic to determine status
        if (!lineTracking) return { driverName: driver.full_name,driverFName:driver.family_name, status: 'لم تبدأ بعد' };

        const firstTripStarted = lineTracking.first_phase?.phase_started;
        const firstTripFinished = lineTracking.first_phase?.phase_finished;
        const secondTripStarted = lineTracking.second_phase?.phase_started;
        const secondTripFinished = lineTracking.second_phase?.phase_finished;

        if (secondTripFinished) return { driverName: driver.full_name,driverFName:driver.family_name, status: 'رحلة العودة انتهت' };
        if (secondTripStarted) return { driverName: driver.full_name,driverFName:driver.family_name, status: 'رحلة العودة بدأت' };
        if (firstTripFinished) return { driverName: driver.full_name,driverFName:driver.family_name, status: 'رحلة الذهاب انتهت' };
        if (firstTripStarted) return { driverName: driver.full_name,driverFName:driver.family_name, status: 'رحلة الذهاب بدأت' };

        return { driverName: driver.full_name,driverFName:driver.family_name, status: 'لم تبدأ بعد' };
    }

    const getLineStatusClass = (status) => {
        switch (status) {
            case 'لم تبدأ بعد':
            return 'trip-not-started';
            case 'رحلة الذهاب بدأت':
            case 'رحلة العودة بدأت':
            return 'trip-started';
            case 'رحلة الذهاب انتهت':
            case 'رحلة العودة انتهت':
            return 'trip-finished';
            default:
            return '';
        }
    }

    // Filtered lines based on search term
    const filteredLines = lines.filter((line) => {
        const { status,driverName } = getDriverAndStatus(line);

        //check line name
        const matchesName = lineNameFilter === '' || line?.name.includes(lineNameFilter)

        //filter with line driver name
        const matchesDriverName = lineDriverName === '' || driverName.includes(lineDriverName)

        //render only lines that have driver
        const matchesDriver = !!line?.driver_id;

        //render lines that have riders
        const haveRiders = line.riders.length > 0

        // filter by start time
        const todayIndex = new Date().getDay(); // 0 = Sunday
        const todaySchedule = line.timeTable?.find(day => day.dayIndex === todayIndex);
        const isActiveToday = todaySchedule?.active === true;
        const todayStartTimeObj = line.timeTable?.[todayIndex]?.startTime;
        const todayEndTimeObj = line.timeTable?.[todayIndex]?.endTime;

        // Extract the hour from the Firestore timestamp
        let lineStartHour = null;
        if (todayStartTimeObj?.toDate) {
            lineStartHour = todayStartTimeObj.toDate().getHours(); // returns number 0–23
        }

        let lineEndHour = null
        if (todayEndTimeObj?.toDate) {
            lineEndHour = todayEndTimeObj.toDate().getHours(); // returns number 0–23
        }

        // Extract the hour from the input value (lineStartTime is like "08:30")
        const filterStartHour = lineStartTime ? parseInt(lineStartTime.split(':')[0], 10) : null;
        const filterEndHour = lineEndTime ? parseInt(lineEndTime.split(':')[0], 10) : null;

        // Compare only the hours
        const matchesStartTime = lineStartTime === '' || lineStartHour === filterStartHour;
        const matchesEndTime = lineEndTime === '' || lineEndHour === filterEndHour;

        // filter line status
        const matchesStatus = lineStatus === '' || lineStatus === status;

        return (
            matchesName && 
            matchesDriverName && 
            matchesDriver && 
            haveRiders &&
            isActiveToday &&
            matchesStartTime && 
            matchesEndTime && 
            matchesStatus
        )
    });

    const sortedFilteredLines = filteredLines.sort((a, b) => {
        const todayIndex = new Date().getDay();

        const aStart = a.timeTable?.[todayIndex]?.startTime?.toDate?.();
        const bStart = b.timeTable?.[todayIndex]?.startTime?.toDate?.();

        // If both have valid start times, compare
        if (aStart && bStart) {
            return aStart.getTime() - bStart.getTime(); // ascending
        }

        // If only one has a start time, prioritize it
        if (aStart) return -1;
        if (bStart) return 1;

        return 0; // fallback
    });

    // Filter by line name
    const handleLineNameChange = (e) => {
        setLineNameFilter(e.target.value);
    };

    // Filter by line destination
    const handleLineDriverNameChange = (e) => {
        setLineDriverName(e.target.value);
    };

    // Filter by line start time
    const handleLineStartTimeChange = (e) => {
        setLineStartTime(e.target.value)
    }

    // Filter by line start time
    const handleLineEndTimeChange = (e) => {
        setLineEndTime(e.target.value)
    }

    // Filter by line status
    const handleLineStatusChange = (e) => {
        setLineStatus(e.target.value);
    }

    const getTripStatus = (trip) => {
        if (!trip.started) return 'لم تبدأ بعد';

        const riders = trip.riders || [];
        const allPicked = riders.length > 0 && riders.every(r => r.picked);

        if (allPicked) return 'الرحلة انتهت';

        return 'الرحلة بدات';
    };

    const getTripStatusClass = (status) => {
        switch (status) {
            case 'لم تبدأ بعد':
                return 'trip-not-started';
            case 'الرحلة بدات':
                return 'trip-started';
            case 'الرحلة انتهت':
                return 'trip-finished';
            default:
                return '';
        }
    };

    // Filtered trips based on search term
    const filteredTrips = intercityTrips.filter((trip) => {
        const startDateTime = trip?.start_datetime?.toDate?.();

        const tripDate = startDateTime?.toLocaleDateString("ar-IQ", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        });

        const tripHour = startDateTime?.getHours(); // 0–23
        const selectedHour = tripStartTime ? parseInt(tripStartTime.split(':')[0], 10) : null;

        // === Match date ===
        const matchesDate = todayDate === tripDate;

        // === Match hour only ===
        const matchesStartTime = tripStartTime === '' || tripHour === selectedHour;

        //filter by trip start point
        const matchesStart = tripStartPoint === '' || trip?.start_point.includes(tripStartPoint)

        //filter by trip end point
        const matchesEnd = tripEndPoint === '' || trip?.destination_address.includes(tripEndPoint)

        //filter with trip driver name
        const matchesDriverName = tripDriver === '' || trip?.driver_name.includes(tripDriver)

        //render only trips that have driver
        const matchesDriver = !!trip?.driver_id;

        //filter trips based on status
        const derivedStatus = getTripStatus(trip);
        const matchesStatus = tripStatus === '' || tripStatus === derivedStatus;

        return (
            matchesDate &&
            matchesStartTime &&
            matchesStart &&
            matchesEnd &&
            matchesDriverName &&
            matchesDriver &&
            matchesStatus
        )
    })
    
    // ✅ Sort filtered trips by start_datetime
    const sortedFilteredTrips = filteredTrips.sort((a, b) => {
        const aStart = a?.start_datetime?.toDate?.();
        const bStart = b?.start_datetime?.toDate?.();

        if (aStart && bStart) {
            return aStart.getTime() - bStart.getTime(); // Ascending
        }

        if (aStart) return -1;
        if (bStart) return 1;

        return 0;
    });

    // Filter by trip start point
    const handleTripStartPointChange = (e) => {
        setTripStartPoint(e.target.value)
    }

    // Filter by trip end point
    const handleTripEndPointChange = (e) => {
        setTripEndPoint(e.target.value)
    }

    // Filter by trip end point
    const handleTripDriverChange = (e) => {
        setTripDriver(e.target.value)
    }

    // Filter by trip start time
    const handleTripStartTimeChange = (e) => {
        setTripStartTime(e.target.value)
    }

    // Filter by trip status
    const handleTripStatusChange = (e) => {
        setTripStatus(e.target.value)
    }

    //Select a line
    const selectLine = (line) => {
        const driver = drivers.find((d) => d.id === line.driver_id);
        const todayTracking = driver?.dailyTracking?.[yearMonthKey]?.[dayKey];
        const todayLine = todayTracking?.today_lines?.find((l) => l.id === line.id);

        const firstTripStarted = todayLine?.first_phase?.phase_started;
        const firstTripFinished = todayLine?.first_phase?.phase_finished;
        const secondTripStarted = todayLine?.second_phase?.phase_started;
        const secondTripFinished = todayLine?.second_phase?.phase_finished;

        let lineStatus = 'لم تبدأ بعد';
        if (secondTripFinished) lineStatus = 'رحلة العودة انتهت';
        else if (secondTripStarted) lineStatus = 'رحلة العودة بدأت';
        else if (firstTripFinished) lineStatus = 'رحلة الذهاب انتهت';
        else if (firstTripStarted) lineStatus = 'رحلة الذهاب بدأت';

        setSelectedLine({
            ...line,
            driver,
            todayLine,
            lineStatus,
        });
    }

    const getStatusMessage = (status) => {
        switch (status) {
            case 'لم تبدأ بعد':
                return 'الرحلة لم تبدأ بعد';
            case 'رحلة الذهاب انتهت':
                return 'رحلة الذهاب انتهت';
            case 'رحلة العودة انتهت':
                return 'رحلة العودة انتهت';
            default:
                return 'الرحلة لم تبدأ بعد';
        }
    };

    // Handle map load
    const handleMapLoad = (map) => {
        mapRef.current = map; // Store the map instance
    };

   useEffect(() => {
        let unsubscribeFn;

        const trackDriver = async () => {
            if (!selectedLine?.driver_id || !mapRef.current) return;

            try {
                const driverRef = doc(DB, 'drivers', selectedLine.driver_id);
                const { Marker } = await window.google.maps.importLibrary('marker');

                unsubscribeFn = onSnapshot(driverRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const newLocation = data.current_location;

                        // Validate coordinates
                        if (
                            !newLocation ||
                            typeof newLocation.latitude !== 'number' ||
                            typeof newLocation.longitude !== 'number'
                        ) {
                            console.warn("Invalid driver location data:", newLocation);
                            return;
                        }

                        const latLng = {
                            lat: newLocation.latitude,
                            lng: newLocation.longitude,
                        };

                        // First time: create marker
                        if (!animatedDriverLocation.current) {
                            animatedDriverLocation = new Marker({
                                position: latLng,
                                map: mapRef.current,
                                icon: {
                                    path: window.google.maps.SymbolPath.CIRCLE,
                                    fillColor: '#3989FC',
                                    fillOpacity: 1,
                                    strokeColor: '#fff',
                                    strokeWeight: 2,
                                    scale: 6,
                                },
                            });

                            //animatedDriverLocation.current = driverMarker;
                        } else {
                            // Update existing marker position
                            animatedDriverLocation.current.setPosition(latLng);
                            if (!animatedDriverLocation.current.getMap()) {
                                animatedDriverLocation.current.setMap(mapRef.current);
                            }
                        }

                        setDriverLocation(latLng);
                        checkAndUpdateOriginLocation(newLocation);
                    }
                });
            } catch (error) {
                console.error("Error setting up driver tracking:", error);
            }
        };

        trackDriver();

        return () => {
            if (unsubscribeFn) unsubscribeFn();
            if (animatedDriverLocation.current) {
                animatedDriverLocation.current.setMap(null);
                animatedDriverLocation.current = null;
            }
        };
    }, [selectedLine?.driver_id,mapRef.current]);

    let lastOriginUpdateTime = Date.now();

    const checkAndUpdateOriginLocation = (currentLocation) => {
        if (!driverOriginLocation) {
            setDriverOriginLocation(currentLocation);
            return;
        }

        const now = Date.now();
        if (now - lastOriginUpdateTime < 30000) return;

        const distance = haversine(driverOriginLocation, currentLocation, { unit: "meter" });

        if (!isNaN(distance) && distance > 400) {
            setDriverOriginLocation(currentLocation);
            lastOriginUpdateTime = now;
        }
    };

    // Handle back action
    const goBack = () => {
        if(selectedTab === 'lines') {
            setSelectedLine(null)
        } else {
            setSelectedTrip(null)
        }
    }
      
    // Toggle between lines or intercity trips
    const renderToggle = () => (
        <div className='toggle-between-school-company-container' style={{border:'none',gap:'10px'}}>
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

    console.log(selectedLine)
    
    // Render lines titles
    const linesTitles = () => (
        <>
            {!selectedLine ? (
                <div className='students-section-inner'>
                    <div className='students-section-inner-titles'>
                        <div className='students-section-inner-title' style={{width:'300px'}}>
                            <input 
                                onChange={handleLineNameChange} 
                                value={lineNameFilter}
                                placeholder='اسم الخط' 
                                type='text' 
                                className='students-section-inner-title_search_input'
                                style={{width:'200px'}}
                            />
                        </div>
                        <div className='students-section-inner-title' style={{width:'300px'}}>
                            <input 
                                onChange={handleLineDriverNameChange} 
                                value={lineDriverName}
                                placeholder='السائق' 
                                type='text' 
                                className='students-section-inner-title_search_input'
                                style={{width:'200px'}}
                            />
                        </div>
                        <div className='students-section-inner-title' style={{width:'300px'}}>
                            <input 
                                onChange={handleLineStartTimeChange} 
                                value={lineStartTime} 
                                type='time' 
                                className='students-section-inner-title_search_input'
                                style={{width:'100px',marginRight:'5px'}}
                            />
                            <label style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>بداية الدوام</label>
                        </div>
                        <div className='students-section-inner-title' style={{width:'300px'}}>
                            <input 
                                onChange={handleLineEndTimeChange} 
                                value={lineEndTime} 
                                type='time' 
                                className='students-section-inner-title_search_input'
                                style={{width:'100px',marginRight:'5px'}}
                            />
                            <label style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>نهاية الدوام</label>
                        </div>
                        <div className='students-section-inner-title' style={{width:'200px'}}>
                            <select
                                onChange={handleLineStatusChange}
                                value={lineStatus}
                            >
                                <option value=''>الحالة</option>
                                <option value='لم تبدأ بعد'>لم تبدأ بعد</option>
                                <option value='رحلة الذهاب بدأت'>رحلة الذهاب بدأت</option>
                                <option value='رحلة الذهاب انتهت'>رحلة الذهاب انتهت</option>
                                <option value='رحلة العودة بدأت'>رحلة العودة بدأت</option>
                                <option value='رحلة العودة انتهت'>رحلة العودة انتهت </option>
                            </select>
                        </div>
                    </div>
                    <div className='all-items-list'>
                        {sortedFilteredLines.map((line,index) => {
                            const { status,driverName,driverFName } = getDriverAndStatus(line);
    
                            // Get today’s start time from timetable (optional enhancement)
                            const today = new Date().getDay(); // 0=Sunday
                            const startTimeObj = line.timeTable?.[today]?.startTime;
                            const endTimeObj = line.timeTable?.[today]?.endTime;

                            const startTime = startTimeObj?.toDate?.().toLocaleTimeString('en-EG', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            }) || '--';

                            const endTime = endTimeObj?.toDate?.().toLocaleTimeString('en-EG', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            }) || '--';

                            return(
                                <div key={index} onClick={() => selectLine(line)} className='single-item'>
                                    <div style={{width:'320px'}}>
                                        <h5>{line.name}</h5>
                                    </div>
                                    <div style={{width:'320px'}}>
                                        <h5>{driverName} {' '} {driverFName}</h5>
                                    </div>
                                    <div style={{width:'320px'}}>
                                        <h5>{startTime}</h5>
                                    </div>
                                    <div style={{width:'320px'}}>
                                        <h5>{endTime}</h5>
                                    </div>
                                    <div style={{width:'200px'}}>
                                        <h5 className={getLineStatusClass(status)}>{status}</h5>
                                    </div>
                                </div>
                            )
                        })}
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
                        <div className="student-detailed-data-main-firstBox">
                            <div className="item-detailed-data-main-firstBox-line-students" style={{flexDirection:'column'}}>
                                <div className='toggle-between-school-company-container' style={{border:'none',gap:'10px',marginBottom:'10px'}}>
                                    <div
                                        className={`toggle-between-school-company-btn ${lineTripPhase === 'first' ? 'active' : ''}`} 
                                        onClick={() => setLineTripPhase('first')}
                                    >
                                        <h5>رحلة الذهاب</h5>
                                    </div>
                                    <div
                                        className={`toggle-between-school-company-btn ${lineTripPhase === 'second' ? 'active' : ''}`} 
                                        onClick={() => setLineTripPhase('second')}
                                    >
                                        <h5>رحلة العودة</h5>
                                    </div>
                                </div>
                                {lineTripPhase === 'first' ? (
                                    <div className= "line-student-dropdown-open" style={{height:'53vh'}}>
                                        {selectedLine?.todayLine?.first_phase?.phase_started ? (
                                            <>
                                                <div className='trip-dropdown-item'>
                                                    <h5>بدا الرحلة</h5>
                                                    <h5 style={{fontWeight:'bold'}}>{selectedLine?.todayLine?.first_phase?.phase_starting_time}</h5>
                                                </div>
                                                <div className='trip-dropdown-item'>
                                                    <h5>الوصول للوجهة</h5>
                                                    <h5 style={{fontWeight:'bold'}}>{selectedLine?.todayLine?.first_phase?.phase_finishing_time ||'--'}</h5>
                                                </div>
                                                <div className= "line-student-dropdown-open-riders-list">
                                                {selectedLine?.todayLine?.first_phase?.riders.map((rider) => (
                                                    <div key={rider.id} className='trip-dropdown-item'>
                                                        <h5>{rider.name} {rider.family_name}</h5>
                                                        <h5>-</h5>
                                                        <h5>{rider.phone_number}</h5>
                                                        <h5>-</h5>
                                                        <h5>{rider.id}</h5>     
                                                        {rider.checked_at_home && (
                                                            <>
                                                                <h5>-</h5>
                                                                <h5 style={{fontWeight:'bold'}}>{rider.picked_up_time}</h5>
                                                            </>                                                    
                                                        )}                                           
                                                        {rider.picked_up && (
                                                            <MdCheckCircle size={22} color='#328E6E'/>  
                                                        )} 
                                                        {rider.checked_at_home && !rider.picked_up && (
                                                            <IoMdCloseCircle size={22} color='#D64545'/>
                                                        )}                                                 
                                                    </div>
                                                ))}
                                                </div>
                                            </>
                                        ) : (
                                            <h5 className="no-students">الرحلة لم تبدا</h5>
                                        )}
                                    </div>
                                ) : (
                                    <div className= "line-student-dropdown-open" style={{height:'53vh'}}>
                                        {selectedLine?.todayLine?.second_phase?.phase_started ? (
                                            <>
                                                {selectedLine?.todayLine?.second_phase?.riders.map((rider) => (
                                                    <div key={rider.id} className='trip-dropdown-item'>
                                                        <h5>{rider.name} {rider.family_name}</h5>
                                                        <h5>-</h5>
                                                        <h5>{rider.phone_number}</h5>
                                                        <h5>-</h5>
                                                        <h5>{rider.id}</h5>
                                                        {rider.dropped_off && (
                                                            <MdCheckCircle size={22} color='green'/>  
                                                        )} 
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <h5 className="no-students">الرحلة لم تبدا</h5>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="item-detailed-data-main-second-box">
                            {((lineTripPhase === 'first' && selectedLine.lineStatus === 'رحلة الذهاب بدأت') ||
                             (lineTripPhase === 'second' && selectedLine.lineStatus === 'رحلة العودة بدأت')) && selectedLine.driver?.current_location ? (
                                <div>
                                    <GoogleMap
                                        mapContainerStyle={{ width: "450px", height: "400px" }}
                                        center={{
                                            lat: selectedLine.driver?.current_location?.latitude,
                                            lng: selectedLine.driver?.current_location?.longitude
                                        }}
                                        zoom={14}
                                        onLoad={handleMapLoad}
                                    >

                                        {/* Render Riders */}
                                        {selectedLine.lineStatus === 'رحلة الذهاب بدأت' &&
                                            Array.isArray(selectedLine?.todayLine?.first_phase?.riders) &&
                                            selectedLine?.todayLine?.first_phase?.riders?.map((r) => (
                                                <Marker
                                                    key={r.id}
                                                    position={{ 
                                                        lat: r.home_location?.latitude, 
                                                        lng: r.home_location?.longitude 
                                                    }}
                                                    icon={{
                                                        url: r.picked_up
                                                            ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                                                            : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                                                    }}
                                                />
                                            ))
                                        }

                                        {selectedLine.lineStatus === 'رحلة الذهاب بدأت' &&
                                            <Marker
                                                position={{
                                                    lat: selectedLine?.todayLine?.first_phase?.destination_location?.latitude,
                                                    lng: selectedLine?.todayLine?.first_phase?.destination_location?.longitude
                                                }}
                                                icon={{
                                                    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                                                }}
                                            />
                                        }

                                        {selectedLine.lineStatus === 'رحلة العودة بدأت' &&
                                            Array.isArray(selectedLine?.todayLine?.second_phase?.riders) &&
                                            selectedLine?.todayLine?.second_phase?.riders?.map((r) => (
                                                <Marker
                                                    key={r.id}
                                                    position={{ 
                                                        lat: r.home_location.latitude, 
                                                        lng: r.home_location.longitude 
                                                    }}
                                                    icon={{
                                                        url: r.dropped_off
                                                            ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                                                            : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                                                    }}
                                                />
                                            ))
                                        }
                                    </GoogleMap>
                                </div>
                            ) : (
                                <div>
                                    <Image
                                        src={driverImage}
                                        width={200}
                                        height={200}
                                        alt="Driver is not moving"
                                    />
                                    <h5 style={{ textAlign: 'center', marginTop: '10px' }}>
                                        {getStatusMessage(selectedLine.lineStatus)}
                                    </h5>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )

    // Render trips titles
    const tripsTitles = () => (
        <>
           <div className='students-section-inner'>
                <div className='students-section-inner-titles'>
                    <div className='students-section-inner-title' style={{width:'300px'}}>
                        <input 
                            onChange={handleTripStartPointChange} 
                            value={tripStartPoint}
                            placeholder='نقطة الانطلاق' 
                            type='text' 
                            className='students-section-inner-title_search_input'
                            style={{width:'200px'}}
                        />
                    </div>
                    <div className='students-section-inner-title' style={{width:'300px'}}>
                        <input 
                            onChange={handleTripEndPointChange} 
                            value={tripEndPoint}
                            placeholder='نقطة الوصول' 
                            type='text' 
                            className='students-section-inner-title_search_input'
                            style={{width:'200px'}}
                        />
                    </div>
                    <div className='students-section-inner-title' style={{width:'300px'}}>
                        <input 
                            onChange={handleTripDriverChange} 
                            value={tripDriver}
                            placeholder='السائق' 
                            type='text' 
                            className='students-section-inner-title_search_input'
                            style={{width:'200px'}}
                        />
                    </div>
                    <div className='students-section-inner-title' style={{width:'300px'}}>
                        <input 
                            onChange={handleTripStartTimeChange} 
                            value={tripStartTime} 
                            type='time' 
                            className='students-section-inner-title_search_input'
                            style={{width:'100px',marginRight:'5px'}}
                        />
                        <label style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>توقيت الانطلاق</label>
                    </div>
                    <div className='students-section-inner-title' style={{width: '200px'}}>
                        <select
                            onChange={handleTripStatusChange}
                            value={tripStatus}
                        >
                            <option value=''>الحالة</option>
                            <option value='لم تبدأ بعد'>لم تبدأ بعد</option>
                            <option value='الرحلة بدات'>الرحلة بدات</option>
                            <option value='الرحلة انتهت'>الرحلة انتهت</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className='all-items-list'>
                {sortedFilteredTrips.map((trip,index) => {
                    const status = getTripStatus(trip);
                    const startTime = trip?.start_datetime?.toDate?.().toLocaleTimeString('en-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }) || '--';

                    return(
                        <div key={index} onClick={() => setSelectedTrip(trip)} className='single-item'>
                            <div style={{width:'320px'}}>
                                <h5>{trip.start_point}</h5>
                            </div>
                            <div style={{width:'320px'}}>
                                <h5>{trip.destination_address}</h5>
                            </div>
                            <div style={{width:'320px'}}>
                                <h5>{trip.driver_name}</h5>
                            </div>
                            <div style={{width:'320px'}}>
                                <h5>{startTime}</h5>
                            </div>
                            <div style={{width:'200px'}}>
                                <h5 className={getTripStatusClass(status)}>{status}</h5>
                            </div>
                        </div>
                    )
                })}
            </div>
        </>
    )
        
    return (
        <div className='white_card-section-container'>
            <div>
                {!selectedLine && !selectedTrip && (
                    <div className='line-calender-box'>
                        <div className='line-calender-box-dayDate'>
                            <p style={{fontSize:'15px'}}>{todayDate}</p>
                        </div>
                        {renderToggle()}
                    </div>
                )}
                <>
                    {selectedTab === 'lines' ? (
                        <>
                            {linesTitles()}
                        </>
                        
                    ) : (
                        <>
                            {tripsTitles()}
                        </>
                    )}
                </>
                
            </div>
        </div>
    )
}

export default DailyStatus