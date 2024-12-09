import React,{useState} from 'react'
import { useGlobalState } from '../globalState'
import { BsArrowLeftShort } from "react-icons/bs"
import { doc,updateDoc } from 'firebase/firestore'
import { DB } from '../firebaseConfig'

const PrivateCarRequest = () => {

  const [selectedDemande, setSelectedDemande] = useState(null);
  const {privateCarRequests} = useGlobalState()

    // Convert Firestore Timestamp to JavaScript Date object
    const formatDate = (timestamp) => {
      const date = new Date(timestamp.seconds * 1000); 
      return new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: 'short', // Abbreviated month
        year: 'numeric',
      }).format(date);
    };

  // Read the E-mail
  const openRequest = async (request) => {
    setSelectedDemande(request);
    if (!request.seen) {
      try {
        const requestRef = doc(DB, 'carRequest', request.id);
        await updateDoc(requestRef, { seen: true });
      } catch (error) {
        console.error('Error updating email seen status:', error);
      }
    }
  };

  // Handle back action
  const closeEmail = () => {
    setSelectedDemande(null);
  };
  
  return(
    <div className='white_card-section-container'>
      {selectedDemande ? (
        <>
          <div className="item-detailed-data-container">
            <div className='email-detailed-data-header'>
              <div className='email-header-btn'>
                <button className="email-detailed-data-header-button" onClick={closeEmail}>
                  <BsArrowLeftShort size={24} className="email-back-button-icon"  />
                </button>
              </div>
              <div className="request-car-content-header">
                <h5>{selectedDemande.sender}</h5>
              </div>
            </div>
            <div className="email-content-main">
              <div className="request-car-content-main">
                <div>
                  <p>عدد الحضور</p>
                  <p>{selectedDemande.numberOfPersons}</p>
                </div>
                <div>
                  <p className="request-car-content-main-title">عدد السيارات</p>
                  <p className="request-car-content-main-answser">{selectedDemande.numberOfCars}</p>
                </div>
                <div>
                  <p>نوع السيارات</p>
                  <p>{selectedDemande.carType}</p>
                </div>
                <div>
                  <p>موعد الحضور</p>
                  <p>{new Date(selectedDemande.startTime.seconds * 1000).toLocaleString()}</p>
                </div>
                <div>
                  <p>موعد المغادرة</p>
                  <p>{new Date(selectedDemande.endTime.seconds * 1000).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className='all-items-list'>
          {privateCarRequests
            .slice()
            .sort((a, b) => b.request_send_date.seconds - a.request_send_date.seconds)
            .map((request,index) => (
              <div key={index} onClick={() => openRequest(request)} className='single-item'>
                <h5 className={!request.seen && 'not-seen'}>{request.sender}</h5>
                <h5 className={!request.seen && 'not-seen'}>{formatDate(request.request_send_date)}</h5>
              </div>
          ))}
        </div>
      )}
        
    </div>
  )
}

export default PrivateCarRequest