import React,{useState} from 'react'
import ClipLoader from "react-spinners/ClipLoader"
import { useGlobalState } from '../globalState'
import { DB } from '../firebaseConfig'
import { writeBatch, doc } from 'firebase/firestore'
import { GoogleMap,Marker,InfoWindow } from "@react-google-maps/api"
import { IoIosCloseCircleOutline } from "react-icons/io"

const Connect = () => {
    const { students,drivers } = useGlobalState()
    const [driverName, setDriverName] = useState("")
    const [selectedDriver, setSelectedDriver] = useState(null)
    const [lineName, setLineName] = useState("")
    const [eligibleStudents, setEligibleStudents] = useState([])
    const [studentCount, setStudentCount] = useState(0)
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [loading,setLoading] = useState(false)
    const [mapLocked, setMapLocked] = useState(false)

    const filteredDrivers = drivers.filter((driver) => {
        const fullName = `${driver.driver_full_name} ${driver.driver_family_name}`
        return fullName.includes(driverName);
    });

    // Handle driver selection
    const handleDriverSelect = (driver) => {
        setSelectedDriver(driver)
        setDriverName('')
        setLineName("")
        setEligibleStudents([])
        setStudentCount(0)
        setSelectedStudent(null)
    };

    // Handle removing the selected driver
    const handleRemoveDriver = () => {
        setSelectedDriver(null)
        setSelectedStudent(null)
    };

    // Haversine formula to calculate distance between two coordinates
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Radius of the Earth in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
    };

    // Handle the search logic for eligible students
    const handleSearch = () => {
        if (!selectedDriver || !lineName) {
            alert("الرجاء ادخال المعلومات اللازمة للبحث");
            return;
        }
  
        const selectedLine = selectedDriver.line.find((li) => li.lineName === lineName);
  
        if (!selectedLine) {
            alert("حدد الخط");
            return;
        }
  
        const eligibleStudents = students.filter(
        (student) =>
            !student.driver_id && // Not assigned to a driver
            student.student_school === selectedLine.lineSchool // Same school as the line
        )
        .map((student) => ({
            ...student,
            distance: calculateDistance(
              selectedDriver.driver_home_location.coords.latitude,
              selectedDriver.driver_home_location.coords.longitude,
              student.student_home_location.coords.latitude,
              student.student_home_location.coords.longitude
            ),
          }))
          .sort((a, b) => a.distance - b.distance) // Sort by distance
          //.slice(0, 10); // Take the nearest 10 students

        setEligibleStudents(eligibleStudents)
        setStudentCount(eligibleStudents.length)
        setMapLocked(true)
    };

    // Assign student to driver
    const handleConnectStudent = async () => {
        if (!selectedStudent || !selectedDriver || !lineName) return;

        const selectedLine = selectedDriver.line.find(
            (li) => li.lineName === lineName
        );

        if (!selectedLine) {
            alert("حدد الخط");
            return;
        }

        setLoading(true)

        try {
            const driverRef = doc(DB, "drivers", selectedDriver.id);
            const studentRef = doc(DB, "students", selectedStudent.id);

            // Extract latitude and longitude from the nested home_location object
            const homeCoords = selectedStudent.student_home_location?.coords || {};

            const studentInfo = {
                birth_date:selectedStudent.student_birth_date,
                checked_in_front_of_school: false,
                dropped_off: false,
                family_name:selectedStudent.student_family_name,
                home_address: selectedStudent.student_home_address || '',
                home_location: {
                latitude: homeCoords.latitude || null,
                longitude: homeCoords.longitude || null,
                },
                id:selectedStudent.id,
                name: selectedStudent.student_full_name || 'Unknown',
                notification_token:selectedStudent.student_user_notification_token,
                phone_number:selectedStudent.student_phone_number,
                picked_from_school: false,
                picked_up: false,
                school_location: {
                latitude: selectedStudent.student_school_location.latitude || null,
                longitude: selectedStudent.student_school_location.longitude || null,
                },
                school_name:selectedStudent.student_school,
                student_state:selectedStudent.student_state,
                student_street:selectedStudent.student_street,
                tomorrow_trip_canceled: false,
                monthly_sub:selectedStudent.monthly_sub
            };

            const batch = writeBatch(DB);

            // Update driver's line students
            const updatedLine = {
                ...selectedLine,
                students: [...selectedLine.students, studentInfo],
            };

            batch.update(driverRef, {
                line: selectedDriver.line.map((line) =>
                line.lineName === lineName ? updatedLine : line
                ),
            });

            // Update student's driver_id
            batch.update(studentRef, {
                driver_id: selectedDriver.id,
            });

            await batch.commit();

            // Update local state
            setSelectedDriver((prevDriver) => ({
                ...prevDriver,
                line: prevDriver.line.map((line) =>
                    line.lineName === lineName ? updatedLine : line
                ),
            }));

            setEligibleStudents((prev) => {
                const updatedEligibleStudents = prev.filter(
                    (student) => student.id !== selectedStudent.id
                );
                setStudentCount(updatedEligibleStudents.length); // Update the counter
                return updatedEligibleStudents; // Return the filtered students
            });

            alert("تم ربط الطالب بالسائق بنجاح!");

        } catch (error) {
            console.error("Error connecting student to driver:", error.message);
            alert("حدث خطأ أثناء التوصيل. يرجى المحاولة مرة أخرى.");
        } finally {
            setLoading(false)
            setSelectedStudent(null);   
        }
    };
  
  return (
    <div className='white_card-section-container'>
        <div className='connect-student-driver-container'>
            <div className='connect-student-driver-header'>
                <div className="filter-item">
                    {selectedDriver ? (
                        <div className="selected-tag">
                            <h5>{`${selectedDriver.driver_full_name} ${selectedDriver.driver_family_name}`}</h5>
                            <button className="selected-driver-close-icon" onClick={handleRemoveDriver}>
                                <IoIosCloseCircleOutline size={20} />
                            </button>
                        </div>
                    ) : (
                        <input
                            type="text"
                            id="driver-name"
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            placeholder="اسم السائق"
                        />
                    )}
                    
                    {!selectedDriver && driverName && filteredDrivers.length > 0 && (
                        <ul className="autocomplete-suggestions">
                            {filteredDrivers.map((driver) => (
                            <li
                                key={driver.id}
                                onClick={() => handleDriverSelect(driver)}
                                className="autocomplete-item"
                            >
                                {`${driver.driver_full_name} ${driver.driver_family_name}`}
                            </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Line Name Filter */}
                <div className="filter-item">
                    <select
                        id="line-name"
                        value={lineName}
                        onChange={(e) => setLineName(e.target.value)}
                        disabled={!selectedDriver}
                    >
                        <option value="">الخط</option>
                        {selectedDriver?.line.map((li, idx) => (
                            <option key={idx} value={li.lineName}>
                                {li.lineName}
                            </option>
                        ))}
                    </select>                  
                </div>

                <div className="filter-item">
                    <button onClick={handleSearch}>ابحث</button>
                </div>

                {/* Counter Display */}
                {selectedDriver && lineName && (
                    <div className="selected-tag" style={{marginRight:'10px'}}>
                        <h5>عدد الطلاب: {studentCount}</h5>
                    </div>
                )}
                
            </div>

            <div className='connect-student-driver-main'>
                {selectedDriver ? (
                    <GoogleMap
                        mapContainerStyle={{ width: "100%", height: "100%" }}
                        center={
                            mapLocked ? 
                            null 
                            : {
                                lat:selectedDriver?.driver_home_location.coords.latitude,
                                lng:selectedDriver?.driver_home_location.coords.longitude
                            } 
                            || { lat: 33.3152, lng: 44.3661 }
                        }
                        zoom={12}
                    >

                        {/* Driver Marker */}
                        {selectedDriver && (
                            <Marker
                                position={{lat:selectedDriver?.driver_home_location.coords.latitude,lng:selectedDriver?.driver_home_location.coords.longitude}}
                                label="Driver"
                            />
                        )}

                        {/* Student Markers */}
                        {eligibleStudents.map((student) => (
                            <Marker
                                key={student.id}
                                position={{lat:student.student_home_location.coords.latitude,lng:student.student_home_location.coords.longitude}}
                                label={student.name}
                                onClick={() => setSelectedStudent(student)}
                            >                           
                            </Marker>
                        ))}

                        {/* InfoWindow for Selected Student */}
                        {selectedStudent && (
                            <InfoWindow
                                position={{
                                    lat: selectedStudent.student_home_location.coords.latitude,
                                    lng: selectedStudent.student_home_location.coords.longitude,
                                }}
                                onCloseClick={() => setSelectedStudent(null)}
                                options={{
                                    pixelOffset: new window.google.maps.Size(0, -30), // Adjust the Y-offset to move it above the marker
                                }}
                            >
                                <div className='popup-marker-info' style={{font:'none'}}>
                                    <p style={{marginBottom: '10px'}}>
                                        {selectedStudent.student_full_name} {" "}
                                        {selectedStudent.student_family_name}
                                    </p>
                                    {loading ? (
                                        <div style={{ width:'80px',height:'30px',backgroundColor:'#955BFE',borderRadius:'7px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                            <ClipLoader
                                                color={'#fff'}
                                                loading={loading}
                                                size={10}
                                                aria-label="Loading Spinner"
                                                data-testid="loader"
                                            />
                                        </div>
                                    ) : (
                                        <button onClick={() => handleConnectStudent(selectedStudent.id)}>ربط</button>  
                                    )}
                                                                  
                                </div>
                            </InfoWindow>
                        )}

                    </GoogleMap>
                ) : (
                    <div style={{width:'100%',textAlign:'center',marginTop:'50px'}}>
                        <p>ابدا البحث</p>
                    </div>                   
                )}               
            </div>          
        </div>
    </div>
  )
}

export default Connect