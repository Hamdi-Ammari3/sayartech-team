import React,{useState} from 'react'
import { useGlobalState } from '../../globalState'
import { BsArrowLeftShort } from "react-icons/bs"
import { doc,updateDoc } from 'firebase/firestore'
import { DB } from '../../firebaseConfig'
import styles from './emails.module.css'

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
          <button className="info-details-back-button" onClick={closeEmail}>
            <BsArrowLeftShort size={24}/>
          </button>
          <div className={styles.email_content}>
            <div className={styles.email_content_header}>
              <h5>{selectedEmail.sender}</h5>
              <p>{new Date(selectedEmail.date.seconds * 1000).toLocaleString()}</p>
            </div>
            <div className={styles.email_content_main}>
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

/*
import React,{useState,useEffect} from 'react'
import { DB } from '../firebaseConfig'
import { collection, addDoc,serverTimestamp } from 'firebase/firestore'
import { BsSend } from "react-icons/bs";

function Email() {
  const [emailText,setEmailText] = useState('')
  const [todayDate, setTodayDate] = useState('')
  const [loading, setLoading] = useState(false);

      // Get the current date and time as request_send_date
      const emailSendDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

  const handleSend = async () => {
    setLoading(true);
    if (emailText.trim() !== '') {
      try {
        await addDoc(collection(DB, 'emails'), {
          sender: 'مدرسة نبع الحياة', // You can dynamically set this
          receiver: 'SayarTech Admin',
          messageBody: emailText,
          date: new Date(),
          seen: false
        });
        setEmailText(''); // Reset the message after sending
        alert('تم الارسال بنجاح');
      } catch (error) {
        alert('حدث خطا ما الرجاء المحاولة مرة ثانية');
      }finally{
        setLoading(false)
      }
    }
  };
  
  return (
    <div className='white_card-section-container'>
      <div className='email-headline'>
        <div className='sender-receiver-text'>
          <h5>بلاغ من مدرسة النخيل الاهليةالى شركة سيارتك</h5>
        </div>
      </div>
      <div className='email-main'>
        <textarea
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
          placeholder='اكتب رسالتك هنا'
        />
        <button onClick={handleSend} className='send_request_button'>
          <h5>{loading ? 'جاري الارسال' : 'ارسال'}</h5>
          <BsSend className='email_send_icon' />
        </button>
      </div>
    </div>
  )
}
*/