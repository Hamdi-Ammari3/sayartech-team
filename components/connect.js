import React,{useState} from 'react'
import ClipLoader from "react-spinners/ClipLoader"
import { useGlobalState } from '../globalState'
import { DB } from '../firebaseConfig'
import { writeBatch, doc,getDoc } from 'firebase/firestore'
import { GoogleMap,Marker,InfoWindow } from "@react-google-maps/api"
import { IoIosCloseCircleOutline } from "react-icons/io"

const Connect = () => {
    const { riders,drivers } = useGlobalState()
    
    const [driverName, setDriverName] = useState("")
    const [selectedDriver, setSelectedDriver] = useState(null)
    const [lineName, setLineName] = useState("")
    const [eligibleRiders,setEligibleRiders] = useState([])
    const [riderCount,setRiderCount] = useState(0)
    const [selectedRider,setSelectedRider] = useState(null)
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
        setEligibleRiders([])
        setRiderCount(0)
        setSelectedRider(null)
    };

    // Handle removing the selected driver
    const handleRemoveDriver = () => {
        setSelectedDriver(null)
        setSelectedRider(null)
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

    // Handle the search logic for eligible riders
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
  
        const eligibleRiders = riders.filter(
        (rider) =>
            !rider.driver_id && // Not assigned to a driver
            rider.destination_location?.latitude !== 0 && // latitude is not 0
            rider.destination_location?.longitude !== 0 && // longitude is not 0
            rider.destination === selectedLine.line_destination // Same destination as the line
        )
        .map((rider) => ({
            ...rider,
            distance: calculateDistance(
              selectedDriver.driver_home_location.coords.latitude,
              selectedDriver.driver_home_location.coords.longitude,
              rider.home_location.coords.latitude,
              rider.home_location.coords.longitude
            ),
          }))
          .sort((a, b) => a.distance - b.distance) // Sort by distance
          //.slice(0, 10); // Take the nearest 10 riders

        setEligibleRiders(eligibleRiders)
        setRiderCount(eligibleRiders.length)
        setMapLocked(true)
    };

    // Function to get days in the current month
    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const ensureAllMonthsExist = (obj, key) => {
        if (!obj[key]) {
            obj[key] = [];
        }
    };

    const calculateDaysBetween = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start) || isNaN(end)) return 0; // Ensure both dates are valid
    
        return (end - start) / (1000 * 60 * 60 * 24) + 1; // +1 to include both start and end dates
    };
    
    // Assign rider to driver
    const handleConnectRider = async () => {
        if (!selectedRider || !selectedDriver || !lineName) return

        const selectedLine = selectedDriver.line.find((li) => li.lineName === lineName)

        if (!selectedLine) {
            alert("حدد الخط");
            return;
        }

        setLoading(true)

        try {        
            const riderRef = doc(DB, "riders", selectedRider.id);
            const riderSnapshot = await getDoc(riderRef);

            if (!riderSnapshot.exists()) {
                alert("خطأ: لا يمكن العثور على بيانات الراكب.");
                return;
            }
    
            const riderData = riderSnapshot.data();

            // Check if the `bill` field exists
            if (!riderData.bill) {
                alert('يجب تحديد مبلغ الاشتراك الشهري قبل ربط الراكب مع سائق');
                return;
            }

            const driverRef = doc(DB, "drivers", selectedDriver.id);

            // Extract latitude and longitude from the nested home_location object
            const homeCoords = selectedRider.home_location?.coords || {};

            const riderInfo = {
                name: selectedRider.full_name || 'Unknown',
                family_name:selectedRider.family_name,
                rider_type:selectedRider.rider_type,
                birth_date:selectedRider.birth_date,
                checked_in_front_of_school: false,
                dropped_off: false,            
                home_address: selectedRider.home_address || '',
                home_location: {
                latitude: homeCoords.latitude || null,
                longitude: homeCoords.longitude || null,
                },
                id:selectedRider.id,            
                notification_token:selectedRider.user_notification_token,
                phone_number:selectedRider.phone_number,
                picked_from_school: false,
                picked_up: false,
                destination:selectedRider.destination,
                destination_location: {
                latitude: selectedRider.destination_location.latitude || null,
                longitude: selectedRider.destination_location.longitude || null,
                },
                state:selectedRider.state,
                city:selectedRider.city,
                street:selectedRider.street,
                tomorrow_trip_canceled: false,     
            };

            const batch = writeBatch(DB);

            // Update driver's line riders
            const updatedLine = {
                ...selectedLine,
                riders: [...selectedLine.riders, riderInfo],
            }

            batch.update(driverRef, {
                    line: selectedDriver.line.map((line) =>
                    line.lineName === lineName ? updatedLine : line
                ),
            })

            const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Baghdad" }));
            const year = today.getFullYear();
            const month = today.getMonth();
            const day = today.getDate(); // Local Iraqi date
            const startDate = today.toISOString().split("T")[0];

            const totalDays = getDaysInMonth(year, month);
            const remainingDays = totalDays - (day - 1);
            const monthlySub = selectedRider.driver_commission || 0;
            const dailyRate = monthlySub / 30;
            const proratedAmount = Math.round(dailyRate * remainingDays); 

            const bills = riderData.bill || {};
            const complementaryBill = riderData.complementary_bill || {};

            // Find existing bill for the current month
            const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

            // Handle case where the rider was previously assigned and removed in the same month
            if (bills[currentMonthKey] && bills[currentMonthKey].end_date) {
                ensureAllMonthsExist(complementaryBill, currentMonthKey);
                const oldStartDate = bills[currentMonthKey].start_date || `${year}-${String(month + 1).padStart(2, "0")}-01`;
                const oldEndDate = bills[currentMonthKey].end_date;
                const usedDays = calculateDaysBetween(oldStartDate, oldEndDate);
                const oldAmount = Math.round(dailyRate * usedDays);

                complementaryBill[currentMonthKey].push({
                    amount: oldAmount,
                    start_date: oldStartDate,
                    end_date: oldEndDate,
                });

                bills[currentMonthKey].start_date = startDate;
                bills[currentMonthKey].end_date = null;
                bills[currentMonthKey].driver_commission_amount = proratedAmount;

            } else {
                // Rider is being assigned for the first time in this month
                if (bills[currentMonthKey]) {
                    // If bill exists, update it (only if it was not set earlier)
                    if (!bills[currentMonthKey].start_date) {
                        bills[currentMonthKey].start_date = startDate;
                        bills[currentMonthKey].driver_commission_amount = proratedAmount;
                    }
                } else {
                    // If no bill exists for the month, create a new one
                    bills[currentMonthKey] = {
                        start_date: startDate,
                        end_date: null,
                        driver_commission_amount: proratedAmount,
                        paid: false,
                    };
                }
            }

            // Ensure all future months exist but do not modify past months
            for (let i = month; i < 12; i++) {
                const monthKey = `${year}-${String(i + 1).padStart(2, "0")}`;

                if (!bills[monthKey]) {
                    bills[monthKey] = {
                        start_date: i === month ? startDate : null,
                        end_date: null,
                        driver_commission_amount: i === month ? proratedAmount : 0,
                        paid: false,
                        active: true,
                    };
                } else {
                    bills[monthKey].active = true;
                }
            }

            // Update rider's driver_id
            batch.update(riderRef, {
                driver_id: selectedDriver.id,
                bill: bills,
                complementary_bill: complementaryBill,
            })

            await batch.commit();

            // Update local state
            setSelectedDriver((prevDriver) => ({
                ...prevDriver,
                line: prevDriver.line.map((line) =>
                    line.lineName === lineName ? updatedLine : line
                ),
            }));

            setEligibleRiders((prev) => {
                const updatedEligibleRiders = prev.filter(
                    (rider) => rider.id !== selectedRider.id
                );
                setRiderCount(updatedEligibleRiders.length)
                return updatedEligibleRiders
            });

            alert("تم ربط الطالب بالسائق بنجاح!");

        } catch (error) {
            console.log("Error connecting rider to driver:", error);
            alert("حدث خطأ أثناء التوصيل. يرجى المحاولة مرة أخرى.");
        } finally {
            setLoading(false)
            setSelectedRider(null);   
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
                        <h5>عدد الركاب: {riderCount}</h5>
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

                        {/* Riders Marker */}
                        {eligibleRiders.map((rider) => (
                            <Marker
                                key={rider.id}
                                position={{lat:rider.home_location.coords.latitude,lng:rider.home_location.coords.longitude}}
                                label={rider.name}
                                onClick={() => setSelectedRider(rider)}
                            >                           
                            </Marker>
                        ))}

                        {/* InfoWindow for Selected Rider */}
                        {selectedRider && (
                            <InfoWindow
                                position={{
                                    lat: selectedRider.home_location.coords.latitude,
                                    lng: selectedRider.home_location.coords.longitude,
                                }}
                                onCloseClick={() => setSelectedRider(null)}
                                options={{
                                    pixelOffset: new window.google.maps.Size(0, -30), // Adjust the Y-offset to move it above the marker
                                }}
                            >
                                <div className='popup-marker-info' style={{font:'none'}}>
                                    <p style={{marginBottom: '10px'}}>
                                        {selectedRider.full_name} {" "}
                                        {selectedRider.family_name}
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
                                        <button onClick={() => handleConnectRider(selectedRider.id)}>ربط</button>  
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