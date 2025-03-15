import React,{useState,useEffect,useRef} from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { DB } from '../firebaseConfig'
import { GoogleMap,Marker } from "@react-google-maps/api"
import { useGlobalState } from '../globalState'

const TrackingMap = () => {
    const mapRef = useRef(null)
    const { drivers } = useGlobalState()

    const [driverName,setDriverName] = useState('')
    const [selectedDriver,setSelectedDriver] = useState(null)
    const [driverLocation, setDriverLocation] = useState(null)
    const [todayDate, setTodayDate] = useState("")
    const [activeLines, setActiveLines] = useState([])
    const [selectedLine, setSelectedLine] = useState(null)
    const [selectedRider, setSelectedRider] = useState(null)
    const parser = new DOMParser()
    
    // Get today's date and dayIndex
    useEffect(() => {
        const now = new Date();
        const options = { weekday: "long", day: "2-digit", month: "long", year: "numeric" };
        setTodayDate(now.toLocaleDateString("ar-IQ", options));
    
        const todayIndex = now.getDay(); // Sunday = 0, Monday = 1, etc.
    
        if (selectedDriver) {
            // Filter only today's active lines
            const filteredLines = selectedDriver.line?.filter(line => {
                const todaySchedule = line.lineTimeTable?.find(day => day.dayIndex === todayIndex && day.active);
                return !!todaySchedule;
            }).map(line => {
                const todaySchedule = line.lineTimeTable.find(day => day.dayIndex === todayIndex);
                const startTime = todaySchedule?.startTime?.toDate?.(); // Handle Firestore timestamp
    
                return {
                    ...line,
                    startTime: startTime 
                        ? `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`
                        : null,
                    startTimeValue: startTime ? startTime.getHours() * 60 + startTime.getMinutes() : Infinity // Convert to minutes for sorting
                };
            });
    
            // Sort by start time (earliest first)
            const sortedLines = filteredLines.sort((a, b) => a.startTimeValue - b.startTimeValue);
    
            setActiveLines(sortedLines || [])

            // Auto-select the first line if available
            if (sortedLines.length === 1) {
                setSelectedLine(sortedLines[0]);
            } else if (sortedLines.length > 1) {
                setSelectedLine(sortedLines[0]); // Select the earliest one
            } else {
                setSelectedLine(null);
            }
        }
    }, [selectedDriver]);
    
    // Listen for driver current location changes
    useEffect(() => {
        if (driverName) {
            const driver = drivers.find(d => d.id === driverName);
            setSelectedDriver(driver || null);

            if (driver) {
                const driverRef = doc(DB, 'drivers', driver.id);

                // Listen for real-time updates
                const unsubscribe = onSnapshot(driverRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        if (data.current_location) {
                            setDriverLocation({
                                lat: data.current_location.latitude,
                                lng: data.current_location.longitude
                            });
                        }
                    }
                });

                return () => unsubscribe(); // Cleanup when driver changes
            }
        } else {
            setSelectedDriver(null);
            setDriverLocation(null);
        }
        
    }, [driverName, drivers]);

    // Set driver
    const setDriverNameChange = (e) => {
        setDriverName(e.target.value)
        setSelectedRider(null)
    }

    // Select line
    // Handle line selection
    const handleLineSelect = (line) => {
        setSelectedLine(line)
        setSelectedRider(null)
    }

    // Function to determine trip status
    const getDriverStatus = () => {
        if (!selectedLine) return "";

        const { first_trip_started, first_trip_finished, second_trip_started, second_trip_finished, riders } = selectedLine;

        const totalRiders = riders.length;
        const pickedUpCount = riders.filter(rider => rider.picked_up).length;
        const checkedInCount = riders.filter(rider => rider.checked_in_front_of_school).length;
        const droppedOffCount = riders.filter(rider => rider.dropped_off).length;

        if (first_trip_started === true && 
            first_trip_finished === false &&
            second_trip_started === false &&
            second_trip_finished === false

        ) return `رحلة الذهاب بدأت - ${totalRiders}/${pickedUpCount}`;

        if (first_trip_started === true && 
            first_trip_finished === false &&
            second_trip_started === false &&
            second_trip_finished === false &&
            pickedUpCount === totalRiders
        
        ) return "في اتجاه المدرسة";

        if (first_trip_started === true && 
            first_trip_finished === true &&
            second_trip_started === false &&
            second_trip_finished === false
        
        ) return "رحلة الذهاب انتهت";

        if (first_trip_started === true && 
            first_trip_finished === true &&
            second_trip_started === true &&
            second_trip_finished === false
        
        ) return `رحلة العودة بدأت - ${checkedInCount}/${droppedOffCount}`;
        
        if (first_trip_started === true && 
            first_trip_finished === true &&
            second_trip_started === true &&
            second_trip_finished === true
        
        ) return "رحلة العودة انتهت";

        return "الرحلة لم تبدأ بعد";
    };

    // Select rider
    const handleRiderSelect = (event) => {
        const riderId = event.target.value;
        if (riderId === "") {
            setSelectedRider(null);
        } else {
            const rider = selectedLine?.riders.find(r => r.id === riderId);
            setSelectedRider(rider || null);
        }
    };

    // Mapping English status to Arabic
    const riderStatusArabic = {
        "home": "في المنزل",
        "school": "في المدرسة",
        "to school": "في الطريق إلى المدرسة",
        "to home": "في الطريق إلى المنزل"
    };

    const getRiderStatus = () => {
        if (!selectedLine) return "";
        const { first_trip_started, first_trip_finished, second_trip_started, second_trip_finished } = selectedLine;
    
        if (first_trip_started === false && selectedRider.picked_up === false) return "home";
        if (first_trip_started === true && selectedRider.picked_up === false) return "home";
        if (first_trip_started === true && selectedRider.picked_up === true) return "to school";
        if (first_trip_finished && selectedRider.picked_up === true) return "school";
        if (second_trip_started === true && selectedRider.picked_from_school === true) return "to home";
        if(second_trip_finished && selectedRider.picked_from_school === true) return "home";
        return "in-route";
    };

    // Handle map load
    const handleMapLoad = (map) => {
        mapRef.current = map; // Store the map instance
    };

    // Center map on driver and rider locations
    useEffect(() => {
        if (!mapRef.current || !driverLocation) return;
    
        const bounds = new window.google.maps.LatLngBounds();
    
        // Always include the driver location
        bounds.extend(new window.google.maps.LatLng(driverLocation.lat, driverLocation.lng));
    
        if (selectedRider) {
            // Add only the selected rider
            bounds.extend(new window.google.maps.LatLng(selectedRider.home_location.latitude, selectedRider.home_location.longitude));
        } else {
            // Add all riders if no rider is selected
            selectedLine?.riders?.forEach((rider) => {
                bounds.extend(new window.google.maps.LatLng(rider.home_location.latitude, rider.home_location.longitude));
            });
        }
    
        mapRef.current.fitBounds(bounds); // Adjust map view to include all points
    }, [selectedRider, driverLocation, selectedLine]);

    const driverIcon = `data:image/svg+xml;charset=UTF-8, 
        <svg width="60" height="60" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="20" width="54" height="18" rx="3" 
                  fill="rgba(57, 137, 252, 0.8)" 
                  stroke="rgba(42, 109, 176, 1)" stroke-width="2"/>
            <rect x="9" y="22" width="10" height="8" 
                  fill="rgba(211, 227, 252, 0.9)"/>
            <rect x="25" y="22" width="12" height="8" 
                  fill="rgba(211, 227, 252, 0.9)"/>
            <rect x="42" y="22" width="8" height="8" 
                  fill="rgba(211, 227, 252, 0.9)"/>
            <circle cx="15" cy="40" r="5" 
                    fill="rgba(0, 0, 0, 1)" 
                    stroke="rgba(255, 255, 255, 1)" stroke-width="2"/>
            <circle cx="45" cy="40" r="5" 
                    fill="rgba(0, 0, 0, 1)" 
                    stroke="rgba(255, 255, 255, 1)" stroke-width="2"/>
            <line x1="8" y1="30" x2="50" y2="30" 
                  stroke="rgba(42, 109, 176, 1)" stroke-width="2"/>
        </svg>`;

    const homeIconss = `data:image/svg+xml;charset=UTF-8, 
        <svg width="60" height="60" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <path d="M32 6L4 28h8v24h16V40h8v12h16V28h8L32 6z" 
                fill="rgba(57, 137, 252, 0.9)" 
                stroke="rgba(42, 109, 176, 1)" stroke-width="2"/>
            <rect x="24" y="34" width="8" height="8" 
                fill="rgba(211, 227, 252, 0.9)"/>
            <rect x="38" y="34" width="8" height="8" 
                fill="rgba(211, 227, 252, 0.9)"/>
            <rect x="31" y="42" width="6" height="10" 
                fill="rgba(153, 204, 255, 1)"/>
        </svg>`;

    const homeIcon = `data:image/svg+xml;charset=UTF-8, 
        <svg width="60" height="60" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <path d="M32 6L4 28h8v24h16V40h8v12h16V28h8L32 6z" 
                fill="rgba(255, 209, 92, 0.9)" 
                stroke="rgba(65, 90, 107, 1)" 
                stroke-width="3"
                stroke-linecap="round" 
                stroke-linejoin="round"/>
                
            <rect x="24" y="34" width="8" height="8" 
                rx="2" ry="2" 
                fill="rgba(138, 215, 248, 1)"/>
                
            <rect x="38" y="34" width="8" height="8" 
                rx="2" ry="2" 
                fill="rgba(138, 215, 248, 1)"/>
                
            <rect x="31" y="42" width="6" height="10" 
                rx="2" ry="2" 
                fill="rgba(65, 90, 107, 1)"/>
        </svg>`;
    
    
    const schoolIcon = `data:image/svg+xml;charset=UTF-8, 
        <svg width="60" height="60" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 28h48v24H8z" 
                  fill="rgba(255, 193, 7, 0.9)" 
                  stroke="rgba(196, 160, 6, 1)" stroke-width="2"/>
            <path d="M16 28V16l16-10 16 10v12" 
                  fill="rgba(240, 240, 240, 1)" 
                  stroke="rgba(42, 109, 176, 1)" stroke-width="2"/>
            <rect x="22" y="34" width="8" height="8" 
                  fill="rgba(57, 137, 252, 0.9)"/>
            <rect x="34" y="34" width="8" height="8" 
                  fill="rgba(57, 137, 252, 0.9)"/>
            <rect x="28" y="42" width="8" height="10" 
                  fill="rgba(255, 102, 102, 1)"/>
        </svg>`;

    return (
        <div className='white_card-section-container'>
            <div className='tracking_driver_box'>
                <div className='tracking_driver_sidebar'>
                    <div className='tracking_driver_header_select'>
                        <select onChange={setDriverNameChange} value={driverName}>
                            <option value=''>السائق</option>
                                {drivers.map(driver => (
                                    <option key={driver.id} value={driver.id}>
                                        {driver.driver_full_name} {driver.driver_family_name}
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div className='tracking_driver_header_lines_info'>
                       {selectedDriver && (
                        <div>
                            {activeLines.length > 0 ? (
                                activeLines.map((line, index) => (
                                    <div 
                                        key={index} 
                                        className={`tracking_driver_line_data ${selectedLine?.lineName === line.lineName ? 'active_line' : ''}`}
                                        onClick={() => handleLineSelect(line)}
                                    >
                                        <p style={{fontSize:'15px'}}>
                                            {line.lineName} - {line.startTime || 'غير متوفر'} 
                                        </p>
                                    </div>                                   
                                ))
                            ) : (
                                <p>لا يوجد خطوط نشطة اليوم</p>
                            )}
                        </div>
                       )}
                    </div>
                </div>
                <div className='tracking_driver_main'>
                    <div className='tracking_driver_main_header'>
                       {selectedDriver && selectedLine && (
                        <div className='tracking_driver_main_header_status_container'>
                            <div className='tracking_driver_main_header_status'>
                                <p style={{fontSize:'15px'}}>{getDriverStatus()}</p>                           
                            </div>
                            <div className="tracking_driver_main_header_select">
                                <select onChange={handleRiderSelect}>
                                    <option value="">الركاب: {selectedLine?.riders?.length || 0}</option>
                                    {selectedLine?.riders?.map((rider) => (
                                        <option key={rider.id} value={rider.id}>
                                            {rider.name} {rider.family_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {selectedRider && (
                                <div className='tracking_driver_main_header_status'>
                                    <p style={{fontSize:'15px'}}>
                                        {riderStatusArabic[getRiderStatus()]}
                                    </p>  
                                </div>
                            )}                    
                        </div>
                       )}
                    </div>
                    <div className='tracking_driver_main_box'>
                        {!selectedDriver ? (
                            <div className='tracking_driver_main_no_lines'>
                                <p>حدد السائق</p>
                            </div>
                        ) : (
                            <div className='tracking_driver_main_map'>
                                <GoogleMap
                                    mapContainerStyle={{ width: "100%", height: "100%" }}
                                    center={driverLocation || {
                                        lat: selectedDriver.driver_home_location.coords.latitude,
                                        lng: selectedDriver.driver_home_location.coords.longitude
                                    }}
                                    zoom={14}
                                    onLoad={handleMapLoad}
                                >

                                    {/* Driver Marker */}
                                    {driverLocation && (
                                        <Marker
                                            position={driverLocation}
                                            icon={{
                                                url: driverIcon,
                                                scaledSize: new window.google.maps.Size(55, 55)
                                            }}
                                        />
                                    )}
                                    {/* Student Markers */}
                                    {selectedRider ? (                                    
                                        (() => {                                            
                                            const status = getRiderStatus();                                                                                
                                            if(status === 'home' || status === 'to home') {
                                                return (
                                                    <Marker
                                                        key={selectedRider.id}
                                                        position={{
                                                            lat: selectedRider.home_location.latitude,
                                                            lng: selectedRider.home_location.longitude
                                                        }}
                                                        icon={{
                                                            url: homeIcon,
                                                            scaledSize: new window.google.maps.Size(35, 35)
                                                        }}
                                                    />
                                                )
                                            } else if(status === 'school' || status === 'to school') {
                                                return (
                                                    <Marker
                                                        key={selectedRider.id}
                                                        position={{
                                                            lat: selectedRider.home_location.latitude,
                                                            lng: selectedRider.home_location.longitude
                                                        }}
                                                        icon={{
                                                            url: schoolIcon,
                                                            scaledSize: new window.google.maps.Size(35, 35)
                                                        }}
                                                    />
                                                )
                                            }
                                        })()
                                    ) : (
                                        selectedLine?.riders?.map((rider, index) => {
                                            return (
                                                <Marker
                                                    key={index}
                                                    position={{
                                                        lat: rider.home_location.latitude,
                                                        lng: rider.home_location.longitude
                                                    }}
                                                    icon={{
                                                        url: homeIcon,
                                                        scaledSize: new window.google.maps.Size(35, 35)
                                                    }}
                                                />
                                            );
                                        })
                                    )}
                                </GoogleMap>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TrackingMap