import React,{useState} from 'react'
import { useGlobalState } from '../globalState'
import { BsArrowLeftShort } from "react-icons/bs"
import { doc,updateDoc } from 'firebase/firestore'
import { DB } from '../firebaseConfig'

const Email = () => {
  const [selectedEmail, setSelectedEmail] = useState(null);
  const {emails} = useGlobalState()

  // Convert Firestore Timestamp to JavaScript Date object
  const formatDate = (timestamp) => {
    const date = new Date(timestamp.seconds * 1000); 
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short', // Abbreviated month
      year: 'numeric',
    }).format(date);
  };

  // Open the E-mail
  const openEmail = async (email) => {
    setSelectedEmail(email);
    if (!email.seen) {
      try {
        const emailRef = doc(DB, 'emails', email.id);
        await updateDoc(emailRef, { seen: true });
      } catch (error) {
        console.error('Error updating email seen status:', error);
      }
    }
  };

  // Handle back action
  const closeEmail = () => {
    setSelectedEmail(null);
  };
  
  return (
    <div className='white_card-section-container'>
      {selectedEmail ? (
        <>
          <div className="item-detailed-data-container">
            <div className='email-detailed-data-header'>
              <div className='email-header-btn'>
                <button className="email-detailed-data-header-button" onClick={closeEmail}>
                  <BsArrowLeftShort size={24}/>
                </button>
              </div>
              <div className='email-header-sender'>
                <h5>{selectedEmail.sender}</h5>
              </div>
              <div className='email-header-date'>
                <p>{new Date(selectedEmail.date.seconds * 1000).toLocaleString()}</p>
              </div>
            </div>
            <div className='email-content-main'>
              <p>{selectedEmail.messageBody}</p>
            </div>  
          </div>
        </>
      ) : (
        <div className='all-items-list'>
          {emails.map((email,index) => (
            <div onClick={() => openEmail(email)} key={index} className='single-item'>
                <h5 className={!email.seen && 'not-seen'}>{email.sender}</h5>
                <h5 style={{width:'300px'}} className={!email.seen && 'not-seen'}>
                  {email.messageBody.length > 50 ? `${email.messageBody.slice(0, 50)}...` : email.messageBody}
                </h5>
                <h5 className={!email.seen && 'not-seen'}>{formatDate(email.date)}</h5>             
            </div>
          ))}
        </div>
      )}
      
    </div>
  )
}

export default Email