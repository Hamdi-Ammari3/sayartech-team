import React,{useState} from 'react'
import { useGlobalState } from '../globalState'
import { BsArrowLeftShort } from "react-icons/bs"
import { MdCheckCircle } from "react-icons/md"

const IntercityTrips = () => {
    const { intercityTrips } = useGlobalState()

    const [selectedTrip,setSelectedTrip] = useState(null)
    const [startPointFilter,setStartPointFilter] = useState('')
    const [endPointFilter,setEndPointFilter] = useState('')
    const [tripDateFilter,setTripDateFilter] = useState('')
    const [tripStatusFilter,setTripStatusFilter] = useState('')

    const formatDate = (timestamp) => {
        if (!timestamp?.toDate) return '';

        const date = timestamp.toDate();
        const formattedDate = date.toLocaleDateString('ar-TN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        const formattedTime = date.toLocaleTimeString('ar-TN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });

        return `${formattedDate} — ${formattedTime}`;
    }

    //Get trip status helper
    const getTripStatus = (trip) => {
        if (!trip.started) return 'لم تبدأ';

        const allPicked = trip.riders.every((rider) => rider.picked);
        return allPicked ? 'انتهت' : 'بدأت';
    };


    // Filtered lines based on search term
    const filteredTrips = intercityTrips.filter((trip) => {
        const status = getTripStatus(trip);

        //filter by trip start point
        const matchesStartPoint = startPointFilter === '' || trip.start_point.includes(startPointFilter)

        //filter by trip end point
        const matchesEndPoint = endPointFilter === '' || trip.destination_address.includes(endPointFilter)

        //filter by trip date
        const matchesDate = tripDateFilter === '' || formatDate(trip.start_datetime) === tripDateFilter;
        
        //filter by trip status
        const matchesStatus = tripStatusFilter === '' || tripStatusFilter === status;

        return matchesStartPoint && matchesEndPoint && matchesDate && matchesStatus
    })
    .sort((a, b) => {
        const dateA = a.start_datetime?.toDate?.();
        const dateB = b.start_datetime?.toDate?.();

        if (!dateA || !dateB) return 0;

        return dateB - dateA;
    });

    //handle start point change
    const handleStartPointChange = (e) => {
        setStartPointFilter(e.target.value)
    }

    //handle end point change
    const handleEndPointChange = (e) => {
        setEndPointFilter(e.target.value)
    }

    //handle date change
    const handleDateChange = (e) => {
        setTripDateFilter(e.target.value)
    }

    //handle status change
    const handleTripStatusChange = (e) => {
        setTripStatusFilter(e.target.value)
    }

    // Handle back action
    const goBack = () => {
        setSelectedTrip(null)
    }

    // format trip amount
    const formatTripAmount = (amount) => {
        return amount?.toLocaleString('ar-IQ', {
        style: 'currency',
        currency: 'IQD',
        minimumFractionDigits: 0,
        })
    }

    const renderTripTitles = () => (
        <div className='students-section-inner-titles'>
            <div className='students-section-inner-title'>
                <input 
                    onChange={handleStartPointChange} 
                    value={startPointFilter}
                    placeholder='نقطة الانطلاق' 
                    type='text' 
                    className='students-section-inner-title_search_input'
                />
            </div>
            <div className='students-section-inner-title'>
                <input 
                    onChange={handleEndPointChange} 
                    value={endPointFilter}
                    placeholder='نقطة الوصول' 
                    type='text' 
                    className='students-section-inner-title_search_input'
                />
            </div>
            <div className='students-section-inner-title'>
                <input 
                    onChange={handleDateChange} 
                    value={tripDateFilter}
                    //placeholder='تاريخ الرحلة' 
                    type='date' 
                    className='students-section-inner-title_search_input'
                    style={{width:'120px',marginRight:'5px'}}
                />
                <label style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>تاريخ الرحلة</label>
            </div>
            <div className='students-section-inner-title' style={{width:'200px'}}>
                <select value={tripStatusFilter} onChange={handleTripStatusChange}>
                    <option value=''>حالة الرحلة</option>
                    <option value='بدأت'>بدأت</option>
                    <option value='لم تبدأ'>لم تبدأ</option>
                    <option value='انتهت'>انتهت</option>
                </select>
            </div>
        </div>
    )

    return (
        <div className='white_card-section-container'>
            {!selectedTrip ? (
                <div className='students-section-inner'>
                    {renderTripTitles()}
                    <div className='all-items-list'>
                        {filteredTrips.map((trip,index) => (
                            <div key={index} onClick={() => setSelectedTrip(trip)} className='single-item'>
                                <div>
                                    <h5>{trip.start_point}</h5>
                                </div>
                                <div>
                                    <h5>{trip.destination_address}</h5>
                                </div>
                                <div>
                                    <h5>{formatDate(trip.start_datetime)}</h5>
                                </div>
                                <div style={{ width: '200px' }}>
                                    <h5
                                        className={
                                        getTripStatus(trip) === 'بدأت' ? 'trip-started' :
                                        getTripStatus(trip) === 'انتهت' ? 'student-has-driver' :
                                        'student-without-driver'
                                        }
                                    >
                                        {getTripStatus(trip)}
                                    </h5>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="item-detailed-data-container">
                    <div className='item-detailed-data-header'>
                        <div className='item-detailed-data-header-title' style={{gap:'7px'}}>
                            <h5>{selectedTrip.id}</h5>
                        </div>
                        <button className="info-details-back-button" onClick={goBack}>
                            <BsArrowLeftShort size={24}/>
                        </button>
                    </div>
                    <div className="item-detailed-data-main">
                        <div className="student-detailed-data-main-firstBox">
                            <div>
                                <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>الانطلاق</h5>
                                <h5>{selectedTrip.start_point}</h5>
                            </div>
                            <div>
                                <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>الوصول</h5>
                                <h5>{selectedTrip.destination_address}</h5>
                            </div>
                            <div>
                                <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>موعد الرحلة</h5>
                                <h5>{formatDate(selectedTrip.start_datetime)}</h5>
                            </div>
                            <div>
                                <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>ثمن المقعد</h5>
                                <h5>{formatTripAmount(selectedTrip.seat_price)}</h5>
                            </div>
                            <div>
                                {selectedTrip.driver_id ? (
                                    <div style={{display:'flex',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:'10px'}}>
                                        <h5 style={{marginLeft:'10px',fontWeight:'bold'}}>السائق</h5>
                                        <h5>{selectedTrip.driver_name}</h5>
                                        <h5>{selectedTrip.driver_id}</h5>
                                    </div>
                                ) : (
                                    <h5>لا يوجد سائق</h5>
                                )}
                            </div>
                        </div>
                        <div className="item-detailed-data-main-second-box">
                            <h5 style={{fontWeight:'bold',marginBottom:'10px'}}>الركاب</h5>                      
                            <div className="item-detailed-data-main-firstBox-line-students">
                                <div className= "line-student-dropdown-open">
                                    {selectedTrip?.riders?.length ? (
                                        <>
                                            {selectedTrip.riders.map((rider) => (
                                                <div key={rider.id} className='trip-dropdown-item'>
                                                    <h5>{rider.name}</h5>
                                                    <h5>-</h5>
                                                    <h5>{rider.seats_booked}</h5>
                                                    <h5>مقاعد</h5>
                                                    <h5>-</h5>
                                                    <h5>{rider.phone}</h5>
                                                    <h5>-</h5>
                                                    <h5>{rider.id}</h5>
                                                    {rider.picked && (
                                                        <MdCheckCircle size={22} color='green'/>  
                                                    )}                                                              
                                                </div>                               
                                            ))}
                                        </>
                                    ) : (
                                        <h5 className="no-students">لا يوجد طلاب في هذه الرحلة</h5>   
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

export default IntercityTrips