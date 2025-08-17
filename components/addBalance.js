import React,{useState} from 'react'
import { DB } from '../firebaseConfig'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import ClipLoader from "react-spinners/ClipLoader"

const AddBalance = () => {
    const [searchId, setSearchId] = useState('')
    const [userData, setUserData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [amountToAdd, setAmountToAdd] = useState('')
    const [addingAmountLoading,setAddingAmountLoading] = useState(false)

    const handleSearch = async() => {
        setError('')
        setLoading(true)
        setUserData(null)

        try {
            const userRef = doc(DB, 'users', searchId.trim())
            const snapshot = await getDoc(userRef)

            if (snapshot.exists()) {
                setUserData({ id: snapshot.id, ...snapshot.data() })
            } else {
                setError('المستخدم غير موجود')
            }
        } catch (err) {
            console.error(err)
            setError('حدث خطأ أثناء البحث')
        } finally {
            setLoading(false)
        }
    }

    const handleAddBalance = async () => {
        if (!amountToAdd || isNaN(amountToAdd)) {
            alert('يرجى إدخال مبلغ صالح')
            return
        }

        const newAmount = parseFloat(amountToAdd)
        const currentBalance = parseFloat(userData.account_balance || 0)
        const updatedBalance = currentBalance + newAmount

        try {
            setAddingAmountLoading(true)
            const userRef = doc(DB, 'users', userData.id)
            await updateDoc(userRef, {
                account_balance: updatedBalance
            })
            alert('تم تحديث الرصيد بنجاح')
            setUserData({ ...userData, account_balance: updatedBalance })
            setAmountToAdd('')
        } catch (err) {
            console.error(err)
            alert('حدث خطأ أثناء تحديث الرصيد')
        } finally {
            setAddingAmountLoading(false)
            setAmountToAdd('')
        }
    }

    // format balance amount
    const formatBalanceAmount = (amount) => {
        return amount?.toLocaleString('ar-IQ', {
        style: 'currency',
        currency: 'IQD',
        minimumFractionDigits: 0,
        })
    }

    return (
        <div className='white_card-section-container'>
            <div className="user_balance_header">
                <div className="filter-item">
                    <input
                        type="text"
                        placeholder="رمز المستخدم"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                    />
                    <button onClick={handleSearch}>ابحث</button>
                </div>
            </div>
            <div className="user_balance_main">
                {loading && <p>جاري البحث...</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}

                {userData && (
                    <div className="user_balance_main_user_info">
                        <div>
                            <h5 style={{fontWeight:'normal'}}>الاسم</h5>
                            <h5>{userData.user_full_name} {userData.user_family_name}</h5>
                        </div>
                        <div>
                            <h5 style={{fontWeight:'normal'}}>رقم الهاتف</h5>
                            <h5>{userData.phone_number}</h5>
                        </div>
                        <div>
                            <h5 style={{fontWeight:'normal'}}>الرصيد الحالي</h5>
                            <h5>{formatBalanceAmount(userData.account_balance ?? 0)}</h5>
                        </div>
                        <div className="filter-item" style={{marginTop: '20px' }}>
                            <input
                                type="number"
                                placeholder="المبلغ"
                                value={amountToAdd}
                                onChange={(e) => setAmountToAdd(e.target.value)}
                            />
                            {addingAmountLoading ? (
                                <div style={{ width:'120px',height:'30px',backgroundColor:'#955BFE',borderRadius:'7px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                    <ClipLoader
                                        color={'#fff'}
                                        loading={addingAmountLoading}
                                        size={10}
                                        aria-label="Loading Spinner"
                                        data-testid="loader"
                                    />
                                </div>
                            ) : (
                                <button 
                                    style={{width:'120px'}} 
                                    onClick={handleAddBalance}
                                >
                                    إضافة الرصيد
                                </button>
                            )}
                            
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default AddBalance